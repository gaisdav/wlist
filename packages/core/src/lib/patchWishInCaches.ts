import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import { queryKeys } from '../config/index.js';
import type { Wish } from '../entities/wish/index.js';

/**
 * Minimal shape needed to patch a feed item's nested wish. Kept local (not
 * imported from `useInfiniteFeed`) to avoid coupling `lib/` to `hooks/` —
 * `lib/` is meant to stay a leaf that any hook (or Edge Function) can import.
 */
interface FeedItemLike {
  wish?: Wish | null;
}

const isWishLike = (value: unknown): value is Wish =>
  typeof value === 'object' && value !== null && 'id' in value;

const patchWish = (wish: Wish, wishId: string, delta: 1 | -1): Wish =>
  wish.id === wishId ? { ...wish, likes_count: Math.max(0, wish.likes_count + delta) } : wish;

/**
 * Patches `likes_count` for `wishId` directly in every cache entry a `Wish`
 * can appear under — the single-object shape from `wishes.one`, the array
 * shapes from `wishes.byOwner`/`wishes.byIds`, and the nested `wish` field of
 * `feed.infinite()` pages — so list/feed cards react instantly to a like
 * toggle without a broad `wishes.all()` invalidation/refetch.
 *
 * See docs/app-audit.md §2.1 / §3.2. Authoritative `likes_count` is restored
 * shortly after by the point invalidation of `wishes.one(wishId)` — this
 * patch is only for the instant optimistic feedback.
 */
export const patchWishLikesCount = (qc: QueryClient, wishId: string, delta: 1 | -1): void => {
  qc.setQueriesData<unknown>({ queryKey: queryKeys.wishes.all() }, (data: unknown) => {
    if (Array.isArray(data)) {
      return data.map((item) => (isWishLike(item) ? patchWish(item, wishId, delta) : item));
    }
    if (isWishLike(data)) {
      return patchWish(data, wishId, delta);
    }
    return data;
  });

  qc.setQueriesData<InfiniteData<FeedItemLike[]>>(
    { queryKey: queryKeys.feed.infinite() },
    (data) => {
      if (!data) return data;
      return {
        ...data,
        pages: data.pages.map((page) =>
          page.map((item) =>
            item.wish && item.wish.id === wishId
              ? { ...item, wish: patchWish(item.wish, wishId, delta) }
              : item,
          ),
        ),
      };
    },
  );
};
