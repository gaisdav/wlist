import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

/** List ids a wish is shared with (`visibility = 'lists'`) — for edit-form prefill. */
export const useWishVisibilityLists = (
  api: ApiClient,
  wishId: string | undefined,
): UseQueryResult<string[]> =>
  useQuery({
    queryKey: wishId
      ? queryKeys.lists.forWish(wishId)
      : [...queryKeys.lists.all(), 'forWish', 'pending'],
    queryFn: () => api.wishes.listVisibilityLists(wishId as string),
    enabled: Boolean(wishId),
  });
