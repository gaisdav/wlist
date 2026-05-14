import { useQuery } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

export const useFollowingList = (api: ApiClient, userId: string | undefined) =>
  useQuery({
    queryKey: userId
      ? queryKeys.follows.followingList(userId)
      : [...queryKeys.follows.followingList(''), 'pending'],
    queryFn: () => {
      if (!userId) throw new Error('userId required');
      return api.follows.listFollowing(userId);
    },
    enabled: Boolean(userId),
  });
