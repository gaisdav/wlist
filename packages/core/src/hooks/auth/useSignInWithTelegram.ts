import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { type ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';
import { type Profile } from '../../entities/profile/index.js';
import { loginWithTelegram } from '../../services/auth/index.js';

export interface SignInVariables {
  initData: string;
}

export interface SignInResult {
  profile: Profile;
  isNewUser: boolean;
}

/**
 * Mutation that exchanges Telegram `initData` for a fully-loaded `Profile`.
 *
 * On success we:
 *   - prime the `currentUser` query cache so any consumer of `useCurrentUser`
 *     re-renders instantly with the new profile (no second network round-trip)
 *   - leave error handling to the caller — the error already carries a typed
 *     `code` (see `SignInError` in @wlist/api) so the UI can branch:
 *       'replayed_init_data' / 'expired_init_data' → ask user to reopen the app
 *       'invalid_init_data'                        → likely tampering, generic message
 *       'network'                                  → retryable
 */
export const useSignInWithTelegram = (
  api: ApiClient,
): UseMutationResult<SignInResult, Error, SignInVariables> => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ initData }: SignInVariables) => loginWithTelegram(api, initData),
    onSuccess: ({ profile }) => {
      qc.setQueryData<Profile>(queryKeys.currentUser(), profile);
    },
  });
};
