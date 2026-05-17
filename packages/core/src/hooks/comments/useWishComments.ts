import { useQuery } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

export const useWishComments = (api: ApiClient, wishId: string) => {
  return useQuery({
    queryKey: queryKeys.comments.byWish(wishId),
    queryFn: () => api.comments.listByWish(wishId),
    enabled: Boolean(wishId),
  });
};
