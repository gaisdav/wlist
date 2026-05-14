import type { Database } from '../generated/database.types.js';

export type FeedEventRow = Database['public']['Tables']['feed_events']['Row'];
export type FeedEventKind = Database['public']['Enums']['feed_event_kind'];

/** Cursor for `feed_events` ordered by `(created_at desc, id desc)`. */
export type FeedCursor = { created_at: string; id: string };
