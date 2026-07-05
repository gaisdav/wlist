import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { queryKeys } from '../config/index.js';

import { patchWishLikesCount } from './patchWishInCaches.js';

const makeWish = (id: string, likes_count: number): Record<string, unknown> => ({
  id,
  likes_count,
});

describe('patchWishLikesCount', () => {
  it('patches a matching wish inside an array cache entry (byOwner/byIds)', () => {
    const qc = new QueryClient();
    qc.setQueryData(queryKeys.wishes.byOwner('owner-1'), [makeWish('a', 2), makeWish('b', 5)]);

    patchWishLikesCount(qc, 'a', 1);

    expect(qc.getQueryData(queryKeys.wishes.byOwner('owner-1'))).toEqual([
      makeWish('a', 3),
      makeWish('b', 5),
    ]);
  });

  it('patches a single-object cache entry (wishes.one)', () => {
    const qc = new QueryClient();
    qc.setQueryData(queryKeys.wishes.one('a'), makeWish('a', 2));

    patchWishLikesCount(qc, 'a', 1);

    expect(qc.getQueryData(queryKeys.wishes.one('a'))).toEqual(makeWish('a', 3));
  });

  it('leaves unrelated wishes untouched', () => {
    const qc = new QueryClient();
    qc.setQueryData(queryKeys.wishes.one('b'), makeWish('b', 5));

    patchWishLikesCount(qc, 'a', 1);

    expect(qc.getQueryData(queryKeys.wishes.one('b'))).toEqual(makeWish('b', 5));
  });

  it('patches a nested wish inside feed.infinite() pages', () => {
    const qc = new QueryClient();
    qc.setQueryData(queryKeys.feed.infinite(), {
      pages: [
        [
          { id: 'evt-1', wish: makeWish('a', 2) },
          { id: 'evt-2', wish: makeWish('b', 1) },
        ],
        [{ id: 'evt-3', wish: null }],
      ],
      pageParams: [0, 20],
    });

    patchWishLikesCount(qc, 'a', 1);

    expect(qc.getQueryData(queryKeys.feed.infinite())).toEqual({
      pages: [
        [
          { id: 'evt-1', wish: makeWish('a', 3) },
          { id: 'evt-2', wish: makeWish('b', 1) },
        ],
        [{ id: 'evt-3', wish: null }],
      ],
      pageParams: [0, 20],
    });
  });

  it('clamps likes_count at 0', () => {
    const qc = new QueryClient();
    qc.setQueryData(queryKeys.wishes.one('a'), makeWish('a', 0));

    patchWishLikesCount(qc, 'a', -1);

    expect(qc.getQueryData(queryKeys.wishes.one('a'))).toEqual(makeWish('a', 0));
  });
});
