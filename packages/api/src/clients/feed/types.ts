import type { Database } from '../../generated/database.types.js';
import type { WishRow } from '../wishes/types.js';

export type FeedEventRow = Database['public']['Tables']['feed_events']['Row'];

export interface FeedItemRow extends FeedEventRow {
  wish: WishRow | null;
}

export type FeedCursor = string;

export interface FeedApi {
  list(params: { limit?: number; offset?: number }): Promise<FeedItemRow[]>;
}
