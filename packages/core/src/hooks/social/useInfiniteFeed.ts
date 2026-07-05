import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiClient, FeedEventRow } from '@wlist/api';

import { queryKeys } from '../../config/index.js';
import { type Wish, wishSchema } from '../../entities/wish/index.js';
import { withParsedCopyLines } from '../../lib/wishCopyLines.js';

const PAGE = 20;

export type FeedItem = FeedEventRow & {
  wish: Wish | null;
};

export const useInfiniteFeed = (api: ApiClient) => {
  const qc = useQueryClient();

  return useInfiniteQuery({
    queryKey: queryKeys.feed.infinite(),
    queryFn: async ({ pageParam }): Promise<FeedItem[]> => {
      const offset = pageParam as number;
      const rows = await api.feed.list({ limit: PAGE, offset });
      const items = rows.map((row) => ({
        ...row,
        wish: row.wish ? wishSchema.parse(withParsedCopyLines(row.wish)) : null,
      }));

      // Batch-seed the actor profiles for this page so `FeedItemAuthorLink`'s
      // per-row `useProfileById` finds cached data instead of firing N requests.
      const actorIds = [...new Set(items.map((item) => item.actor_id).filter(Boolean))];
      if (actorIds.length > 0) {
        const profiles = await api.profiles.getByIds(actorIds);
        for (const profile of profiles) {
          qc.setQueryData(queryKeys.profiles.byId(profile.id), profile);
        }
      }

      return items;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE) return undefined;
      return allPages.length * PAGE;
    },
  });
};
