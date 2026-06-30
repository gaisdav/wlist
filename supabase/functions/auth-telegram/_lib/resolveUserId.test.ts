import { describe, expect, it, vi } from 'vitest';

import { resolveUserId, type ResolveUserIdPort } from './resolveUserId.ts';

const EMAIL = 'tg-42@wlist-tg.local';
const TG_ID = 42;

const makePort = (overrides: Partial<ResolveUserIdPort> = {}): ResolveUserIdPort => ({
  createUser: vi.fn().mockResolvedValue({ ok: true, id: 'new-user-id' }),
  findProfileIdByTelegramId: vi.fn().mockResolvedValue({ ok: true, id: null }),
  ...overrides,
});

describe('resolveUserId', () => {
  it('new user: returns the id from createUser, isNewUser true', async () => {
    const port = makePort({
      createUser: vi.fn().mockResolvedValue({ ok: true, id: 'new-user-id' }),
    });

    const result = await resolveUserId(port, EMAIL, TG_ID);

    expect(result).toEqual({ ok: true, userId: 'new-user-id', isNewUser: true });
    // Never falls through to the profile lookup for a fresh user.
    expect(port.findProfileIdByTelegramId).not.toHaveBeenCalled();
  });

  it('existing user with profile: resolves id by telegram_id, isNewUser false', async () => {
    const port = makePort({
      createUser: vi.fn().mockResolvedValue({ ok: true, alreadyExists: true }),
      findProfileIdByTelegramId: vi.fn().mockResolvedValue({ ok: true, id: 'existing-id' }),
    });

    const result = await resolveUserId(port, EMAIL, TG_ID);

    expect(result).toEqual({ ok: true, userId: 'existing-id', isNewUser: false });
    expect(port.findProfileIdByTelegramId).toHaveBeenCalledWith(TG_ID);
  });

  it('createUser failure surfaces as create_failed', async () => {
    const port = makePort({
      createUser: vi.fn().mockResolvedValue({ ok: false, error: new Error('boom') }),
    });

    const result = await resolveUserId(port, EMAIL, TG_ID);

    expect(result).toEqual({ ok: false, reason: 'create_failed' });
  });

  it('profile lookup failure surfaces as profile_lookup_failed', async () => {
    const port = makePort({
      createUser: vi.fn().mockResolvedValue({ ok: true, alreadyExists: true }),
      findProfileIdByTelegramId: vi.fn().mockResolvedValue({ ok: false, error: new Error('db') }),
    });

    const result = await resolveUserId(port, EMAIL, TG_ID);

    expect(result).toEqual({ ok: false, reason: 'profile_lookup_failed' });
  });

  it('existing user with no profile row surfaces as not_found', async () => {
    const port = makePort({
      createUser: vi.fn().mockResolvedValue({ ok: true, alreadyExists: true }),
      findProfileIdByTelegramId: vi.fn().mockResolvedValue({ ok: true, id: null }),
    });

    const result = await resolveUserId(port, EMAIL, TG_ID);

    expect(result).toEqual({ ok: false, reason: 'not_found' });
  });
});
