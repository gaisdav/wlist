import type { AuthApi } from './auth/types.js';
import type { CommentsApi } from './comments/types.js';
import type { EventsApi } from './events/types.js';
import type { FeedApi } from './feed/types.js';
import type { FollowsApi } from './follows/types.js';
import type { ProfilesApi } from './profiles/types.js';
import type { SlotsApi } from './slots/types.js';
import type { StorageApi } from './storage/types.js';
import type { WishesApi } from './wishes/types.js';
import type { WishLikesApi } from './wishLikes/types.js';

export interface ApiClient {
  auth: AuthApi;
  profiles: ProfilesApi;
  follows: FollowsApi;
  feed: FeedApi;
  wishLikes: WishLikesApi;
  storage: StorageApi;
  wishes: WishesApi;
  slots: SlotsApi;
  comments: CommentsApi;
  events: EventsApi;
}
