import { describe, expect, it } from 'vitest';

import { defaultWishDraftFormValues, wishDraftSchema } from './wishDraft.js';

describe('wishDraftSchema', () => {
  it('allows empty price with empty currency and outputs nulls', () => {
    const out = wishDraftSchema.parse({
      ...defaultWishDraftFormValues(),
      title: 'Gift',
      description: '',
      priceStr: '  ',
      currency: '',
      linkStr: '',
    });
    expect(out.price).toBeNull();
    expect(out.currency).toBeNull();
  });

  it('requires a supported currency when price is set', () => {
    expect(() =>
      wishDraftSchema.parse({
        ...defaultWishDraftFormValues(),
        title: 'Gift',
        description: '',
        priceStr: '10',
        currency: '',
        linkStr: '',
      }),
    ).toThrow();

    const out = wishDraftSchema.parse({
      ...defaultWishDraftFormValues(),
      title: 'Gift',
      description: '',
      priceStr: '10',
      currency: 'EUR',
      linkStr: '',
    });
    expect(out.price).toBe(10);
    expect(out.currency).toBe('EUR');
  });

  it('rejects currency without price', () => {
    expect(() =>
      wishDraftSchema.parse({
        ...defaultWishDraftFormValues(),
        title: 'Gift',
        description: '',
        priceStr: '',
        currency: 'USD',
        linkStr: '',
      }),
    ).toThrow();
  });
});
