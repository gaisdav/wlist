import type { SupabaseClientLike } from '../shared.js';
import type { WishRow } from '../wishes/types.js';

import type { FeedApi, FeedEventRow, FeedItemRow } from './types.js';

type FeedEventWishEmbedRow = FeedEventRow & {
  wishes: WishRow | WishRow[] | null;
};

const embedWishFromFeedRow = (row: FeedEventWishEmbedRow): FeedItemRow => {
  const { wishes: embedded, ...event } = row;
  const wish = Array.isArray(embedded) ? (embedded[0] ?? null) : (embedded ?? null);
  return { ...event, wish };
};

export const createFeedApi = (sb: SupabaseClientLike): FeedApi => ({
  async list(params) {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);
    const offset = Math.max(params.offset ?? 0, 0);
    const { data, error } = await sb
      .from('feed_events')
      .select('*, wishes!left(*)')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return (data ?? []).map(embedWishFromFeedRow);
  },
});
