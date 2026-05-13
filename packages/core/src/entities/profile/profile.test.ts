import { describe, expect, it } from 'vitest';

import { getDisplayName, profileSchema } from './profile';

describe('getDisplayName', () => {
  it('prefers @username when present and non-empty', () => {
    expect(getDisplayName({ username: 'durov', first_name: 'Pavel', telegram_id: 1 })).toBe(
      '@durov',
    );
  });

  it('falls back to first_name when username is null', () => {
    expect(getDisplayName({ username: null, first_name: 'Pavel', telegram_id: 1 })).toBe('Pavel');
  });

  it('falls back to first_name when username is empty string', () => {
    expect(getDisplayName({ username: '', first_name: 'Pavel', telegram_id: 1 })).toBe('Pavel');
  });

  it('falls back to user_<telegram_id> when both username and first_name are missing', () => {
    expect(getDisplayName({ username: null, first_name: '', telegram_id: 42 })).toBe('user_42');
  });
});

describe('profileSchema', () => {
  const dbRow = {
    id: '11111111-1111-1111-1111-111111111111',
    telegram_id: 1234567,
    username: 'durov',
    first_name: 'Pavel',
    last_name: 'Durov',
    photo_url: 'https://t.me/i/userpic/320/durov.jpg',
    language_code: 'en',
    is_premium: true,
    created_at: '2026-05-12T12:00:00Z',
    updated_at: '2026-05-12T12:00:00Z',
  };

  it('parses a row and keeps snake_case keys and ISO timestamps', () => {
    const profile = profileSchema.parse(dbRow);

    expect(profile).toMatchObject({
      id: dbRow.id,
      telegram_id: 1234567,
      username: 'durov',
      first_name: 'Pavel',
      last_name: 'Durov',
      photo_url: dbRow.photo_url,
      language_code: 'en',
      is_premium: true,
      created_at: dbRow.created_at,
      updated_at: dbRow.updated_at,
    });
  });

  it('accepts null for optional fields', () => {
    const profile = profileSchema.parse({
      ...dbRow,
      username: null,
      last_name: null,
      photo_url: null,
      language_code: null,
    });

    expect(profile.username).toBeNull();
    expect(profile.last_name).toBeNull();
    expect(profile.photo_url).toBeNull();
    expect(profile.language_code).toBeNull();
  });

  it('rejects a non-URL photo_url', () => {
    expect(() => profileSchema.parse({ ...dbRow, photo_url: 'not-a-url' })).toThrow();
  });
});
