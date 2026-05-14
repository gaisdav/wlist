import { useInfiniteQuery } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

const PAGE = 20;

export const useInfiniteFeed = (api: ApiClient) =>
  useInfiniteQuery({
    queryKey: queryKeys.feed.infinite(),
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number;
      return api.feed.list({ limit: PAGE, offset });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE) return undefined;
      return allPages.length * PAGE;
    },
  });
