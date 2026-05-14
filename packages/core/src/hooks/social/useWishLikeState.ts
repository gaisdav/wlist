import { useQuery } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

export const useWishLikeState = (api: ApiClient, wishId: string | undefined) =>
  useQuery({
    queryKey: wishId ? queryKeys.wishLikes.state(wishId) : [...queryKeys.wishLikes.state(''), 'pending'],
    queryFn: () => {
      if (!wishId) throw new Error('wishId required');
      return api.wishLikes.getState(wishId);
    },
    enabled: Boolean(wishId),
  });
