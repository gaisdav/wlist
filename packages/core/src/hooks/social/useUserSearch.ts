import { useQuery } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

export const useUserSearch = (api: ApiClient, query: string) =>
  useQuery({
    queryKey: queryKeys.profiles.search(query.trim()),
    queryFn: () => api.profiles.searchUsers(query),
    enabled: query.trim().length >= 2,
  });
