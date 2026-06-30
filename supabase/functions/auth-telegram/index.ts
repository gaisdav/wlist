/**
 * `auth-telegram` Edge Function.
 *
 * Exchanges a Telegram Mini App `initData` payload for a one-time
 * `verifyOtp` token the browser uses to obtain a real Supabase session
 * (with native refresh + auto-refresh).
 *
 * Flow per docs/architecture.md §5:
 *
 *   1. CORS preflight short-circuit.
 *   2. Parse + validate request body against `authTelegramRequestSchema`.
 *   3. HMAC-verify `initData` with `TG_BOT_TOKEN` (24h TTL).
 *   4. Anti-replay: insert sha256(initData) into
 *      `public.auth_telegram_used_init_data`. Conflict ⇒ replay ⇒ 401.
 *   5. Extract Telegram user. Identity is keyed on `telegram_id`; a synthetic
 *      non-routable email (`tg-<telegram_id>@wlist-tg.local`) is used only as
 *      the GoTrue identifier that `generateLink`/`verifyOtp` require — never
 *      as a lookup key, and never shown to the user.
 *   6. `auth.admin.createUser` if new (id comes straight from the response);
 *      otherwise resolve the id from `public.profiles` by `telegram_id`
 *      (UNIQUE, PK == auth.users.id).
 *   7. Upsert `public.profiles` with the latest Telegram-side fields.
 *   8. `auth.admin.generateLink({ type: 'magiclink', email })` →
 *      hand the resulting `token_hash` back to the client.
 *
 * The function uses the service-role key (it has to — `auth.admin.*`
 * requires it). Every DB write is bounded by an explicit policy in
 * the migration, so the service role doesn't get magic powers we wouldn't
 * grant a regular caller.
 */
import { createClient } from '@supabase/supabase-js';

import { handlePreflight, jsonResponse } from '../_shared/cors.ts';

import {
  authTelegramRequestSchema,
  type AuthTelegramErrorCode,
  type AuthTelegramResponse,
} from './_lib/contract.ts';
import { extractTelegramUser, sha256Hex } from './_lib/extractTelegramUser.ts';
import { resolveUserId, type ResolveUserIdPort } from './_lib/resolveUserId.ts';
import { verifyInitData } from './_lib/verifyInitData.ts';

// =============================================================================
// Env (validated once at cold-start; absence is a deploy-time bug, not runtime)
// =============================================================================

declare const Deno: { env: { get(key: string): string | undefined } };

const SUPABASE_URL = mustEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = mustEnv('SUPABASE_SERVICE_ROLE_KEY');
const TG_BOT_TOKEN = mustEnv('TG_BOT_TOKEN');

function mustEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`auth-telegram: missing required env ${key}`);
  return value;
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// =============================================================================
// Handler
// =============================================================================

const fail = (code: AuthTelegramErrorCode, status: number, message?: string): Response =>
  jsonResponse({ error: code, ...(message ? { message } : {}) }, { status });

/**
 * Adapter binding the service-role admin client to the `resolveUserId` port.
 * Keeps the resolution logic (and its tests) free of supabase-js/Deno types.
 */
