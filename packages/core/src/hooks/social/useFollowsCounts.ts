import { useQuery } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

export const useFollowsCounts = (api: ApiClient, userId: string | undefined) =>
  useQuery({
    queryKey: userId ? queryKeys.follows.counts(userId) : [...queryKeys.follows.counts(''), 'pending'],
    queryFn: () => {
      if (!userId) throw new Error('userId required');
      return api.follows.getCounts(userId);
    },
    enabled: Boolean(userId),
  });
