import type { Database } from '../../generated/database.types.js';

type WishesRow = Database['public']['Tables']['wishes']['Row'];
type WishesInsert = Database['public']['Tables']['wishes']['Insert'];
type WishesUpdate = Database['public']['Tables']['wishes']['Update'];

export type WishRow = WishesRow;

/**
 * `list_ids` is the M:N share target used only when `visibility = 'lists'`
 * (written to `wish_visibility_lists`). It is not a column on `wishes`, so it
 * lives alongside the row fields here. `undefined` on update = leave links
 * untouched; `[]` = clear them.
 */
export type WishCreateInput = Omit<WishesInsert, 'owner_id'> & { list_ids?: string[] };
export type WishUpdateInput = { id: string } & Omit<WishesUpdate, 'owner_id'> & {
    list_ids?: string[];
  };

export interface WishesApi {
  listByOwner(ownerId: string): Promise<WishRow[]>;
  listByIds(ids: string[]): Promise<WishRow[]>;
  get(id: string): Promise<WishRow | null>;
  create(input: WishCreateInput): Promise<WishRow>;
  update(input: WishUpdateInput): Promise<WishRow>;
  archive(id: string): Promise<WishRow>;
  unarchive(id: string): Promise<WishRow>;
  delete(id: string): Promise<void>;
  /** List ids a wish is shared with (`visibility = 'lists'`) — for edit prefill. */
  listVisibilityLists(wishId: string): Promise<string[]>;
}
