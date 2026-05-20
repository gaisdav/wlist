import type { ProfileRow } from '../profiles/types.js';
import type { SupabaseClientLike } from '../shared.js';

import type { FollowsApi } from './types.js';

export const createFollowsApi = (sb: SupabaseClientLike): FollowsApi => ({
  async follow(followeeId: string) {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');
    const { error } = await sb.from('follows').insert({
      follower_id: userData.user.id,
      followee_id: followeeId,
    });
    if (error) throw error;
  },

  async unfollow(followeeId: string) {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');
    const { error } = await sb
      .from('follows')
      .delete()
      .eq('follower_id', userData.user.id)
      .eq('followee_id', followeeId);
    if (error) throw error;
  },

  async isFollowing(followeeId: string) {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData.user) return false;
    const { count, error } = await sb
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userData.user.id)
      .eq('followee_id', followeeId);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async getCounts(userId: string) {
    const [followingRes, followersRes] = await Promise.all([
      sb.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      sb.from('follows').select('*', { count: 'exact', head: true }).eq('followee_id', userId),
    ]);
    if (followingRes.error) throw followingRes.error;
    if (followersRes.error) throw followersRes.error;
    return {
      following: followingRes.count ?? 0,
      followers: followersRes.count ?? 0,
    };
  },

  async listFollowing(userId: string) {
    const { data: rows, error } = await sb
      .from('follows')
      .select('followee_id')
      .eq('follower_id', userId);
    if (error) throw error;
    const ids = (rows ?? []).map((r) => r.followee_id);
    if (ids.length === 0) return [];
    const { data: profs, error: pErr } = await sb.from('profiles').select('*').in('id', ids);
    if (pErr) throw pErr;
    return (profs ?? []) as ProfileRow[];
  },

  async listFollowers(userId: string) {
    const { data: rows, error } = await sb
      .from('follows')
      .select('follower_id')
      .eq('followee_id', userId);
    if (error) throw error;
    const ids = (rows ?? []).map((r) => r.follower_id);
    if (ids.length === 0) return [];
    const { data: profs, error: pErr } = await sb.from('profiles').select('*').in('id', ids);
    if (pErr) throw pErr;
    return (profs ?? []) as ProfileRow[];
  },
});
