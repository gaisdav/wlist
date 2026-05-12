import { retrieveRawInitData } from '@telegram-apps/sdk-react';
import { SignInError, type SignInErrorCode } from '@wlist/api';
import { useCurrentUser, useSession, useSignInWithTelegram } from '@wlist/core/hooks/auth';
import { useEffect, useRef } from 'react';

import { useApiClient } from '../providers/ApiClientProvider';

/**
 * Outcome of the auth-on-launch flow. The `<AuthGate>` consumes this and
 * picks one of: splash / error / mock-env screen / render children.
 */
export type AuthBootstrapStatus =
  | { kind: 'loading' }
  | { kind: 'authenticated' }
  | { kind: 'no_init_data' }
  | { kind: 'error'; code: SignInErrorCode | 'unknown'; message: string };

/**
 * Drives sign-in once on app launch:
 *
 *   1. Ask the platform if we already have a live session
 *      (supabase-js reads it from localStorage during construction → no
 *      network round-trip in the common warm-start case).
 *   2. If yes → resolve immediately.
 *   3. If no → pull `initData` out of the Telegram SDK and call
 *      `useSignInWithTelegram`. The session installs itself via
 *      `verifyOtp` and the bootstrap flips to `authenticated`.
 *
 * Side-effect-only — returns just a status. The actual `Profile` is read
 * separately via `useCurrentUser`, which the mutation has already pre-seeded.
 *
 * Runs sign-in **at most once per mount** via a ref guard. React 19 strict
 * mode + supabase-js's own listeners make this important: re-firing the
 * Edge Function would burn an `initData` payload (anti-replay table → 401
 * on the next legit call).
 */
export const useAuthBootstrap = (): AuthBootstrapStatus => {
  const api = useApiClient();
  const { status: sessionStatus } = useSession(api);
  const signIn = useSignInWithTelegram(api);
  const profile = useCurrentUser(api);
  const triggered = useRef(false);

  useEffect(() => {
    if (sessionStatus !== 'unauthenticated') return;
    if (triggered.current) return;
    if (signIn.status === 'pending' || signIn.status === 'success') return;

    const initData = safeReadInitData();
    if (!initData) return;

    triggered.current = true;
    signIn.mutate({ initData });
  }, [sessionStatus, signIn]);

  if (signIn.isError) {
    const err = signIn.error;
    if (err instanceof SignInError) {
      return { kind: 'error', code: err.code, message: err.message };
    }
    return { kind: 'error', code: 'unknown', message: err.message };
  }

  if (sessionStatus === 'loading') return { kind: 'loading' };
  if (sessionStatus === 'unauthenticated') {
    // Either we're outside Telegram, or Telegram didn't hand us initData.
    // Distinguish the two so the UI can render an appropriate message.
    const hasInitData = safeReadInitData() !== null;
    if (!hasInitData && !signIn.isPending) return { kind: 'no_init_data' };
    return { kind: 'loading' };
  }

  // sessionStatus === 'authenticated'
  if (profile.isLoading) return { kind: 'loading' };
  if (profile.isError) {
    return {
      kind: 'error',
      code: 'unknown',
      message: profile.error instanceof Error ? profile.error.message : 'Failed to load profile',
    };
  }
  return { kind: 'authenticated' };
};

/**
 * Pull initData out of the Telegram SDK without throwing when called
 * outside Telegram (regular browser tab during local dev).
 */
const safeReadInitData = (): string | null => {
  try {
    return retrieveRawInitData() ?? null;
  } catch {
    return null;
  }
};
