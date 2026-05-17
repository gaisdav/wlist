import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';
import { type Event, eventSchema } from '../../entities/event/index.js';

export const useUserEvents = (
  api: ApiClient,
  ownerId: string | undefined,
): UseQueryResult<Event[]> =>
  useQuery({
    queryKey: ownerId
      ? queryKeys.events.byOwner(ownerId)
      : [...queryKeys.events.all(), 'byOwner', 'pending'],
    queryFn: async () => {
      const rows = await api.events.listByOwner(ownerId as string);
      return rows.map((r) => eventSchema.parse(r));
    },
    enabled: Boolean(ownerId),
  });
