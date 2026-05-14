import type { Database } from '../generated/database.types.js';

export type WishSlotRow = Database['public']['Tables']['wish_slots']['Row'];

export type WishSlotWishSummary = Pick<
  Database['public']['Tables']['wishes']['Row'],
  'id' | 'title' | 'is_archived'
>;

/** Row from `wish_slots` with embedded `wishes(...)` for “my bookings”. */
export type WishSlotBookingRow = WishSlotRow & {
  wishes: WishSlotWishSummary | WishSlotWishSummary[] | null;
};
