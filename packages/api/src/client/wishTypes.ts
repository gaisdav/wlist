/**
 * Raw `public.wishes` row — snake_case, matches Postgres + `WishRow` in
 * `database.types.ts`. Parsed in `@wlist/core/entities/wish` into domain `Wish`.
 */
export interface WishRow {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  link: string | null;
  photo_storage_path: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

/** Insert payload; `owner_id` is set by `SupabaseApiClient` from the session. */
export interface WishCreateInput {
  title: string;
  description?: string | null;
  price?: number | null;
  /** Defaults to `USD` in the database when omitted. */
  currency?: string;
  link?: string | null;
  photo_storage_path?: string | null;
}

/** Partial update by `id` — only provided fields are written. */
export interface WishUpdateInput {
  id: string;
  title?: string;
  description?: string | null;
  price?: number | null;
  currency?: string;
  link?: string | null;
  photo_storage_path?: string | null;
  is_archived?: boolean;
}
