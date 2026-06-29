import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

type Counts = { following: number; followers: number };

const invalidateFollowSide = (
  qc: QueryClient,
  viewerId: string | undefined,
  targetId: string,
): void => {
  if (viewerId) {
    void qc.invalidateQueries({ queryKey: queryKeys.follows.counts(viewerId) });
    void qc.invalidateQueries({ queryKey: queryKeys.follows.followingList(viewerId) });
  }
  void qc.invalidateQueries({ queryKey: queryKeys.follows.counts(targetId) });
  void qc.invalidateQueries({ queryKey: queryKeys.follows.followersList(targetId) });
  void qc.invalidateQueries({ queryKey: queryKeys.follows.isFollowing(targetId) });
  void qc.invalidateQueries({ queryKey: queryKeys.feed.infinite() });
};

const bumpCounts = (qc: QueryClient, key: readonly unknown[], field: keyof Counts, delta: number) => {
  const current = qc.getQueryData<Counts>(key);
  if (current) qc.setQueryData<Counts>(key, { ...current, [field]: Math.max(0, current[field] + delta) });
};

/**
 * Optimistic follow toggle — the button must react instantly. `delta` is +1 for
 * follow, -1 for unfollow. Patches `isFollowing(target)` plus the viewer's
 * `following` and the target's `followers` counts; rolls back on error.
 * See CLAUDE.md ("Mutations: optimistic for toggles").
 */
const useToggleFollow = (
  api: ApiClient,
  viewerId: string | undefined,
  run: (followeeId: string) => Promise<void>,
  delta: 1 | -1,
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: run,
    onMutate: async (followeeId: string) => {
      const isFollowingKey = queryKeys.follows.isFollowing(followeeId);
      const targetCountsKey = queryKeys.follows.counts(followeeId);
      const viewerCountsKey = viewerId ? queryKeys.follows.counts(viewerId) : null;

      await qc.cancelQueries({ queryKey: isFollowingKey });
      const snapshot = {
        isFollowingKey,
        targetCountsKey,
        viewerCountsKey,
        isFollowing: qc.getQueryData<boolean>(isFollowingKey),
        targetCounts: qc.getQueryData<Counts>(targetCountsKey),
        viewerCounts: viewerCountsKey ? qc.getQueryData<Counts>(viewerCountsKey) : undefined,
      };

      qc.setQueryData<boolean>(isFollowingKey, delta > 0);
      bumpCounts(qc, targetCountsKey, 'followers', delta);
      if (viewerCountsKey) bumpCounts(qc, viewerCountsKey, 'following', delta);

      return snapshot;
    },
    onError: (_err, _followeeId, ctx) => {
      if (!ctx) return;
      if (ctx.isFollowing !== undefined) qc.setQueryData(ctx.isFollowingKey, ctx.isFollowing);
      if (ctx.targetCounts !== undefined) qc.setQueryData(ctx.targetCountsKey, ctx.targetCounts);
      if (ctx.viewerCountsKey && ctx.viewerCounts !== undefined)
        qc.setQueryData(ctx.viewerCountsKey, ctx.viewerCounts);
    },
    onSettled: (_data, _err, followeeId) => {
      invalidateFollowSide(qc, viewerId, followeeId);
    },
  });
};

export const useFollowUser = (api: ApiClient, viewerId: string | undefined) =>
  useToggleFollow(api, viewerId, (id) => api.follows.follow(id), 1);

export const useUnfollowUser = (api: ApiClient, viewerId: string | undefined) =>
  useToggleFollow(api, viewerId, (id) => api.follows.unfollow(id), -1);
