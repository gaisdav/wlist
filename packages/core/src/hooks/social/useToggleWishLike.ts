import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';
import { patchWishLikesCount } from '../../lib/patchWishInCaches.js';

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
      const likesPatched = previous !== undefined && previous.likedByMe !== liked;
      if (previous && previous.likedByMe !== liked) {
        qc.setQueryData<LikeState>(key, {
          likedByMe: liked,
          count: Math.max(0, previous.count + (liked ? 1 : -1)),
        });
      }
      // Patch every cached `Wish` (list/feed cards) so the visible likes_count
      // updates instantly — no need to wait for the `wishes.one` refetch below.
      if (likesPatched) patchWishLikesCount(qc, wishId, liked ? 1 : -1);
      return { key, previous, likesPatched };
    },
    onError: (_err, { wishId, liked }, ctx) => {
      if (ctx?.previous !== undefined) qc.setQueryData(ctx.key, ctx.previous);
      if (ctx?.likesPatched) patchWishLikesCount(qc, wishId, liked ? -1 : 1);
    },
    onSettled: (_data, _err, { wishId }) => {
      // Point invalidations only — a broad `wishes.all()` invalidation here
      // used to refetch every cached wish list on a single like tap (see
      // docs/app-audit.md §2.1). The optimistic patch above already gives
      // instant feedback; these two just resync the authoritative counts.
      void qc.invalidateQueries({ queryKey: queryKeys.wishLikes.state(wishId) });
      void qc.invalidateQueries({ queryKey: queryKeys.wishes.one(wishId) });
    },
  });
};
