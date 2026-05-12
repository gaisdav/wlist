// Concrete ApiClient implementation backed by supabase-js.
//
// Domain methods (auth, wishes, slots, …) are added incrementally — see the
// commented stubs in ApiClient.ts and plans 01–03.
//
// This class is the ONLY place in the codebase that calls `createClient(...)`
// outside of Edge Functions. Edge Functions get a separate client with the
// service-role key and never share state with the browser one.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { type Database } from '../generated/database.types.js';

import { type ApiClient } from './ApiClient.js';

export type SupabaseClientLike = SupabaseClient<Database>;

export interface SupabaseApiClientOptions {
  /** `https://<ref>.supabase.co` (from `VITE_SUPABASE_URL`). */
  url: string;
  /** Publishable / anon key safe to bundle into the browser. */
  anonKey: string;
}

export class SupabaseApiClient implements ApiClient {
  /** Raw supabase-js client. Domain modules in plans 01–03 use it via this property. */
  readonly supabase: SupabaseClientLike;

  constructor({ url, anonKey }: SupabaseApiClientOptions) {
    this.supabase = createClient<Database>(url, anonKey, {
      auth: {
        // The Mini App swaps Telegram initData for a Supabase session via
        // Edge Function (plan 01). We persist the resulting session in
        // localStorage so cold starts inside Telegram skip the round-trip.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: {
        headers: { 'x-wlist-client': 'tma' },
      },
    });
  }
}
