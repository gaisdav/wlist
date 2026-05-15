import { describe, expect, it } from 'vitest';

import { getWishReservationSummary, wishEffectiveSlotCap } from './wishReservationSummary.js';

describe('wishEffectiveSlotCap', () => {
  it('returns 1 for ordinary wishes', () => {
    expect(wishEffectiveSlotCap({ is_collaborative: false, max_slots: 10 })).toBe(1);
  });

  it('returns coalesced cap for group gifts', () => {
    expect(wishEffectiveSlotCap({ is_collaborative: true, max_slots: 5 })).toBe(5);
    expect(wishEffectiveSlotCap({ is_collaborative: true, max_slots: null })).toBe(50);
  });
});

describe('getWishReservationSummary', () => {
  const ordinaryWish = {
    is_collaborative: false,
    max_slots: null,
    is_archived: false,
  };

  const groupWish = {
    is_collaborative: true,
    max_slots: 5,
    is_archived: false,
  };

  it('ordinary wish: not reserved', () => {
    const s = getWishReservationSummary([], ordinaryWish, 'viewer-a');
    expect(s.isReserved).toBe(false);
    expect(s.canReserve).toBe(true);
    expect(s.cap).toBe(1);
  });

  it('ordinary wish: reserved by someone else', () => {
    const s = getWishReservationSummary(
      [{ status: 'active', booked_by: 'other' }],
      ordinaryWish,
      'viewer-a',
    );
    expect(s.isReserved).toBe(true);
    expect(s.isReservedByMe).toBe(false);
    expect(s.canReserve).toBe(false);
  });

  it('ordinary wish: reserved by me', () => {
    const s = getWishReservationSummary(
      [{ status: 'active', booked_by: 'viewer-a' }],
      ordinaryWish,
      'viewer-a',
    );
    expect(s.isReservedByMe).toBe(true);
    expect(s.canReserve).toBe(false);
  });

  it('group gift: partial fill', () => {
    const s = getWishReservationSummary(
      [
        { status: 'active', booked_by: 'u1' },
        { status: 'active', booked_by: 'u1' },
        { status: 'cancelled', booked_by: 'u2' },
      ],
      groupWish,
      'viewer-a',
    );
    expect(s.activeCount).toBe(2);
    expect(s.cap).toBe(5);
    expect(s.remaining).toBe(3);
    expect(s.canReserve).toBe(true);
  });

  it('archived wish cannot reserve', () => {
    const s = getWishReservationSummary([], { ...ordinaryWish, is_archived: true }, 'v');
    expect(s.canReserve).toBe(false);
  });
});
