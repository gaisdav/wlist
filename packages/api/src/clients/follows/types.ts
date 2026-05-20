import type { ProfileRow } from '../profiles/types.js';

export interface FollowsApi {
  follow(followeeId: string): Promise<void>;
  unfollow(followeeId: string): Promise<void>;
  isFollowing(followeeId: string): Promise<boolean>;
  getCounts(userId: string): Promise<{ following: number; followers: number }>;
  listFollowing(userId: string): Promise<ProfileRow[]>;
  listFollowers(userId: string): Promise<ProfileRow[]>;
}
