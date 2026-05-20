import type { SupabaseClientLike } from '../shared.js';

import type { SlotsApi, WishSlotRow, WishSlotBookingRow } from './types.js';

export const createSlotsApi = (sb: SupabaseClientLike): SlotsApi => ({
  async listByWish(wishId) {
    const { data, error } = await sb
      .from('wish_slots')
      .select('*')
      .eq('wish_id', wishId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as WishSlotRow[];
  },

  async book(wishId, count) {
    const { data, error } = await sb.rpc('book_wish_slots', {
      p_wish_id: wishId,
      p_count: count,
    });
    if (error) throw error;
    return (data ?? []) as WishSlotRow[];
  },

  async cancel(slotId) {
    const { error } = await sb.from('wish_slots').update({ status: 'cancelled' }).eq('id', slotId);
    if (error) throw error;
  },

  async listMine() {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');
    const { data, error } = await sb
      .from('wish_slots')
      .select('*, wishes(id, title, is_archived)')
      .eq('booked_by', userData.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as WishSlotBookingRow[];
  },
});
