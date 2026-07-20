import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { disabledQueryKey, queryKeys } from '../../config/index.js';
import { type Event, eventSchema } from '../../entities/event/index.js';

export const useWishEvents = (
  api: ApiClient,
  wishId: string | undefined,
): UseQueryResult<Event[]> =>
  useQuery({
    queryKey: wishId
      ? queryKeys.events.forWish(wishId)
      : disabledQueryKey([...queryKeys.events.all(), 'forWish']),
    queryFn: async () => {
      const rows = await api.events.listForWish(wishId as string);
      return rows.map((r) => eventSchema.parse(r));
    },
    enabled: Boolean(wishId),
  });
