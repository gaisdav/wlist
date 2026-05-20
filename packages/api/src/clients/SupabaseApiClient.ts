import { createClient } from '@supabase/supabase-js';

import type { Database } from '../generated/database.types.js';

import type { ApiClient } from './ApiClient.js';
import { createAuthApi } from './auth/AuthApiClient.js';
import type { AuthApi } from './auth/types.js';
import { createCommentsApi } from './comments/CommentsApiClient.js';
import type { CommentsApi } from './comments/types.js';
import { createEventsApi } from './events/EventsApiClient.js';
import type { EventsApi } from './events/types.js';
import { createFeedApi } from './feed/FeedApiClient.js';
import type { FeedApi } from './feed/types.js';
import { createFollowsApi } from './follows/FollowsApiClient.js';
import type { FollowsApi } from './follows/types.js';
import { createProfilesApi } from './profiles/ProfilesApiClient.js';
import type { ProfilesApi } from './profiles/types.js';
import type { SupabaseClientLike } from './shared.js';
import { createSlotsApi } from './slots/SlotsApiClient.js';
import type { SlotsApi } from './slots/types.js';
import { createStorageApi } from './storage/StorageApiClient.js';
import type { StorageApi } from './storage/types.js';
import type { WishesApi } from './wishes/types.js';
import { createWishesApi } from './wishes/WishesApiClient.js';
import type { WishLikesApi } from './wishLikes/types.js';
import { createWishLikesApi } from './wishLikes/WishLikesApiClient.js';

export interface SupabaseApiClientOptions {
  /** `https://<ref>.supabase.co` (from `VITE_SUPABASE_URL`). */
  url: string;
  /** Publishable / anon key safe to bundle into the browser. */
  anonKey: string;
}

export { type SupabaseClientLike } from './shared.js';

export class SupabaseApiClient implements ApiClient {
  readonly supabase: SupabaseClientLike;

  readonly auth: AuthApi;
  readonly profiles: ProfilesApi;
  readonly follows: FollowsApi;
  readonly feed: FeedApi;
  readonly wishLikes: WishLikesApi;
  readonly storage: StorageApi;
  readonly wishes: WishesApi;
  readonly slots: SlotsApi;
  readonly comments: CommentsApi;
  readonly events: EventsApi;

  constructor({ url, anonKey }: SupabaseApiClientOptions) {
    this.supabase = createClient<Database>(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: {
        headers: { 'x-wlist-client': 'tma' },
      },
    });

    this.auth = createAuthApi(this.supabase, url, anonKey);
    this.profiles = createProfilesApi(this.supabase);
    this.follows = createFollowsApi(this.supabase);
    this.feed = createFeedApi(this.supabase);
    this.wishLikes = createWishLikesApi(this.supabase);
    this.storage = createStorageApi(this.supabase);
    this.wishes = createWishesApi(this.supabase);
    this.slots = createSlotsApi(this.supabase);
    this.comments = createCommentsApi(this.supabase);
    this.events = createEventsApi(this.supabase);
  }
}
