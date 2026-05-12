import { describe, expect, it } from 'vitest';

import { getDisplayName, profileSchema } from './profile';

describe('getDisplayName', () => {
  it('prefers @username when present and non-empty', () => {
    expect(getDisplayName({ username: 'durov', firstName: 'Pavel', telegramId: 1 })).toBe('@durov');
  });

  it('falls back to first_name when username is null', () => {
    expect(getDisplayName({ username: null, firstName: 'Pavel', telegramId: 1 })).toBe('Pavel');
  });

  it('falls back to first_name when username is empty string', () => {
    expect(getDisplayName({ username: '', firstName: 'Pavel', telegramId: 1 })).toBe('Pavel');
  });

  it('falls back to user_<telegramId> when both username and first_name are missing', () => {
    expect(getDisplayName({ username: null, firstName: '', telegramId: 42 })).toBe('user_42');
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

  it('maps snake_case → camelCase and parses dates', () => {
    const profile = profileSchema.parse(dbRow);

    expect(profile).toMatchObject({
      id: dbRow.id,
      telegramId: 1234567,
      username: 'durov',
      firstName: 'Pavel',
      lastName: 'Durov',
      photoUrl: dbRow.photo_url,
      languageCode: 'en',
      isPremium: true,
    });
    expect(profile.createdAt).toBeInstanceOf(Date);
    expect(profile.updatedAt).toBeInstanceOf(Date);
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
    expect(profile.lastName).toBeNull();
    expect(profile.photoUrl).toBeNull();
    expect(profile.languageCode).toBeNull();
  });

  it('rejects a non-URL photo_url', () => {
    expect(() => profileSchema.parse({ ...dbRow, photo_url: 'not-a-url' })).toThrow();
  });
});
