import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';
import { useMemo } from 'react';

import { queryKeys } from '../../config/index.js';
import { type Wish, wishSchema } from '../../entities/wish/index.js';
import { withParsedCopyLines } from '../../lib/wishCopyLines.js';

export type WishesByIdMap = Record<string, Wish>;

/**
 * Loads current `wishes` rows for a set of ids (e.g. feed `subject_id`s).
 * RLS may omit rows the caller cannot see.
 */
export const useWishesByIds = (api: ApiClient, ids: string[]): UseQueryResult<WishesByIdMap> => {
  const sortedUnique = useMemo(() => [...new Set(ids.filter(Boolean))].sort(), [ids]);

  return useQuery({
    queryKey: queryKeys.wishes.byIds(sortedUnique),
    queryFn: async (): Promise<WishesByIdMap> => {
      const rows = await api.wishes.listByIds(sortedUnique);
      const byId: WishesByIdMap = {};
      for (const row of rows) {
        byId[row.id] = wishSchema.parse(withParsedCopyLines(row));
      }
      return byId;
    },
    enabled: sortedUnique.length > 0,
    placeholderData: keepPreviousData,
  });
};
