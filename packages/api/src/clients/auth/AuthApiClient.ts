import type { Session } from '@supabase/supabase-js';

import {
  authTelegramErrorSchema,
  authTelegramResponseSchema,
} from '../../edge-contracts/auth-telegram.js';
import type { SupabaseClientLike } from '../shared.js';

import { SignInError } from './SignInError.js';
import type { AuthApi, AuthSession, SignInWithTelegramResult } from './types.js';

const sessionToAuth = (s: Session | null): AuthSession | null =>
  s ? { userId: s.user.id, expiresAt: s.expires_at ?? null } : null;

export const createAuthApi = (
  sb: SupabaseClientLike,
  supabaseUrl: string,
  anonKey: string,
): AuthApi => ({
  async signInWithTelegram(initData) {
    const url = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/auth-telegram`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
        },
        body: JSON.stringify({ initData }),
      });
    } catch (e) {
      throw new SignInError(
        'network',
        e instanceof Error ? e.message : 'Network error calling auth-telegram',
      );
    }

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
    const { tokenHash, isNewUser } = okBody.data;

    const { data: otpData, error: otpError } = await sb.auth.verifyOtp({
      type: 'magiclink',
      token_hash: tokenHash,
    });
    if (otpError || !otpData?.session) {
      throw new SignInError(
        'verify_otp_failed',
        otpError?.message ?? 'verifyOtp returned no session',
      );
    }

    return {
      session: sessionToAuth(otpData.session) as AuthSession,
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
    const subscription = data.subscription;
    return { unsubscribe: () => subscription.unsubscribe() };
  },

  async signOut() {
    await sb.auth.signOut();
  },
});
