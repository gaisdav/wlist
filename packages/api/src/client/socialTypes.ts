import type { Database } from '../generated/database.types.js';

import type { WishRow } from './wishTypes.js';

export type FeedEventRow = Database['public']['Tables']['feed_events']['Row'];

/** Feed event with embedded `wishes` row (RLS may yield `wish: null`). */
export type FeedItemRow = FeedEventRow & {
  wish: WishRow | null;
};

/** Cursor for `feed_events` ordered by `(created_at desc, id desc)`. */
export type FeedCursor = { created_at: string; id: string };
