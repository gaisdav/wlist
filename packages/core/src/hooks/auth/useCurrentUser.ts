import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { type ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';
import { type Profile, profileSchema } from '../../entities/profile.js';

/**
 * Read-only query for the currently signed-in user's `Profile`.
 *
 * Returns `null` (not an error) when the user is not signed in — the API
 * client itself decides this by inspecting the active session, so we don't
 * have to plumb auth state through here. UI gates ("show login button when
 * `data === null`") stay simple.
 *
 * Cache is keyed on `queryKeys.currentUser()`. The auth flow
 * (useSignInWithTelegram) seeds this same key on success, so the splash →
 * home transition is one render, no flash of empty state.
 *
 * `staleTime: Infinity` — Telegram-side fields can change (username, photo),
 * but we re-upsert them on every login. Between logins the data is stable
 * enough that polling adds noise without value. Manual `invalidate(...)`
 * after a profile edit (when we add one) is enough.
 */
export const useCurrentUser = (api: ApiClient): UseQueryResult<Profile | null> =>
  useQuery({
    queryKey: queryKeys.currentUser(),
    queryFn: async () => {
      const row = await api.profiles.getCurrent();
      return row ? profileSchema.parse(row) : null;
    },
    staleTime: Infinity,
    retry: 1,
  });