const userIdPort: ResolveUserIdPort = {
  async createUser({ email, telegramId }) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { telegram_id: telegramId, login_source: 'telegram_mini_app' },
    });
    if (error) {
      // 'A user with this email address has already been registered' is the
      // only expected error path — anything else is fatal.
      const isAlreadyExists =
        error.code === 'email_exists' ||
        error.code === 'user_already_exists' ||
        error.message.includes('already');
      if (isAlreadyExists) return { ok: true, alreadyExists: true };
      console.error('auth-telegram: createUser failed', error);
      return { ok: false, error };
    }
    const id = data.user?.id;
    if (!id) return { ok: false, error: new Error('createUser returned no user') };
    return { ok: true, id };
  },

  async findProfileIdByTelegramId(telegramId) {
    const { data, error } = await admin
      .from('profiles')
      .select('id')
      .eq('telegram_id', telegramId)
      .maybeSingle();
    if (error) {
      console.error('auth-telegram: profile lookup failed', error);
      return { ok: false, error };
    }
    return { ok: true, id: data?.id ?? null };
  },
};

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return fail('malformed_request', 405, 'POST only');
  }

  // --- parse body ----------------------------------------------------------
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('malformed_request', 400, 'body must be valid JSON');
  }

  const reqParsed = authTelegramRequestSchema.safeParse(body);
  if (!reqParsed.success) {
    return fail('malformed_request', 400);
  }
  const { initData } = reqParsed.data;

  // --- verify HMAC + TTL ---------------------------------------------------
  const verification = await verifyInitData(initData, TG_BOT_TOKEN);
  if (!verification.ok) {
    if (verification.reason === 'expired') return fail('expired_init_data', 401);
    return fail('invalid_init_data', 401);
  }

  // --- anti-replay ---------------------------------------------------------
  const initDataHashHex = await sha256Hex(initData);
  const initDataHashBytes = `\\x${initDataHashHex}`; // bytea hex literal
  const replay = await admin
    .from('auth_telegram_used_init_data')
    .insert({ init_data_hash: initDataHashBytes })
    .select('init_data_hash')
    .maybeSingle();

  if (replay.error) {
    if (replay.error.code === '23505') {
      // unique_violation — same initData already consumed
      return fail('replayed_init_data', 401);
    }
    console.error('auth-telegram: anti-replay insert failed', replay.error);
    return fail('internal_error', 500);
  }

  // --- extract user --------------------------------------------------------
  const userResult = extractTelegramUser(verification.params);
  if (!userResult.ok) {
    return fail('invalid_init_data', 400, userResult.reason);
  }
  const tgUser = userResult.user;

  // --- ensure auth.users + profiles row ------------------------------------
  // Supabase Auth requires SOME stable identifier per user, and the only
  // admin-side way to mint a session (`generateLink` + client `verifyOtp`)
  // is email- or phone-based. We use a synthetic, non-routable `.local`
  // address purely as that GoTrue identifier — it is NEVER a lookup key and
  // the user never sees it. Identity is keyed on `telegram_id` everywhere.
  const email = `tg-${tgUser.id}@wlist-tg.local`;

  // Resolve the canonical user id authoritatively (see `resolveUserId`):
  // new users come straight from `createUser`, existing ones from
  // `profiles.telegram_id`. We never key off the email or page `listUsers`
  // on the happy path — that was the original RLS-mismatch bug.
  let resolved: Awaited<ReturnType<typeof resolveUserId>>;
  try {
    resolved = await resolveUserId(userIdPort, email, tgUser.id);
  } catch (e) {
    console.error('auth-telegram: resolveUserId threw', e);
    return fail('internal_error', 500);
  }
  if (!resolved.ok) {
    if (resolved.reason === 'not_found') {
      console.error('auth-telegram: user not found after create/lookup', {
        telegram_id: tgUser.id,
      });
    }
    return fail('internal_error', 500);
  }
  const { userId, isNewUser } = resolved;

  // Upsert profile (refresh Telegram-side fields on every login).
  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      telegram_id: tgUser.id,
      username: tgUser.username ?? null,
      first_name: tgUser.first_name,
      last_name: tgUser.last_name ?? null,
      photo_url: tgUser.photo_url ?? null,
      language_code: tgUser.language_code ?? null,
      is_premium: tgUser.is_premium ?? false,
    },
    { onConflict: 'id' },
  );
  if (profileError) {
    console.error('auth-telegram: profile upsert failed', profileError);
    return fail('internal_error', 500);
  }

  // --- mint magic-link token_hash ------------------------------------------
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkError || !linkData?.properties?.hashed_token) {
    console.error('auth-telegram: generateLink failed', linkError);
    return fail('internal_error', 500);
  }

  const response: AuthTelegramResponse = {
    tokenHash: linkData.properties.hashed_token,
    email,
    isNewUser,
  };
  return jsonResponse(response, { status: 200 });
});
