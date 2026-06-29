import type { ProfileRow } from '../profiles/types.js';
import type { SupabaseClientLike } from '../shared.js';

import type { ListsApi, UserListRow } from './types.js';

export const createListsApi = (sb: SupabaseClientLike): ListsApi => ({
  async listMine() {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');
    const { data, error } = await sb
      .from('user_lists')
      .select('*')
      .eq('owner_id', userData.user.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as UserListRow[];
  },

  async create(name) {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');
    const { data, error } = await sb
      .from('user_lists')
      .insert({ owner_id: userData.user.id, name })
      .select('*')
      .single();
    if (error) throw error;
    return data as UserListRow;
  },

  async rename({ id, name }) {
    const { data, error } = await sb
      .from('user_lists')
      .update({ name })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as UserListRow;
  },

  async delete(id) {
    const { error } = await sb.from('user_lists').delete().eq('id', id);
    if (error) throw error;
  },

  async listMembers(listId) {
    const { data: rows, error } = await sb
      .from('user_list_members')
      .select('member_id')
      .eq('list_id', listId);
    if (error) throw error;
    const ids = (rows ?? []).map((r) => r.member_id);
    if (ids.length === 0) return [];
    const { data: profs, error: pErr } = await sb.from('profiles').select('*').in('id', ids);
    if (pErr) throw pErr;
    return (profs ?? []) as ProfileRow[];
  },

  async addMember({ listId, memberId }) {
    const { error } = await sb
      .from('user_list_members')
      .insert({ list_id: listId, member_id: memberId });
    if (error) throw error;
  },

  async removeMember({ listId, memberId }) {
    const { error } = await sb
      .from('user_list_members')
      .delete()
      .eq('list_id', listId)
      .eq('member_id', memberId);
    if (error) throw error;
  },
});
