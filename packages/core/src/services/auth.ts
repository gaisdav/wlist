import { type ApiClient } from '@wlist/api';

import { type Profile, profileSchema } from '../entities/profile.js';

/**
 * `loginWithTelegram` ties three platform calls together into one
 * dependency-free unit:
 *
 *   1. Hand `initData` to `api.auth.signInWithTelegram` → real session
 *      installed in supabase-js + new/existing user signal.
 *   2. Re-fetch the profile row freshly upserted by the Edge Function.
 *      We don't trust client-side state here — the function decides what the
 *      canonical profile looks like (Telegram fields can have changed).
 *   3. Validate + transform the row through `profileSchema` (snake → camel,
 *      Date parsing). If validation fails, that's a contract bug between
 *      DB schema and the entity definition; we fail loudly rather than ship
 *      a half-typed object into the UI.
 *
 * Pure with respect to React — testable with a hand-rolled mock ApiClient.
 * The hook layer (useSignInWithTelegram) wraps this in a TanStack mutation.
 */
export const loginWithTelegram = async (
  api: ApiClient,
  initData: string,
): Promise<{ profile: Profile; isNewUser: boolean }> => {
  const { isNewUser } = await api.auth.signInWithTelegram(initData);

  const row = await api.profiles.getCurrent();
  if (!row) {
    // First-call race — the Edge Function just inserted the row, but the
    // browser session hadn't yet picked up the new JWT when getCurrent ran.
    // Practically impossible because verifyOtp installs the session
    // synchronously, but worth a typed error rather than a `null` for the UI.
    throw new ProfileMissingAfterSignIn();
  }
  return { profile: profileSchema.parse(row), isNewUser };
};

export class ProfileMissingAfterSignIn extends Error {
  constructor() {
    super('Profile row was missing immediately after sign-in. This is a backend bug.');
    this.name = 'ProfileMissingAfterSignIn';
  }
}
