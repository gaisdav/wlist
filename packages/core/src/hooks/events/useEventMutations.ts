import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiClient, EventCreateInput, EventUpdateInput } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

export const useCreateEvent = (api: ApiClient) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EventCreateInput) => api.events.create(input),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: queryKeys.events.byOwner(row.owner_id) });
      void qc.invalidateQueries({ queryKey: queryKeys.events.one(row.id) });
    },
  });
};

export const useUpdateEvent = (api: ApiClient) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EventUpdateInput) => api.events.update(input),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: queryKeys.events.byOwner(row.owner_id) });
      void qc.invalidateQueries({ queryKey: queryKeys.events.one(row.id) });
    },
  });
};

export const useDeleteEvent = (api: ApiClient) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.events.delete(id),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.events.all() });
      qc.removeQueries({ queryKey: queryKeys.events.one(id) });
    },
  });
};

export const useSetWishEvents = (api: ApiClient) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ wishId, eventIds }: { wishId: string; eventIds: string[] }) =>
      api.events.setWishEvents(wishId, eventIds),
    onSuccess: (_, { wishId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.events.forWish(wishId) });
      void qc.invalidateQueries({ queryKey: queryKeys.events.all() });
    },
  });
};
