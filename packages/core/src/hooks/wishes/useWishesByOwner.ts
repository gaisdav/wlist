import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';
import { type Wish, wishSchema } from '../../entities/wish/index.js';

/**
 * Wishes for a profile (`owner_id`), ordered newest first (server-side).
 * RLS hides other users' archived wishes; own list includes archived rows.
 */
export const useWishesByOwner = (
  api: ApiClient,
  ownerId: string | undefined,
): UseQueryResult<Wish[]> =>
  useQuery({
    queryKey: ownerId
      ? queryKeys.wishes.byOwner(ownerId)
      : [...queryKeys.wishes.all(), 'byOwner', 'pending'],
    queryFn: async () => {
      const rows = await api.wishes.listByOwner(ownerId as string);
      return rows.map((r) => wishSchema.parse(r));
    },
    enabled: Boolean(ownerId),
  });

/** @see useWishesByOwner — plan 02 naming for the signed-in user's list */
export const useMyWishes = useWishesByOwner;

/** @see useWishesByOwner — plan 02 naming for another user's list */
export const useUserWishes = useWishesByOwner;
