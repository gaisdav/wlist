import { useQuery } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

export const useProfileById = (api: ApiClient, userId: string | undefined) =>
  useQuery({
    queryKey: userId
      ? queryKeys.profiles.byId(userId)
      : [...queryKeys.profiles.byId(''), 'pending'],
    queryFn: () => {
      if (!userId) throw new Error('userId required');
      return api.profiles.getById(userId);
    },
    enabled: Boolean(userId),
  });
