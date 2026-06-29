import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

export const useCreateList = (api: ApiClient) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.lists.create(name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.lists.mine() });
    },
  });
};

export const useRenameList = (api: ApiClient) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; name: string }) => api.lists.rename(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.lists.mine() });
    },
  });
};

export const useDeleteList = (api: ApiClient) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.lists.delete(id),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.lists.mine() });
      qc.removeQueries({ queryKey: queryKeys.lists.members(id) });
    },
  });
};

export const useAddListMember = (api: ApiClient) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { listId: string; memberId: string }) => api.lists.addMember(input),
    onSuccess: (_, { listId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.lists.members(listId) });
    },
  });
};

export const useRemoveListMember = (api: ApiClient) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { listId: string; memberId: string }) => api.lists.removeMember(input),
    onSuccess: (_, { listId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.lists.members(listId) });
    },
  });
};
