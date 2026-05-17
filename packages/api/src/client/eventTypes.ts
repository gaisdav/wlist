import type { Database } from '../generated/database.types.js';

type EventsRow = Database['public']['Tables']['events']['Row'];
type EventsInsert = Database['public']['Tables']['events']['Insert'];
type EventsUpdate = Database['public']['Tables']['events']['Update'];

/** Single source of truth: Postgres row shape after `pnpm db:types`. */
export type EventRow = EventsRow;

/** Caller payload; `owner_id` is filled by `SupabaseApiClient` from the session. */
export type EventCreateInput = Omit<EventsInsert, 'owner_id'>;

/** Partial update keyed by row `id`. */
export type EventUpdateInput = { id: string } & Omit<EventsUpdate, 'owner_id'>;
