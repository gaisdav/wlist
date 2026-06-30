import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiClient, WishCreateInput, WishUpdateInput } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

export const useCreateWish = (api: ApiClient) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: WishCreateInput) => api.wishes.create(input),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: queryKeys.wishes.byOwner(row.owner_id) });
      void qc.invalidateQueries({ queryKey: queryKeys.wishes.one(row.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.feed.infinite() });
      // `create` may also write wish_visibility_lists (visibility = 'lists').
      void qc.invalidateQueries({ queryKey: queryKeys.lists.forWish(row.id) });
    },
  });
};

export const useUpdateWish = (api: ApiClient) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: WishUpdateInput) => api.wishes.update(input),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: queryKeys.wishes.byOwner(row.owner_id) });
      void qc.invalidateQueries({ queryKey: queryKeys.wishes.one(row.id) });
      // `update` re-syncs share links, so the edit-form prefill must refetch.
      void qc.invalidateQueries({ queryKey: queryKeys.lists.forWish(row.id) });
    },
  });
};

export const useArchiveWish = (api: ApiClient) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.wishes.archive(id),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: queryKeys.wishes.byOwner(row.owner_id) });
      void qc.invalidateQueries({ queryKey: queryKeys.wishes.one(row.id) });
    },
  });
};

export const useUnarchiveWish = (api: ApiClient) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.wishes.unarchive(id),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: queryKeys.wishes.byOwner(row.owner_id) });
      void qc.invalidateQueries({ queryKey: queryKeys.wishes.one(row.id) });
    },
  });
};

export const useDeleteWish = (api: ApiClient) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.wishes.delete(id),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.wishes.all() });
      void qc.invalidateQueries({ queryKey: queryKeys.feed.infinite() });
      qc.removeQueries({ queryKey: queryKeys.wishes.one(id) });
    },
  });
};
