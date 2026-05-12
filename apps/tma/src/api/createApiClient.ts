import { type ApiClient, SupabaseApiClient } from '@wlist/api';

/**
 * Builds the singleton ApiClient consumed by the React tree.
 * Reads bundled `VITE_SUPABASE_*` env vars and fails loudly if either is
 * missing, blank, or still a placeholder — there's no useful fallback.
 *
 * The placeholder check is what saves us from white-screen-on-prod when env
 * vars are added in Vercel UI but left empty: supabase-js's own validation
 * fires *inside* the React tree and crashes the entire app silently, while
 * this throws on import with a message a human can act on.
 */
export const createApiClient = (): ApiClient => {
  const url = readEnv('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL);
  const anonKey = readEnv('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY);

  return new SupabaseApiClient({ url, anonKey });
};

const PLACEHOLDER_PATTERN = /<[a-z0-9-]+>|placeholder|xxxxxxxx|your[-_]/i;

const readEnv = (name: string, raw: string | undefined): string => {
  const value = (raw ?? '').trim();

  if (!value) {
    throw new EnvError(name, 'is empty or missing');
  }
  if (PLACEHOLDER_PATTERN.test(value)) {
    throw new EnvError(name, `still contains a placeholder ("${value.slice(0, 60)}…")`);
  }
  return value;
};

class EnvError extends Error {
  constructor(name: string, why: string) {
    super(
      `Env var ${name} ${why}.\n\n` +
        `Local dev:    copy apps/tma/.env.example to apps/tma/.env and fill it in, then restart \`pnpm dev\`.\n` +
        `Vercel:       Project Settings → Environment Variables. After adding/editing, redeploy (env vars are baked into the bundle at build time).`,
    );
    this.name = 'EnvError';
  }
}
