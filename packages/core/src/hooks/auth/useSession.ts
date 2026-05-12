import { type ApiClient, type AuthSession } from '@wlist/api';
import { useEffect, useState } from 'react';

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface UseSessionResult {
  session: AuthSession | null;
  status: SessionStatus;
}

/**
 * Subscribes to the platform's auth state.
 *
 * - On mount: reads the current session synchronously from the platform
 *   (supabase-js reads it from localStorage during construction, so no
 *   network round-trip on cold start).
 * - Live updates: forwards every `onAuthStateChange` (sign-in, refresh,
 *   sign-out) into React state.
 * - Cleans up its subscription on unmount.
 *
 * Doesn't trigger sign-in by itself — pair with `useSignInWithTelegram` and
 * a small bootstrap effect (see apps/tma/src/auth/AuthGate.tsx).
 */
export const useSession = (api: ApiClient): UseSessionResult => {
  const [state, setState] = useState<UseSessionResult>({
    session: null,
    status: 'loading',
  });

  useEffect(() => {
    let cancelled = false;

    void api.auth.getSession().then((session) => {
      if (cancelled) return;
      setState({
        session,
        status: session ? 'authenticated' : 'unauthenticated',
      });
    });

    const subscription = api.auth.onAuthStateChange((session) => {
      setState({
        session,
        status: session ? 'authenticated' : 'unauthenticated',
      });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [api]);

  return state;
};
