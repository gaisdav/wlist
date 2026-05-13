import { describe, expect, it } from 'vitest';

import {
  truncateWishDescriptionForList,
  WISH_DESCRIPTION_LIST_PREVIEW_CHARS,
} from './wishConstraints.js';

describe('truncateWishDescriptionForList', () => {
  it('returns empty for null/undefined/blank', () => {
    expect(truncateWishDescriptionForList(null)).toBe('');
    expect(truncateWishDescriptionForList(undefined)).toBe('');
    expect(truncateWishDescriptionForList('   ')).toBe('');
  });

  it('returns full string when under limit', () => {
    const s = 'a'.repeat(50);
    expect(truncateWishDescriptionForList(s, 100)).toBe(s);
  });

  it('truncates with ellipsis when over limit', () => {
    const s = 'a'.repeat(WISH_DESCRIPTION_LIST_PREVIEW_CHARS + 10);
    const out = truncateWishDescriptionForList(s);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(WISH_DESCRIPTION_LIST_PREVIEW_CHARS);
  });
});
