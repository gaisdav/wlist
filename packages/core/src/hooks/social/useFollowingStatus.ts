import { useQuery } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

/**
 * Resolves "do I follow each of these users" in a single query, so a list of
 * follow buttons doesn't fire one `isFollowing` request per row. Returns a map
 * keyed by user id; a missing id means "not following".
 */
export const useFollowingStatus = (api: ApiClient, ids: string[]) =>
  useQuery({
    queryKey: queryKeys.follows.status(ids),
    queryFn: () => api.follows.followingStatus(ids),
    enabled: ids.length > 0,
  });
