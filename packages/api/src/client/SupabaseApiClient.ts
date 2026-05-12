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

    this.auth = createAuthApi(this.supabase, url, anonKey);
    this.profiles = createProfilesApi(this.supabase);
  }
}

// =============================================================================
// auth
// =============================================================================

const createAuthApi = (sb: SupabaseClientLike, supabaseUrl: string, anonKey: string): AuthApi => ({
  async signInWithTelegram(initData) {
    // 1. Hand initData to the Edge Function via direct fetch.
    //
    //    We bypass `sb.functions.invoke` here because:
    //      - this call happens BEFORE the user has a session, so supabase-js's
    //        auto-injected `Authorization: Bearer <session_jwt>` header is
    //        either missing or stale and the Telegram WebView's CORS preflight
    //        chokes on the resulting request shape (observed empirically:
    //        Node + curl work, Telegram in-app browser throws TypeError);
    //      - direct fetch gives us pixel-precise control over headers + a
    //        readable Response on every code path, which makes diagnosing
    //        Edge runtime failures trivial.
    //    Once we have a session, every other DB call goes through supabase-js
    //    as normal.
    const url = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/auth-telegram`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        // Headers MUST be the bare minimum: every entry the browser doesn't
        // CORS-safelist forces a preflight check, and the Edge Function's
        // CORS allow list is finite. Sending any header that isn't in
        // supabase/functions/_shared/cors.ts → preflight rejected →
        // WebKit / WKWebView (Telegram iOS) throws "Load failed", Chrome
        // throws "Failed to fetch". Bit me once already — keep this lean.
        //
        // What's here:
        //   Content-Type: application/json — required so the function can
        //     `await req.json()`. Triggers preflight on its own; nothing
        //     to do about it short of reshaping the function to accept
        //     text/plain (not worth it).
        //   apikey: <publishable> — Supabase gateway's "this is anonymous
        //     traffic from a known project" identifier. Function itself
        //     authenticates via the HMAC inside initData
        //     (verify_jwt=false in supabase/config.toml).
        //
        // Notably absent: `Authorization` (no session yet) and
        // `x-wlist-client` (a diagnostic tag set in supabase-js's global
        // config — pointless for this single call, and not in the allow list).
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
        },
        body: JSON.stringify({ initData }),
      });
    } catch (e) {
      // CORS rejection / DNS / offline — `TypeError: Failed to fetch` (Chrome)
      // or similar. No response object available; fall through with the
      // platform's own message so it shows up in the splash for diagnostics.
      throw new SignInError(
        'network',
        e instanceof Error ? e.message : 'Network error calling auth-telegram',
      );
    }

    // 2. Parse the response body. We always try as JSON because both success
    //    and failure paths from our function are JSON; if the body isn't JSON
    //    that's an outage at the platform layer (Cloudflare HTML 502 page,
    //    Edge runtime cold-start crash) — surface the status + a snippet so
    //    we can see it in the user-facing splash.
    let body: unknown;
    let bodyText = '';
    try {
      bodyText = await response.text();
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      throw new SignInError(
        'internal_error',
        `auth-telegram returned non-JSON (HTTP ${response.status}): ${bodyText.slice(0, 200)}`,
      );
    }

    if (!response.ok) {
      const parsed = authTelegramErrorSchema.safeParse(body);
      if (parsed.success) {
        throw new SignInError(parsed.data.error, parsed.data.message ?? `HTTP ${response.status}`);
      }
      throw new SignInError(
        'internal_error',
        `auth-telegram returned HTTP ${response.status}: ${bodyText.slice(0, 200)}`,
      );
    }

    const okBody = authTelegramResponseSchema.safeParse(body);
    if (!okBody.success) {
      throw new SignInError(
        'internal_error',
        `auth-telegram returned an unexpected payload: ${okBody.error.message}`,
      );
    }
    const { tokenHash, email, isNewUser } = okBody.data;

    // 3. Swap the magic-link token_hash for a real Supabase session.
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
