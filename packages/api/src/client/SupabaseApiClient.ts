// Concrete ApiClient implementation backed by supabase-js.
//
// Domain methods (auth, wishes, slots, …) are added incrementally — see the
// commented stubs in ApiClient.ts and plans 01–03.
//
// This class is the ONLY place in the codebase that calls `createClient(...)`
// outside of Edge Functions. Edge Functions get a separate client with the
// service-role key and never share state with the browser one.
import {
  createClient,
  type Session,
  type SupabaseClient,
  type Subscription,
} from '@supabase/supabase-js';

import {
  authTelegramErrorSchema,
  authTelegramResponseSchema,
} from '../edge-contracts/auth-telegram.js';
import { type Database } from '../generated/database.types.js';

import {
  type ApiClient,
  type AuthApi,
  type AuthSession,
  type ProfileRow,
  type ProfilesApi,
  type SignInWithTelegramResult,
} from './ApiClient.js';
import { SignInError } from './SignInError.js';

export type SupabaseClientLike = SupabaseClient<Database>;

export interface SupabaseApiClientOptions {
  /** `https://<ref>.supabase.co` (from `VITE_SUPABASE_URL`). */
  url: string;
  /** Publishable / anon key safe to bundle into the browser. */
  anonKey: string;
}

const sessionToAuth = (s: Session | null): AuthSession | null =>
  s ? { userId: s.user.id, expiresAt: s.expires_at ?? null } : null;

export class SupabaseApiClient implements ApiClient {
  /** Raw supabase-js client. Domain modules in plans 01–03 use it via this property. */
  readonly supabase: SupabaseClientLike;

  readonly auth: AuthApi;
  readonly profiles: ProfilesApi;

  constructor({ url, anonKey }: SupabaseApiClientOptions) {
    this.supabase = createClient<Database>(url, anonKey, {
      auth: {
        // The Mini App swaps Telegram initData for a Supabase session via
        // Edge Function (plan 01). We persist the resulting session in
        // localStorage so cold starts inside Telegram skip the round-trip.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: {
        headers: { 'x-wlist-client': 'tma' },
      },
    });

    this.auth = createAuthApi(this.supabase);
    this.profiles = createProfilesApi(this.supabase);
  }
}

// =============================================================================
// auth
// =============================================================================

const createAuthApi = (sb: SupabaseClientLike): AuthApi => ({
  async signInWithTelegram(initData) {
    // 1. Hand initData to the Edge Function. It validates HMAC, dedupes via
    //    the anti-replay table, upserts the profile, and returns a magic-link
    //    token_hash we can swap for a real session.
    let edgeResponse: Awaited<ReturnType<typeof sb.functions.invoke>>;
    try {
      edgeResponse = await sb.functions.invoke('auth-telegram', {
        body: { initData },
      });
    } catch (e) {
      throw new SignInError(
        'network',
        e instanceof Error ? e.message : 'Network error calling auth-telegram',
      );
    }

    if (edgeResponse.error || !edgeResponse.data) {
      // supabase-js wraps non-2xx Edge responses inside `error` AND keeps the
      // body in `error.context.text()` — we parse it back to our typed error
      // shape so callers can branch on `code`.
      const parsed = await parseEdgeError(edgeResponse.error);
      throw parsed;
    }

    const okBody = authTelegramResponseSchema.safeParse(edgeResponse.data);
    if (!okBody.success) {
      throw new SignInError(
        'internal_error',
        `auth-telegram returned an unexpected payload: ${okBody.error.message}`,
      );
    }
    const { tokenHash, email, isNewUser } = okBody.data;

    // 2. Swap the magic-link token_hash for a real Supabase session.
    //    Same internal call path as a clicked email link → we get refresh
    //    tokens, autoRefreshToken kicks in for the rest of the session.
    const { data: otpData, error: otpError } = await sb.auth.verifyOtp({
      type: 'magiclink',
      token_hash: tokenHash,
      email,
    });
    if (otpError || !otpData?.session) {
      throw new SignInError(
        'verify_otp_failed',
        otpError?.message ?? 'verifyOtp returned no session',
      );
    }

    return {
      session: sessionToAuth(otpData.session) as AuthSession, // never null here
      isNewUser,
    } satisfies SignInWithTelegramResult;
  },

  async getSession() {
    const { data } = await sb.auth.getSession();
    return sessionToAuth(data.session ?? null);
  },

  onAuthStateChange(callback) {
    const { data } = sb.auth.onAuthStateChange((_event, session) => {
      callback(sessionToAuth(session));
    });
    const subscription: Subscription = data.subscription;
    return { unsubscribe: () => subscription.unsubscribe() };
  },

  async signOut() {
    await sb.auth.signOut();
  },
});

// =============================================================================
// profiles
// =============================================================================

const createProfilesApi = (sb: SupabaseClientLike): ProfilesApi => ({
  async getCurrent() {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData?.user) return null;

    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (error) throw error;
    return (data as ProfileRow | null) ?? null;
  },
});

// =============================================================================
// helpers
// =============================================================================

/**
 * Best-effort: pull the JSON body out of supabase-js's `FunctionsHttpError`
 * and map it to our typed `SignInError`. Falls back to a generic
 * `internal_error` if the body isn't our documented shape (means Edge
 * platform itself responded — e.g. cold-start crash).
 */
const parseEdgeError = async (err: unknown): Promise<SignInError> => {
  if (!err) return new SignInError('internal_error', 'Unknown auth-telegram error');

  const message = err instanceof Error ? err.message : String(err);

  const ctx = (err as { context?: { json?: () => Promise<unknown> } }).context;
  if (ctx?.json) {
    try {
      const body = await ctx.json();
      const parsed = authTelegramErrorSchema.safeParse(body);
      if (parsed.success) {
        return new SignInError(parsed.data.error, parsed.data.message ?? message);
      }
    } catch {
      // fall through
    }
  }
  return new SignInError('internal_error', message);
};
