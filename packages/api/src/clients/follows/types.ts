import type { ProfileRow } from '../profiles/types.js';

export interface FollowsApi {
  follow(followeeId: string): Promise<void>;
  unfollow(followeeId: string): Promise<void>;
  isFollowing(followeeId: string): Promise<boolean>;
  /**
   * Which of `followeeIds` the current user already follows, as a map keyed by
   * id. One query for the whole page — avoids an `isFollowing` per row.
   */
  followingStatus(followeeIds: string[]): Promise<Record<string, boolean>>;
  getCounts(userId: string): Promise<{ following: number; followers: number }>;
  listFollowing(userId: string): Promise<ProfileRow[]>;
  listFollowers(userId: string): Promise<ProfileRow[]>;
}
