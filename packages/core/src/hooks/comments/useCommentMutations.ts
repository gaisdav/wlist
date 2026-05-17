import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiClient, WishCommentCreateInput, WishCommentUpdateInput } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

export const useCreateWishComment = (api: ApiClient) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: WishCommentCreateInput) => api.comments.create(input),
    onSuccess: (_, input) => {
      void qc.invalidateQueries({ queryKey: queryKeys.comments.byWish(input.wish_id) });
      void qc.invalidateQueries({ queryKey: queryKeys.wishes.all() });
      void qc.invalidateQueries({ queryKey: queryKeys.feed.infinite() });
    },
  });
};

export const useUpdateWishComment = (api: ApiClient) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: WishCommentUpdateInput) => api.comments.update(input),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: queryKeys.comments.byWish(row.wish_id) });
    },
  });
};

export const useDeleteWishComment = (api: ApiClient) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; wishId: string }) => api.comments.delete(input.id),
    onSuccess: (_, input) => {
      void qc.invalidateQueries({ queryKey: queryKeys.comments.byWish(input.wishId) });
      void qc.invalidateQueries({ queryKey: queryKeys.wishes.all() });
      void qc.invalidateQueries({ queryKey: queryKeys.feed.infinite() });
    },
  });
};
