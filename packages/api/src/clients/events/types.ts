import type { Database } from '../../generated/database.types.js';
import type { WishRow } from '../wishes/types.js';

type EventsRow = Database['public']['Tables']['events']['Row'];
type EventsInsert = Database['public']['Tables']['events']['Insert'];
type EventsUpdate = Database['public']['Tables']['events']['Update'];

/** Single source of truth: Postgres row shape after `pnpm db:types`. */
export type EventRow = EventsRow;

/** Caller payload; `owner_id` is filled by `SupabaseApiClient` from the session. */
export type EventCreateInput = Omit<EventsInsert, 'owner_id'>;

/** Partial update keyed by row `id`. */
export type EventUpdateInput = { id: string } & Omit<EventsUpdate, 'owner_id'>;

export interface EventsApi {
  listByOwner(ownerId: string): Promise<EventRow[]>;
  get(id: string): Promise<EventRow | null>;
  create(input: EventCreateInput): Promise<EventRow>;
  update(input: EventUpdateInput): Promise<EventRow>;
  delete(id: string): Promise<void>;
  listWishes(eventId: string): Promise<WishRow[]>;
  linkWish(eventId: string, wishId: string): Promise<void>;
  unlinkWish(eventId: string, wishId: string): Promise<void>;
  setWishEvents(wishId: string, eventIds: string[]): Promise<void>;
  listForWish(wishId: string): Promise<EventRow[]>;
  /** Batched `listForWish`: one round trip for a page of wish ids, keyed by `wish_id`. */
  listForWishes(wishIds: string[]): Promise<Record<string, EventRow[]>>;
}
