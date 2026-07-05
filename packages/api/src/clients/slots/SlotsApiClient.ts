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

  async listByWishes(wishIds) {
    const unique = [...new Set(wishIds.filter(Boolean))];
    if (unique.length === 0) return {};
    const { data, error } = await sb
      .from('wish_slots')
      .select('*')
      .in('wish_id', unique)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const out: Record<string, WishSlotRow[]> = {};
    for (const row of (data ?? []) as WishSlotRow[]) (out[row.wish_id] ??= []).push(row);
    return out;
  },
});
