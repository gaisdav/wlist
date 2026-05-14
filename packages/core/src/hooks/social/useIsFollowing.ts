import { useQuery } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

export const useIsFollowing = (api: ApiClient, followeeId: string | undefined) =>
  useQuery({
    queryKey: followeeId
      ? queryKeys.follows.isFollowing(followeeId)
      : [...queryKeys.follows.isFollowing(''), 'pending'],
    queryFn: () => {
      if (!followeeId) throw new Error('followeeId required');
      return api.follows.isFollowing(followeeId);
    },
    enabled: Boolean(followeeId),
  });
