import { type ApiClient, SupabaseApiClient } from '@wlist/api';

/**
 * Builds the singleton ApiClient consumed by the React tree.
 * Reads bundled `VITE_SUPABASE_*` env vars and fails loudly if either is
 * missing — there's no useful fallback.
 */
export const createApiClient = (): ApiClient => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy apps/tma/.env.example to apps/tma/.env and fill them in.',
    );
  }

  return new SupabaseApiClient({ url, anonKey });
};
