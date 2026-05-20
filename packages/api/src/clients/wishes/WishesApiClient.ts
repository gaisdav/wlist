import type { Database } from '../../generated/database.types.js';
import type { SupabaseClientLike } from '../shared.js';

import type { WishesApi, WishRow, WishCreateInput, WishUpdateInput } from './types.js';

export const createWishesApi = (sb: SupabaseClientLike): WishesApi => ({
  async listByOwner(ownerId) {
    const { data, error } = await sb
      .from('wishes')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as WishRow[];
  },

  async listByIds(ids) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return [];
    const chunkSize = 100;
    const out: WishRow[] = [];
    for (let i = 0; i < unique.length; i += chunkSize) {
      const chunk = unique.slice(i, i + chunkSize);
      const { data, error } = await sb.from('wishes').select('*').in('id', chunk);
      if (error) throw error;
      out.push(...((data ?? []) as WishRow[]));
    }
    return out;
  },

  async get(id) {
    const { data, error } = await sb.from('wishes').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as WishRow | null) ?? null;
  },

  async create(input: WishCreateInput) {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');

    const insert: Database['public']['Tables']['wishes']['Insert'] = {
      title: input.title,
      owner_id: userData.user.id,
      description: input.description ?? null,
      price: input.price ?? null,
      currency: input.currency ?? null,
      link: input.link ?? null,
      photo_storage_path: input.photo_storage_path ?? null,
      is_collaborative: input.is_collaborative ?? false,
      max_slots: input.max_slots ?? null,
      copy_lines: input.copy_lines ?? null,
      reposted_from_id: input.reposted_from_id ?? null,
    };

    const { data, error } = await sb.from('wishes').insert(insert).select('*').single();
    if (error) throw error;
    return data as WishRow;
  },

  async update(input: WishUpdateInput) {
    const { id, ...rest } = input;
    const patch: Database['public']['Tables']['wishes']['Update'] = {};
    if (rest.title !== undefined) patch.title = rest.title;
    if (rest.description !== undefined) patch.description = rest.description;
    if (rest.price !== undefined) patch.price = rest.price;
    if (rest.currency !== undefined) patch.currency = rest.currency;
    if (rest.link !== undefined) patch.link = rest.link;
    if (rest.photo_storage_path !== undefined) patch.photo_storage_path = rest.photo_storage_path;
    if (rest.is_collaborative !== undefined) patch.is_collaborative = rest.is_collaborative;
    if (rest.max_slots !== undefined) patch.max_slots = rest.max_slots;
    if (rest.copy_lines !== undefined) patch.copy_lines = rest.copy_lines;
    if (rest.is_archived !== undefined) patch.is_archived = rest.is_archived;

    if (Object.keys(patch).length === 0) {
      const { data: existing, error: getErr } = await sb
        .from('wishes')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (getErr) throw getErr;
      if (!existing) throw new Error('Wish not found');
      return existing as WishRow;
    }

    const { data, error } = await sb.from('wishes').update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    return data as WishRow;
  },

  async archive(id) {
    const { data, error } = await sb
      .from('wishes')
      .update({ is_archived: true })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as WishRow;
  },

  async unarchive(id) {
    const { data, error } = await sb
      .from('wishes')
      .update({ is_archived: false })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as WishRow;
  },

  async delete(id) {
    const { data: row, error: getErr } = await sb
      .from('wishes')
      .select('photo_storage_path')
      .eq('id', id)
      .maybeSingle();
    if (getErr) throw getErr;
    if (!row) return;

    const { error } = await sb.from('wishes').delete().eq('id', id);
    if (error) throw error;

    const path = row.photo_storage_path;
    if (path) {
      await sb.storage.from('wish-photos').remove([path]);
    }
  },
});
