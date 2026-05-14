// `ApiClient` is the inversion-of-dependency boundary: `@wlist/core` only ever
// depends on this interface. The Supabase implementation lives in
// SupabaseApiClient.ts and is wired up in apps/tma/src/main.tsx.
//
// As we add features in plans 01–04 we extend each domain block here.
// See docs/architecture.md §4.

import type { WishPhotoUploadMime } from '../edge-contracts/wish-photo-upload.js';

import type { WishSlotBookingRow, WishSlotRow } from './slotTypes.js';
import type { FeedEventRow } from './socialTypes.js';
import type { WishCreateInput, WishRow, WishUpdateInput } from './wishTypes.js';

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
 * `@wlist/core/entities/profile` validates the same shape via `profileSchema`
 * (stricter `photo_url`). We do NOT import the entity type here because that
 * would create a `core ↔ api` cycle.
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

  /** Any profile visible under current RLS (stage 05). */
  getById(id: string): Promise<ProfileRow | null>;

  /**
   * Case-insensitive search on `username` and `first_name` (OR), max 20 rows.
   * Empty / whitespace query yields `[]`.
   */
  searchUsers(query: string): Promise<ProfileRow[]>;
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
  requestWishPhotoUpload(input: {
    wishId: string;
    mime: WishPhotoUploadMime;
  }): Promise<WishPhotoSignedUpload>;

  /**
   * `PUT` raw bytes to the URL returned by `requestWishPhotoUpload` (browser
   * `fetch` — no supabase-js surface in `ApiClient`).
   */
  completeWishPhotoUpload(input: {
    uploadUrl: string;
    body: Blob;
    contentType: string;
  }): Promise<void>;

  /**
   * Short-lived signed URL to **read** an object in the private `wish-photos`
   * bucket (for `<img src>`). Visibility follows Storage RLS.
   */
  createWishPhotoSignedReadUrl(storagePath: string, expiresInSec?: number): Promise<string>;

  /** Remove an object from `wish-photos` (RLS: wish owner only). */
  deleteWishPhoto(storagePath: string): Promise<void>;
}

export interface FollowsApi {
  follow(followeeId: string): Promise<void>;
  unfollow(followeeId: string): Promise<void>;
  isFollowing(followeeId: string): Promise<boolean>;
  getCounts(userId: string): Promise<{ following: number; followers: number }>;
  listFollowing(userId: string): Promise<ProfileRow[]>;
  listFollowers(userId: string): Promise<ProfileRow[]>;
}

export interface FeedApi {
  /** Offset pagination (stable under concurrent inserts). */
  list(params: { limit?: number; offset?: number }): Promise<FeedEventRow[]>;
}

export interface WishLikesApi {
  getState(wishId: string): Promise<{ count: number; likedByMe: boolean }>;
  /** Idempotent: `liked === true` inserts, `false` deletes (no error if row missing). */
  setLiked(wishId: string, liked: boolean): Promise<void>;
}

export interface WishesApi {
  /** All wishes visible to the caller for this owner (RLS applies). */
  listByOwner(ownerId: string): Promise<WishRow[]>;
  get(id: string): Promise<WishRow | null>;
  create(input: WishCreateInput): Promise<WishRow>;
  update(input: WishUpdateInput): Promise<WishRow>;
  archive(id: string): Promise<WishRow>;
  unarchive(id: string): Promise<WishRow>;
  delete(id: string): Promise<void>;
}

export interface SlotsApi {
  listByWish(wishId: string): Promise<WishSlotRow[]>;
  /** Atomic multi-slot book (RPC). */
  book(wishId: string, count: number): Promise<WishSlotRow[]>;
  cancel(slotId: string): Promise<void>;
  /** Current user's bookings with embedded wish summary. */
  listMine(): Promise<WishSlotBookingRow[]>;
}

export interface ApiClient {
  auth: AuthApi;
  profiles: ProfilesApi;
  follows: FollowsApi;
  feed: FeedApi;
  wishLikes: WishLikesApi;
  storage: StorageApi;
  wishes: WishesApi;
  slots: SlotsApi;
}

export type { WishCreateInput, WishRow, WishUpdateInput } from './wishTypes.js';
export type { WishSlotBookingRow, WishSlotRow } from './slotTypes.js';
export type { FeedCursor, FeedEventRow } from './socialTypes.js';
