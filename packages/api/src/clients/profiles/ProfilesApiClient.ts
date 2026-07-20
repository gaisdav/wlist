import type { SupabaseClientLike } from '../shared.js';

import type { ListUsersParams, ProfilesApi, ProfileRow } from './types.js';

/** Escape LIKE wildcards so a literal `%`/`_` in the query isn't treated as a pattern. */
const escapeLike = (value: string): string => value.replace(/%/g, '\\%').replace(/_/g, '\\_');

export const createProfilesApi = (sb: SupabaseClientLike): ProfilesApi => ({
  async getCurrent() {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData?.user) return null;

    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (error) throw error;
    return (data as ProfileRow | null) ?? null;
  },

  async getById(id: string) {
    const { data, error } = await sb.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as ProfileRow | null) ?? null;
  },

  async getByIds(ids: string[]) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return [];
    const { data, error } = await sb.from('profiles').select('*').in('id', unique);
    if (error) throw error;
    return (data ?? []) as ProfileRow[];
  },

  async listUsers({ query, limit, offset }: ListUsersParams) {
    let q = sb
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const trimmed = query?.trim() ?? '';
    if (trimmed.length >= 2) {
      // Single paginatable query: filter on either column with one `or`, instead
      // of merging two capped lists client-side (which can't be offset-paged).
      const pattern = `%${escapeLike(trimmed)}%`;
      q = q.or(`username.ilike.${pattern},first_name.ilike.${pattern}`);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as ProfileRow[];
  },
});
