export type { ApiClient } from './ApiClient.js';

export type { AuthApi, AuthSession, SignInWithTelegramResult } from './auth/types.js';
export { SignInError, type SignInErrorCode } from './auth/SignInError.js';

export type { ProfilesApi, ProfileRow } from './profiles/types.js';
export type { FollowsApi } from './follows/types.js';
export type { FeedApi, FeedItemRow, FeedEventRow, FeedCursor } from './feed/types.js';
export type { WishLikesApi } from './wishLikes/types.js';
export type { StorageApi, WishPhotoSignedUpload } from './storage/types.js';
export type { WishesApi, WishRow, WishCreateInput, WishUpdateInput } from './wishes/types.js';
export type { SlotsApi, WishSlotRow, WishSlotBookingRow } from './slots/types.js';
export type {
  CommentsApi,
  WishCommentRow,
  WishCommentCreateInput,
  WishCommentUpdateInput,
} from './comments/types.js';
export type { EventsApi, EventRow, EventCreateInput, EventUpdateInput } from './events/types.js';

export {
  SupabaseApiClient,
  type SupabaseApiClientOptions,
  type SupabaseClientLike,
} from './SupabaseApiClient.js';
