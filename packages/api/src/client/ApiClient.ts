// `ApiClient` is the inversion-of-dependency boundary: `@wlist/core` only ever
// depends on this interface. The Supabase implementation lives in
// SupabaseApiClient.ts and is wired up in apps/tma/src/main.tsx.
//
// As we add features in plans 01–04 we extend each domain block here.
// See docs/architecture.md §4.

import type { WishPhotoUploadMime } from '../edge-contracts/wish-photo-upload.js';

/**
 * Authenticated session from the platform's perspective. Intentionally narrow:
 * we expose only what `@wlist/core` legitimately needs — the user id (for
 * query keys, optimistic UI) and an opaque token (for diagnostic logging).
 *
 * This shape is platform-agnostic — Supabase's `Session` type stays inside
 * `SupabaseApiClient` and never leaks into core. When/if we add a second
 * backend, we map THAT backend's session into this same shape.
 */
export interface AuthSession {
  userId: string;
  /** Unix seconds. `null` if the backend doesn't expose expiry. */
  expiresAt: number | null;
}

/** Raw payload returned by the auth-telegram Edge Function after success. */
export interface SignInWithTelegramResult {
  session: AuthSession;
  /**
   * `true` only on the very first call for this user. UI can show a welcome
   * screen / nudge to fill out the profile.
   */
  isNewUser: boolean;
}

/**
 * Profile row as it lives in the database — snake_case, raw types.
 *
 * `@wlist/core/entities/profile` parses this through `profileSchema` to
 * get the camelCased domain `Profile`. We do NOT import the entity type here
 * because that would create a `core ↔ api` cycle.
 */
export interface ProfileRow {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  language_code: string | null;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthApi {
  /**
   * Exchanges a Telegram Mini App `initData` payload for an authenticated
   * session. Internally:
   *   1. POSTs to the `auth-telegram` Edge Function (HMAC validation,
   *      anti-replay, profile upsert).
   *   2. Calls `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })`
   *      with the returned hash to install a real session with refresh.
   *
   * Throws `SignInError` (see SupabaseApiClient) on any of the documented
   * failure modes from the Edge Function contract.
   */
  signInWithTelegram(initData: string): Promise<SignInWithTelegramResult>;

  /** Current session, or `null` if not signed in. */
  getSession(): Promise<AuthSession | null>;

  /**
   * Subscribe to session changes (sign-in, refresh, sign-out). The platform
   * fires this from cold-start with the current session if any.
   */
  onAuthStateChange(callback: (session: AuthSession | null) => void): {
    unsubscribe(): void;
  };

  /** Tear down the session locally + on the platform. */
  signOut(): Promise<void>;
}

export interface ProfilesApi {
  /**
   * Fetches the profile of the currently signed-in user. Returns `null` if
   * the row hasn't been created yet (first-call race after sign-in — caller
   * should wait for the next session refresh and retry).
   */
  getCurrent(): Promise<ProfileRow | null>;
}

/**
 * Signed upload hand-off for the private `wish-photos` bucket (plan 02).
 * Client uploads bytes via `supabase.storage.uploadToSignedUrl(...)`.
 */
export interface WishPhotoSignedUpload {
  uploadUrl: string;
  storagePath: string;
  token: string;
}

export interface StorageApi {
  requestWishPhotoUpload(input: { wishId: string; mime: WishPhotoUploadMime }): Promise<WishPhotoSignedUpload>;
}

export interface ApiClient {
  auth: AuthApi;
  profiles: ProfilesApi;
  storage: StorageApi;
  // wishes.* → plan 02 (next PR)
  // slots.* → plan 03
}
