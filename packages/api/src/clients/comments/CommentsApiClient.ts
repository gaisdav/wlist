import type { Database } from '../../generated/database.types.js';
import type { SupabaseClientLike } from '../shared.js';

import type { CommentsApi, WishCommentRow } from './types.js';

export const createCommentsApi = (sb: SupabaseClientLike): CommentsApi => ({
  async listByWish(wishId) {
    const { data, error } = await sb
      .from('wish_comments')
      .select('*')
      .eq('wish_id', wishId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as WishCommentRow[];
  },

  async create(input) {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');

    const insert: Database['public']['Tables']['wish_comments']['Insert'] = {
      wish_id: input.wish_id,
      body: input.body,
      author_id: userData.user.id,
      parent_id: input.parent_id ?? null,
    };
    if (input.visible_to_owner_thread !== undefined) {
      insert.visible_to_owner_thread = input.visible_to_owner_thread;
    }

    const { data, error } = await sb.from('wish_comments').insert(insert).select('*').single();
    if (error) throw error;
    return data as WishCommentRow;
  },

  async update(input) {
    const { data, error } = await sb
      .from('wish_comments')
      .update({ body: input.body })
      .eq('id', input.id)
      .select('*')
      .single();
    if (error) throw error;
    return data as WishCommentRow;
  },

  async delete(id) {
    const { error } = await sb.from('wish_comments').delete().eq('id', id);
    if (error) throw error;
  },
});
