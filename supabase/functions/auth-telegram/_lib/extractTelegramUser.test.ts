import { describe, expect, it } from 'vitest';

import { extractTelegramUser, sha256Hex } from './extractTelegramUser';

const params = (entries: Record<string, string>): ReadonlyMap<string, string> =>
  new Map(Object.entries(entries));

const userField = (u: object) => params({ user: JSON.stringify(u) });

describe('extractTelegramUser', () => {
  it('extracts the minimum required fields', () => {
    const result = extractTelegramUser(userField({ id: 1234, first_name: 'Pavel' }));

    expect(result).toEqual({
      ok: true,
      user: { id: 1234, first_name: 'Pavel' },
    });
  });

  it('extracts all optional fields when present', () => {
    const result = extractTelegramUser(
      userField({
        id: 1234,
        first_name: 'Pavel',
        last_name: 'Durov',
        username: 'durov',
        language_code: 'en',
        is_premium: true,
        photo_url: 'https://t.me/i/userpic/320/durov.jpg',
      }),
    );

    expect(result).toEqual({
      ok: true,
      user: {
        id: 1234,
        first_name: 'Pavel',
        last_name: 'Durov',
        username: 'durov',
        language_code: 'en',
        is_premium: true,
        photo_url: 'https://t.me/i/userpic/320/durov.jpg',
      },
    });
  });

  it('drops empty-string optional fields rather than passing them through', () => {
    const result = extractTelegramUser(
      userField({ id: 1234, first_name: 'Pavel', username: '', last_name: '' }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.username).toBeUndefined();
      expect(result.user.last_name).toBeUndefined();
    }
  });

  it('rejects when the user field is missing entirely', () => {
    expect(extractTelegramUser(params({ auth_date: '1' }))).toEqual({
      ok: false,
      reason: 'missing_user_field',
    });
  });

  it('rejects when the user field is not valid JSON', () => {
    expect(extractTelegramUser(params({ user: '{not json' }))).toEqual({
      ok: false,
      reason: 'malformed_user_json',
    });
  });

  it.each([
    ['null', 'null'],
    ['array', '[1,2,3]'],
    ['string', '"just a string"'],
    ['number', '42'],
  ])('rejects when the user field is %s instead of an object', (_label, raw) => {
    const result = extractTelegramUser(params({ user: raw }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(['invalid_user_shape', 'malformed_user_json']).toContain(result.reason);
    }
  });

  it.each([
    ['missing id', { first_name: 'Pavel' }],
    ['id is string', { id: '1234', first_name: 'Pavel' }],
    ['id is zero', { id: 0, first_name: 'Pavel' }],
    ['id is negative', { id: -1, first_name: 'Pavel' }],
    ['missing first_name', { id: 1234 }],
    ['empty first_name', { id: 1234, first_name: '' }],
  ])('rejects invalid required fields: %s', (_label, user) => {
    const result = extractTelegramUser(userField(user));
    expect(result).toEqual({ ok: false, reason: 'invalid_user_shape' });
  });
});

describe('sha256Hex', () => {
  it('returns 64 hex chars and is deterministic', async () => {
    const a = await sha256Hex('hello');
    const b = await sha256Hex('hello');

    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    // Known SHA-256 of "hello"
    expect(a).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('produces different hashes for different inputs', async () => {
    expect(await sha256Hex('hello')).not.toBe(await sha256Hex('hello!'));
  });
});
