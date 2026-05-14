import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

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

export const useFollowUser = (api: ApiClient, viewerId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (followeeId: string) => api.follows.follow(followeeId),
    onSuccess: (_, followeeId) => {
      invalidateFollowSide(qc, viewerId, followeeId);
    },
  });
};

export const useUnfollowUser = (api: ApiClient, viewerId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (followeeId: string) => api.follows.unfollow(followeeId),
    onSuccess: (_, followeeId) => {
      invalidateFollowSide(qc, viewerId, followeeId);
    },
  });
};
