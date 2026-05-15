import { wishSlotCap } from './wishSlotsConstants.js';

/** Minimal slot row for reservation summary (avoids importing API row types in lib). */
export type WishSlotLike = {
  status: string;
  booked_by: string;
};

export type WishReservationWishLike = {
  is_collaborative: boolean;
  max_slots: number | null;
  is_archived: boolean;
};

export type WishReservationSummary = {
  cap: number;
  activeCount: number;
  isReserved: boolean;
  isReservedByMe: boolean;
  canReserve: boolean;
  remaining: number;
};

/** Effective cap: 1 for ordinary wishes, slot cap for group gifts. */
export const wishEffectiveSlotCap = (
  wish: Pick<WishReservationWishLike, 'is_collaborative' | 'max_slots'>,
): number => (wish.is_collaborative ? wishSlotCap(wish.max_slots) : 1);

export const getWishReservationSummary = (
  slots: WishSlotLike[],
  wish: WishReservationWishLike,
  viewerId: string | undefined,
): WishReservationSummary => {
  const cap = wishEffectiveSlotCap(wish);
  const activeSlots = slots.filter((s) => s.status === 'active');
  const activeCount = activeSlots.length;
  const isReserved = activeCount > 0;
  const isReservedByMe = viewerId != null && activeSlots.some((s) => s.booked_by === viewerId);
  const remaining = Math.max(0, cap - activeCount);
  const canReserve =
    !wish.is_archived && remaining > 0 && (wish.is_collaborative || !isReservedByMe);

  return {
    cap,
    activeCount,
    isReserved,
    isReservedByMe,
    canReserve,
    remaining,
  };
};
