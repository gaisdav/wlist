import type { UseQueryResult } from '@tanstack/react-query';
import type { ApiClient, WishSlotRow } from '@wlist/api';

import {
  getWishReservationSummary,
  type WishReservationSummary,
  type WishReservationWishLike,
} from '../../lib/wishReservationSummary.js';

import { useSlotsByWish } from './useSlots.js';

export type UseWishReservationResult = {
  slotsQuery: UseQueryResult<WishSlotRow[]>;
  summary: WishReservationSummary | null;
  enabled: boolean;
};

/**
 * Loads slot rows and derived reservation summary for a non-owner viewer.
 * Uses the same `wish_slots` API for ordinary reserves (cap 1) and group gifts.
 */
export const useWishReservation = (
  api: ApiClient,
  wishId: string | undefined,
  wish: WishReservationWishLike | undefined,
  viewerId: string | undefined,
  isOwner: boolean,
): UseWishReservationResult => {
  const enabled = Boolean(wishId && wish && !isOwner && !wish.is_archived);
  const slotsQuery = useSlotsByWish(api, enabled ? wishId : undefined);

  const summary =
    wish && enabled && slotsQuery.data !== undefined
      ? getWishReservationSummary(slotsQuery.data, wish, viewerId)
      : null;

  return { slotsQuery, summary, enabled };
};
