import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

export const useWishComments = (api: ApiClient, wishId: string) => {
  const qc = useQueryClient();

  return useQuery({
    queryKey: queryKeys.comments.byWish(wishId),
    queryFn: async () => {
      const comments = await api.comments.listByWish(wishId);

      // Batch-seed author profiles for this thread so `CommentItem`'s per-comment
      // `useProfileById` finds cached data instead of firing N requests.
      const authorIds = [...new Set(comments.map((c) => c.author_id).filter(Boolean))];
      if (authorIds.length > 0) {
        const profiles = await api.profiles.getByIds(authorIds);
        for (const profile of profiles) {
          qc.setQueryData(queryKeys.profiles.byId(profile.id), profile);
        }
      }

      return comments;
    },
    enabled: Boolean(wishId),
  });
};
