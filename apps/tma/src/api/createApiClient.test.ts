import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mocks have to be hoisted, so we stub @wlist/api before importing
// createApiClient. The mock just records the call args — we don't actually
// instantiate supabase-js here.
const SupabaseApiClientMock = vi.fn();
vi.mock('@wlist/api', () => ({
  SupabaseApiClient: SupabaseApiClientMock,
}));

const setEnv = (
  url: string | undefined,
  anonKey: string | undefined,
  appUrl = 'http://localhost:5173',
) => {
  vi.stubEnv('VITE_SUPABASE_URL', url ?? '');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', anonKey ?? '');
  vi.stubEnv('VITE_PUBLIC_APP_URL', appUrl);
};

describe('createApiClient', () => {
  beforeEach(() => {
    SupabaseApiClientMock.mockClear();
    vi.unstubAllEnvs();
  });

  it('instantiates SupabaseApiClient with trimmed env values', async () => {
    setEnv('  https://abc.supabase.co  ', '  sb_publishable_real  ');
    const { createApiClient } = await import('./createApiClient');

    createApiClient();

    expect(SupabaseApiClientMock).toHaveBeenCalledWith({
      url: 'https://abc.supabase.co',
      anonKey: 'sb_publishable_real',
    });
  });

  it.each([
    ['VITE_SUPABASE_URL', undefined, 'sb_publishable_real'],
    ['VITE_SUPABASE_URL', '', 'sb_publishable_real'],
    ['VITE_SUPABASE_URL', '   ', 'sb_publishable_real'],
    ['VITE_SUPABASE_ANON_KEY', 'https://abc.supabase.co', undefined],
    ['VITE_SUPABASE_ANON_KEY', 'https://abc.supabase.co', ''],
  ])('throws when %s is missing or blank', async (varName, url, anonKey) => {
    setEnv(url, anonKey);
    const { createApiClient } = await import('./createApiClient');

    expect(() => createApiClient()).toThrowError(new RegExp(`${varName}.*empty or missing`));
    expect(SupabaseApiClientMock).not.toHaveBeenCalled();
  });

  it.each([
    ['<project-ref>', 'https://<project-ref>.supabase.co', 'sb_publishable_real'],
    ['placeholder', 'https://abc.supabase.co', 'sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'],
    ['your-key', 'https://abc.supabase.co', 'your-anon-key-here'],
  ])('throws when value is still a %s placeholder', async (_label, url, anonKey) => {
    setEnv(url, anonKey);
    const { createApiClient } = await import('./createApiClient');

    expect(() => createApiClient()).toThrowError(/still contains a placeholder/);
    expect(SupabaseApiClientMock).not.toHaveBeenCalled();
  });
});
