import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

type LikeState = { count: number; likedByMe: boolean };

/**
 * Optimistic toggle — the heart must flip instantly. Pattern: cancel in-flight
 * refetches, snapshot, patch the cache, roll back on error, reconcile on settle.
 * See CLAUDE.md ("Mutations: optimistic for toggles").
 */
export const useToggleWishLike = (api: ApiClient) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { wishId: string; liked: boolean }) => {
      await api.wishLikes.setLiked(input.wishId, input.liked);
    },
    onMutate: async ({ wishId, liked }) => {
      const key = queryKeys.wishLikes.state(wishId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<LikeState>(key);
      if (previous && previous.likedByMe !== liked) {
        qc.setQueryData<LikeState>(key, {
          likedByMe: liked,
          count: Math.max(0, previous.count + (liked ? 1 : -1)),
        });
      }
      return { key, previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) qc.setQueryData(ctx.key, ctx.previous);
    },
    onSettled: (_data, _err, { wishId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.wishLikes.state(wishId) });
      void qc.invalidateQueries({ queryKey: queryKeys.wishes.one(wishId) });
      void qc.invalidateQueries({ queryKey: queryKeys.wishes.all() });
    },
  });
};
