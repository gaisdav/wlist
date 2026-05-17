import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';
import { type Wish, wishSchema } from '../../entities/wish/index.js';
import { withParsedCopyLines } from '../../lib/wishCopyLines.js';

export const useEventWishes = (
  api: ApiClient,
  eventId: string | undefined,
): UseQueryResult<Wish[]> =>
  useQuery({
    queryKey: eventId
      ? queryKeys.events.wishes(eventId)
      : [...queryKeys.events.all(), 'wishes', 'pending'],
    queryFn: async () => {
      const rows = await api.events.listWishes(eventId as string);
      return rows.map((r) => wishSchema.parse(withParsedCopyLines(r)));
    },
    enabled: Boolean(eventId),
  });
