import { describe, expect, it } from 'vitest';

import { wishSchema } from './wish.js';

describe('wishSchema', () => {
  it('accepts a valid row and keeps snake_case keys', () => {
    const row = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      owner_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Book',
      description: null,
      price: 12.5,
      currency: 'EUR',
      link: null,
      photo_storage_path: null,
      is_archived: false,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    };
    const w = wishSchema.parse(row);
    expect(w.owner_id).toBe(row.owner_id);
    expect(w.currency).toBe('EUR');
    expect(w.is_archived).toBe(false);
  });
});
