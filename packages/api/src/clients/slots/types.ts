import type { Database } from '../../generated/database.types.js';

type WishSlotsRow = Database['public']['Tables']['wish_slots']['Row'];

export type WishSlotRow = WishSlotsRow;

export interface WishSlotBookingRow extends WishSlotRow {
  wishes: {
    id: string;
    title: string;
    is_archived: boolean;
  } | null;
}

export interface SlotsApi {
  listByWish(wishId: string): Promise<WishSlotRow[]>;
  book(wishId: string, count: number): Promise<WishSlotRow[]>;
  cancel(slotId: string): Promise<void>;
  listMine(): Promise<WishSlotBookingRow[]>;
}
