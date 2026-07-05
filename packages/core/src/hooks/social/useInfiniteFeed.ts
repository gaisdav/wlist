import { useInfiniteQuery } from '@tanstack/react-query';
import type { ApiClient, FeedEventRow } from '@wlist/api';

import { queryKeys } from '../../config/index.js';
import { type Wish, wishSchema } from '../../entities/wish/index.js';
import { withParsedCopyLines } from '../../lib/wishCopyLines.js';

const PAGE = 20;

export type FeedItem = FeedEventRow & {
  wish: Wish | null;
};

export const useInfiniteFeed = (api: ApiClient) =>
  useInfiniteQuery({
    queryKey: queryKeys.feed.infinite(),
    queryFn: async ({ pageParam }): Promise<FeedItem[]> => {
      const offset = pageParam as number;
      const rows = await api.feed.list({ limit: PAGE, offset });
      return rows.map((row) => ({
        ...row,
        wish: row.wish ? wishSchema.parse(withParsedCopyLines(row.wish)) : null,
      }));
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE) return undefined;
      return allPages.length * PAGE;
    },
    // Bounds memory/refetch cost for a user who scrolls very far into the feed.
    // Forward-only list (no `getPreviousPageParam`), so there's nothing to prune backward.
    maxPages: 5,
  });
