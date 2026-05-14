import { type ApiClient, type ProfileRow } from '@wlist/api';
import { describe, expect, it, vi } from 'vitest';

import { loginWithTelegram, ProfileMissingAfterSignIn } from './auth.js';

const buildProfileRow = (overrides: Partial<ProfileRow> = {}): ProfileRow => ({
  id: '00000000-0000-4000-8000-000000000001',
  telegram_id: 1234567,
  username: 'durov',
  first_name: 'Pavel',
  last_name: null,
  photo_url: null,
  language_code: 'en',
  is_premium: false,
  created_at: '2026-05-12T12:00:00Z',
  updated_at: '2026-05-12T12:00:00Z',
  ...overrides,
});

const buildApi = (overrides: {
  signInWithTelegram?: ApiClient['auth']['signInWithTelegram'];
  getCurrent?: ApiClient['profiles']['getCurrent'];
}): ApiClient =>
  ({
    auth: {
      signInWithTelegram:
        overrides.signInWithTelegram ??
        vi.fn().mockResolvedValue({
          session: { userId: 'u', expiresAt: null },
          isNewUser: false,
        }),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
    profiles: {
      getCurrent: overrides.getCurrent ?? vi.fn().mockResolvedValue(buildProfileRow()),
      getById: vi.fn().mockResolvedValue(null),
      searchUsers: vi.fn().mockResolvedValue([]),
    },
    follows: {
      follow: vi.fn(),
      unfollow: vi.fn(),
      isFollowing: vi.fn().mockResolvedValue(false),
      getCounts: vi.fn().mockResolvedValue({ following: 0, followers: 0 }),
      listFollowing: vi.fn().mockResolvedValue([]),
      listFollowers: vi.fn().mockResolvedValue([]),
    },
    feed: {
      list: vi.fn().mockResolvedValue([]),
    },
    wishLikes: {
      getState: vi.fn().mockResolvedValue({ count: 0, likedByMe: false }),
      setLiked: vi.fn(),
    },
    storage: {
      requestWishPhotoUpload: vi.fn(),
      completeWishPhotoUpload: vi.fn(),
      createWishPhotoSignedReadUrl: vi.fn(),
      deleteWishPhoto: vi.fn(),
    },
    wishes: {
      listByOwner: vi.fn(),
      listByIds: vi.fn().mockResolvedValue([]),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      archive: vi.fn(),
      unarchive: vi.fn(),
      delete: vi.fn(),
    },
    slots: {
      listByWish: vi.fn(),
      book: vi.fn(),
      cancel: vi.fn(),
      listMine: vi.fn(),
    },
  }) as ApiClient;

describe('loginWithTelegram', () => {
  it('returns parsed Profile and isNewUser flag on the happy path', async () => {
    const signIn = vi.fn().mockResolvedValue({
      session: { userId: 'u', expiresAt: 1234 },
      isNewUser: true,
    });
    const getCurrent = vi.fn().mockResolvedValue(buildProfileRow());
    const api = buildApi({ signInWithTelegram: signIn, getCurrent });

    const result = await loginWithTelegram(api, 'init=data');

    expect(signIn).toHaveBeenCalledWith('init=data');
    expect(getCurrent).toHaveBeenCalledTimes(1);
    expect(result.isNewUser).toBe(true);
    expect(result.profile).toMatchObject({
      telegram_id: 1234567,
      first_name: 'Pavel',
      is_premium: false,
    });
    expect(result.profile.created_at).toBe('2026-05-12T12:00:00Z');
  });

  it('always re-fetches the profile (does not trust client-cached data)', async () => {
    const getCurrent = vi.fn().mockResolvedValue(buildProfileRow({ username: 'updated_handle' }));
    const api = buildApi({ getCurrent });

    const result = await loginWithTelegram(api, 'x');

    // The Edge Function may have updated Telegram-side fields (username, photo)
    // — caller MUST see the freshest copy, not whatever the cache had.
    expect(result.profile.username).toBe('updated_handle');
    expect(getCurrent).toHaveBeenCalledTimes(1);
  });

  it('throws ProfileMissingAfterSignIn when the row is gone (backend bug)', async () => {
    const api = buildApi({ getCurrent: vi.fn().mockResolvedValue(null) });

    await expect(loginWithTelegram(api, 'x')).rejects.toBeInstanceOf(ProfileMissingAfterSignIn);
  });

  it('propagates auth errors as-is (caller branches on SignInError.code)', async () => {
    const error = new Error('replayed');
    const api = buildApi({ signInWithTelegram: vi.fn().mockRejectedValue(error) });

    await expect(loginWithTelegram(api, 'x')).rejects.toBe(error);
  });

  it('rejects when the DB row violates the entity schema (e.g. invalid photo_url)', async () => {
    const api = buildApi({
      getCurrent: vi.fn().mockResolvedValue(buildProfileRow({ photo_url: 'not-a-url' })),
    });

    await expect(loginWithTelegram(api, 'x')).rejects.toThrow();
  });
});
