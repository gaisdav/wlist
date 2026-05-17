import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';
import { type Event, eventSchema } from '../../entities/event/index.js';

export const useEvent = (
  api: ApiClient,
  eventId: string | undefined,
): UseQueryResult<Event | null> =>
  useQuery({
    queryKey: eventId
      ? queryKeys.events.one(eventId)
      : [...queryKeys.events.all(), 'one', 'pending'],
    queryFn: async () => {
      const row = await api.events.get(eventId as string);
      return row ? eventSchema.parse(row) : null;
    },
    enabled: Boolean(eventId),
  });
