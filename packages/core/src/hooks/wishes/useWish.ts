import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';
import { type Wish, wishSchema } from '../../entities/wish/index.js';
import { withParsedCopyLines } from '../../lib/wishCopyLines.js';

export const useWish = (api: ApiClient, wishId: string | undefined): UseQueryResult<Wish | null> =>
  useQuery({
    queryKey: wishId ? queryKeys.wishes.one(wishId) : [...queryKeys.wishes.all(), 'one', 'pending'],
    queryFn: async () => {
      const row = await api.wishes.get(wishId as string);
      return row ? wishSchema.parse(withParsedCopyLines(row)) : null;
    },
    enabled: Boolean(wishId),
  });
