import type { Database } from '../../generated/database.types.js';
import type { SupabaseClientLike } from '../shared.js';
import type { WishRow } from '../wishes/types.js';

import type { EventsApi, EventRow, EventCreateInput, EventUpdateInput } from './types.js';

export const createEventsApi = (sb: SupabaseClientLike): EventsApi => ({
  async listByOwner(ownerId) {
    const { data, error } = await sb
      .from('events')
      .select('*')
      .eq('owner_id', ownerId)
      .order('event_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as EventRow[];
  },

  async get(id) {
    const { data, error } = await sb.from('events').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as EventRow | null) ?? null;
  },

  async create(input: EventCreateInput) {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');

    const insert: Database['public']['Tables']['events']['Insert'] = {
      title: input.title,
      owner_id: userData.user.id,
      event_date: input.event_date ?? null,
      is_recurring_yearly: input.is_recurring_yearly ?? true,
      is_archived: input.is_archived ?? false,
    };

    const { data, error } = await sb.from('events').insert(insert).select('*').single();
    if (error) throw error;
    return data as EventRow;
  },

  async update(input: EventUpdateInput) {
    const { id, ...rest } = input;
    const patch: Database['public']['Tables']['events']['Update'] = {};
    if (rest.title !== undefined) patch.title = rest.title;
    if (rest.event_date !== undefined) patch.event_date = rest.event_date;
    if (rest.is_recurring_yearly !== undefined)
      patch.is_recurring_yearly = rest.is_recurring_yearly;
    if (rest.is_archived !== undefined) patch.is_archived = rest.is_archived;

    const { data, error } = await sb.from('events').update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    return data as EventRow;
  },

  async delete(id) {
    const { error } = await sb.from('events').delete().eq('id', id);
    if (error) throw error;
  },

  async listWishes(eventId) {
    const { data, error } = await sb
      .from('event_wishes')
      .select('wishes(*)')
      .eq('event_id', eventId);
    if (error) throw error;
    return (data?.map((item) => item.wishes).filter(Boolean) ?? []) as WishRow[];
  },

  async linkWish(eventId, wishId) {
    const { error } = await sb.from('event_wishes').insert({ event_id: eventId, wish_id: wishId });
    if (error) throw error;
  },

  async unlinkWish(eventId, wishId) {
    const { error } = await sb
      .from('event_wishes')
      .delete()
      .eq('event_id', eventId)
      .eq('wish_id', wishId);
    if (error) throw error;
  },

  async setWishEvents(wishId, eventIds) {
    const { error: delErr } = await sb.from('event_wishes').delete().eq('wish_id', wishId);
    if (delErr) throw delErr;

    if (eventIds.length > 0) {
      const inserts = eventIds.map((eventId) => ({ event_id: eventId, wish_id: wishId }));
      const { error: insErr } = await sb.from('event_wishes').insert(inserts);
      if (insErr) throw insErr;
    }
  },

  async listForWish(wishId) {
    const { data, error } = await sb.from('event_wishes').select('events(*)').eq('wish_id', wishId);
    if (error) throw error;
    return (data?.map((item) => item.events).filter(Boolean) ?? []) as EventRow[];
  },
});
