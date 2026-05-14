import { useQuery } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

export const useFollowersList = (api: ApiClient, userId: string | undefined) =>
  useQuery({
    queryKey: userId
      ? queryKeys.follows.followersList(userId)
      : [...queryKeys.follows.followersList(''), 'pending'],
    queryFn: () => {
      if (!userId) throw new Error('userId required');
      return api.follows.listFollowers(userId);
    },
    enabled: Boolean(userId),
  });
