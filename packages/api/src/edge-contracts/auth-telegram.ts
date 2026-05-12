import { z } from 'zod';

/**
 * Contract for the `auth-telegram` Edge Function.
 *
 * Both sides — the Deno function and the browser client — parse with these
 * schemas. The function lives in `supabase/functions/auth-telegram/`; for now
 * it ships a hand-mirrored copy of these schemas (Supabase doesn't bundle
 * files outside the function dir, so a workspace import isn't possible). When
 * the schemas drift, the Vitest contract test in
 * `auth-telegram/_lib/__tests__/contract.test.ts` fails.
 *
 * See docs/architecture.md §5 (auth flow) and §9.2 (edge contracts).
 */

export const authTelegramRequestSchema = z.object({
  /**
   * Raw `Telegram.WebApp.initData` query string, e.g.
   * `query_id=AAH...&user=%7B%22id%22%3A...%7D&auth_date=1736000000&hash=abc...`.
   * NEVER store, log or send this anywhere — it carries the user's full
   * Telegram identity payload AND its HMAC, so leaking it = giving away a
   * 24h-valid signing key for that user.
   */
  initData: z.string().min(1).max(8192),
});

export type AuthTelegramRequest = z.infer<typeof authTelegramRequestSchema>;

/**
 * Magic-link payload the function returns. The browser then calls
 * `supabase.auth.verifyOtp({ token_hash, type: 'magiclink', email })` to
 * exchange it for a real Supabase session (with native refresh token).
 *
 * The plain-text token is NEVER returned, only the hashed form Supabase emits
 * — same security model as a clicked email link.
 */
export const authTelegramResponseSchema = z.object({
  tokenHash: z.string().min(1),
  email: z.email(),
  /** Whether the auth.user row was just created. UI can show a welcome screen. */
  isNewUser: z.boolean(),
});

export type AuthTelegramResponse = z.infer<typeof authTelegramResponseSchema>;

/**
 * Discriminated error shape the function returns with non-2xx status.
 * Listed reasons map 1:1 to actionable client behaviors.
 */
export const authTelegramErrorSchema = z.object({
  error: z.enum([
    'invalid_init_data', // HMAC didn't match the secret
    'expired_init_data', // auth_date older than maxAgeSeconds
    'replayed_init_data', // we've already consumed this exact initData
    'malformed_request', // body / shape doesn't match request schema
    'internal_error', // anything else; bug or upstream outage
  ]),
  /** Optional one-line human description, never PII. */
  message: z.string().optional(),
});

export type AuthTelegramError = z.infer<typeof authTelegramErrorSchema>;
