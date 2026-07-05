import type { SupabaseClientLike } from '../shared.js';

import type { WishLikesApi } from './types.js';

export const createWishLikesApi = (sb: SupabaseClientLike): WishLikesApi => ({
  async getState(wishId) {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');
    const uid = userData.user.id;
    const [totalRes, mineRes] = await Promise.all([
      sb.from('wish_likes').select('*', { count: 'exact', head: true }).eq('wish_id', wishId),
      sb
        .from('wish_likes')
        .select('*', { count: 'exact', head: true })
        .eq('wish_id', wishId)
        .eq('user_id', uid),
    ]);
    if (totalRes.error) throw totalRes.error;
    if (mineRes.error) throw mineRes.error;
    return { count: totalRes.count ?? 0, likedByMe: (mineRes.count ?? 0) > 0 };
  },

  async setLiked(wishId, liked) {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');
    const uid = userData.user.id;
    if (liked) {
      const { error } = await sb
        .from('wish_likes')
        .upsert({ wish_id: wishId, user_id: uid }, { onConflict: 'user_id,wish_id' });
      if (error) throw error;
    } else {
      const { error } = await sb
        .from('wish_likes')
        .delete()
        .eq('wish_id', wishId)
        .eq('user_id', uid);
      if (error) throw error;
    }
  },

  async getStates(wishIds) {
    const unique = [...new Set(wishIds.filter(Boolean))];
    if (unique.length === 0) return {};
    const { data: userData } = await sb.auth.getUser();
    const uid = userData.user?.id;
    const { data, error } = await sb
      .from('wish_likes')
      .select('wish_id, user_id')
      .in('wish_id', unique);
    if (error) throw error;
    const out: Record<string, { count: number; likedByMe: boolean }> = {};
    for (const id of unique) out[id] = { count: 0, likedByMe: false };
    for (const row of data ?? []) {
      const entry = out[row.wish_id];
      if (!entry) continue;
      entry.count += 1;
      if (uid && row.user_id === uid) entry.likedByMe = true;
    }
    return out;
  },
});
