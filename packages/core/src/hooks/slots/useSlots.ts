import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import type { ApiClient, WishSlotBookingRow, WishSlotRow } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

export const useSlotsByWish = (
  api: ApiClient,
  wishId: string | undefined,
): UseQueryResult<WishSlotRow[]> =>
  useQuery({
    queryKey: wishId ? queryKeys.slots.byWish(wishId) : [...queryKeys.slots.byWish(''), 'pending'],
    queryFn: async () => api.slots.listByWish(wishId as string),
    enabled: Boolean(wishId),
  });

export const useMySlotBookings = (api: ApiClient): UseQueryResult<WishSlotBookingRow[]> =>
  useQuery({
    queryKey: queryKeys.slots.myBookings(),
    queryFn: async () => api.slots.listMine(),
  });

export const useBookSlots = (
  api: ApiClient,
): UseMutationResult<WishSlotRow[], Error, { wishId: string; count: number }> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ wishId, count }) => api.slots.book(wishId, count),
    onSuccess: (_rows, { wishId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.slots.byWish(wishId) });
      void qc.invalidateQueries({ queryKey: queryKeys.wishes.one(wishId) });
      void qc.invalidateQueries({ queryKey: queryKeys.wishes.all() });
      void qc.invalidateQueries({ queryKey: queryKeys.slots.myBookings() });
    },
  });
};

export const useCancelSlot = (
  api: ApiClient,
): UseMutationResult<void, Error, { slotId: string; wishId: string }> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slotId }) => api.slots.cancel(slotId),
    onSuccess: async (_void, { wishId }) => {
      await qc.invalidateQueries({ queryKey: queryKeys.slots.myBookings() });
      await qc.invalidateQueries({ queryKey: queryKeys.slots.byWish(wishId) });
      void qc.invalidateQueries({ queryKey: queryKeys.wishes.one(wishId) });
      void qc.invalidateQueries({ queryKey: queryKeys.wishes.all() });
    },
  });
};
