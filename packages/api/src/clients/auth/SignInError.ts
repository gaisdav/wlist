import { type AuthTelegramError } from '../../edge-contracts/auth-telegram.js';

export type SignInErrorCode = AuthTelegramError['error'] | 'network' | 'verify_otp_failed';

export class SignInError extends Error {
  readonly code: SignInErrorCode;

  constructor(code: SignInErrorCode, message: string) {
    super(message);
    this.name = 'SignInError';
    this.code = code;
  }
}
