import { type AuthTelegramError } from '../edge-contracts/auth-telegram.js';

/**
 * Error thrown by `signInWithTelegram` for any documented failure mode of the
 * `auth-telegram` Edge Function (or `verifyOtp` afterwards).
 *
 * Carries a discriminated `code` so UI can branch — most importantly:
 *   - `replayed_init_data` → tell user to close & reopen the Mini App
 *     (Telegram only emits a fresh initData on app restart)
 *   - `expired_init_data` → same advice; auth_date is past 24h
 *   - `invalid_init_data` → likely a bug or an attempted forgery; show
 *     generic error and log
 *   - `network` / `unknown` → retryable
 */
export type SignInErrorCode = AuthTelegramError['error'] | 'network' | 'verify_otp_failed';

export class SignInError extends Error {
  readonly code: SignInErrorCode;

  constructor(code: SignInErrorCode, message: string) {
    super(message);
    this.name = 'SignInError';
    this.code = code;
  }
}
