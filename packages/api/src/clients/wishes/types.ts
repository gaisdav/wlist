import type { Database } from '../../generated/database.types.js';

type WishesRow = Database['public']['Tables']['wishes']['Row'];
type WishesInsert = Database['public']['Tables']['wishes']['Insert'];
type WishesUpdate = Database['public']['Tables']['wishes']['Update'];

export type WishRow = WishesRow;
export type WishCreateInput = Omit<WishesInsert, 'owner_id'>;
export type WishUpdateInput = { id: string } & Omit<WishesUpdate, 'owner_id'>;

export interface WishesApi {
  listByOwner(ownerId: string): Promise<WishRow[]>;
  listByIds(ids: string[]): Promise<WishRow[]>;
  get(id: string): Promise<WishRow | null>;
  create(input: WishCreateInput): Promise<WishRow>;
  update(input: WishUpdateInput): Promise<WishRow>;
  archive(id: string): Promise<WishRow>;
  unarchive(id: string): Promise<WishRow>;
  delete(id: string): Promise<void>;
}
