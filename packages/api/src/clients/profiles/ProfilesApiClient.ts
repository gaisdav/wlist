import type { SupabaseClientLike } from '../shared.js';

import type { ProfilesApi, ProfileRow } from './types.js';

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

  async searchUsers(query: string) {
    const q = query.trim();
    if (q.length === 0) return [];

    const pattern = `%${q.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
    const [byUsername, byFirst] = await Promise.all([
      sb.from('profiles').select('*').ilike('username', pattern).limit(20),
      sb.from('profiles').select('*').ilike('first_name', pattern).limit(20),
    ]);
    if (byUsername.error) throw byUsername.error;
    if (byFirst.error) throw byFirst.error;
    const map = new Map<string, ProfileRow>();
    for (const r of [...(byUsername.data ?? []), ...(byFirst.data ?? [])]) {
      map.set(r.id, r as ProfileRow);
    }
    return [...map.values()].slice(0, 20);
  },
});
