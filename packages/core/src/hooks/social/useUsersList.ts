import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

const PAGE = 20;

/**
 * Paginated user directory for the "Find people" screen. An empty (or <2 char)
 * `query` returns the most recently joined users; a longer query filters the
 * same list. `query` is part of the key, so switching it resets pages.
 */
export const useUsersList = (api: ApiClient, query: string) => {
  const trimmed = query.trim();
  return useInfiniteQuery({
    queryKey: queryKeys.profiles.list(trimmed),
    queryFn: ({ pageParam }) =>
      api.profiles.listUsers({ query: trimmed, limit: PAGE, offset: pageParam as number }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE) return undefined;
      return allPages.length * PAGE;
    },
    // Bounds memory/refetch cost for a user who scrolls very far into the directory.
    // Forward-only list (no `getPreviousPageParam`), so there's nothing to prune backward.
    maxPages: 5,
    // Keep the previous query's results on screen while a new debounced `query`
    // resolves, instead of flipping `isLoading` true and flashing the skeleton
    // on every keystroke.
    placeholderData: keepPreviousData,
  });
};
