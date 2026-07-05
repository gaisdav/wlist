import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';
import { useEffect } from 'react';

import { queryKeys } from '../../config/index.js';

/**
 * Batch-fetches events/slots/likes for a page of wish ids and seeds each
 * wish's individual query-cache entry, so per-card hooks (useWishEvents,
 * useSlotsByWish, useWishLikeState) find fresh data already cached instead
 * of each firing their own request. Call this once per list page.
 */
export const useWishListAncillary = (api: ApiClient, wishIds: string[]): void => {
  const qc = useQueryClient();
  const key = queryKeys.wishesAncillary.batch(wishIds);

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const [events, likes, slots] = await Promise.all([
        api.events.listForWishes(wishIds),
        api.wishLikes.getStates(wishIds),
        api.slots.listByWishes(wishIds),
      ]);
      return { events, likes, slots };
    },
    enabled: wishIds.length > 0,
    // seeded data should be at least as fresh as the default staleTime,
    // avoid refetching this batch every time the list remounts
    staleTime: 30_000,
  });

  // Seed on every successful fetch. Keyed off `dataUpdatedAt` (not `wishIds`)
  // since callers typically pass a freshly-mapped array each render — a new
  // array identity shouldn't re-run the seed loop, only a new fetch should.
  useEffect(() => {
    if (!query.data) return;
    const { events, likes, slots } = query.data;
    for (const id of wishIds) {
      qc.setQueryData(queryKeys.events.forWish(id), events[id] ?? []);
      qc.setQueryData(queryKeys.slots.byWish(id), slots[id] ?? []);
      const like = likes[id];
      if (like) qc.setQueryData(queryKeys.wishLikes.state(id), like);
    }
    // `wishIds` intentionally excluded: callers typically pass a freshly-mapped
    // array every render, and re-running this loop for the same fetched data
    // is unnecessary — only a new fetch (new `query.data`) should reseed.
  }, [qc, query.data, query.dataUpdatedAt]);
};
