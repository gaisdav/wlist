import type { Database } from '../generated/database.types.js';

type WishesRow = Database['public']['Tables']['wishes']['Row'];
type WishesInsert = Database['public']['Tables']['wishes']['Insert'];
type WishesUpdate = Database['public']['Tables']['wishes']['Update'];

/** Single source of truth: Postgres row shape after `pnpm db:types`. */
export type WishRow = WishesRow;

/** Caller payload; `owner_id` is filled by `SupabaseApiClient` from the session. */
export type WishCreateInput = Omit<WishesInsert, 'owner_id'>;

/** Partial update keyed by row `id`. `reposted_from_id` is insert-only (DB trigger). */
export type WishUpdateInput = { id: string } & Omit<WishesUpdate, 'reposted_from_id'>;
