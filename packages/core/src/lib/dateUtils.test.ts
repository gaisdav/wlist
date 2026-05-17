import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  formatDate,
  formatRelativeTime,
  isValidDateString,
  calculateDaysLeft,
} from './dateUtils.js';

describe('isValidDateString', () => {
  it('accepts ISO timestamps', () => {
    expect(isValidDateString('2026-05-15T14:30:00.000Z')).toBe(true);
  });

  it('rejects invalid strings', () => {
    expect(isValidDateString('not-a-date')).toBe(false);
  });
});

describe('formatDate', () => {
  it('returns original string when invalid', () => {
    expect(formatDate('bad', 'short')).toBe('bad');
  });

  it('formats short date in en locale', () => {
    const out = formatDate('2026-05-15T12:00:00.000Z', 'short', { locale: 'en' });
    expect(out).toMatch(/May/);
    expect(out).toMatch(/2026/);
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T15:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns Just now for sub-second diff', () => {
    expect(formatRelativeTime('2026-05-15T14:59:59.500Z')).toBe('Just now');
  });

  it('returns minutes ago within the hour', () => {
    expect(formatRelativeTime('2026-05-15T14:30:00.000Z')).toMatch(/min/);
  });

  it('falls back to formatted date when older than 31 days', () => {
    const out = formatRelativeTime('2026-01-01T12:00:00.000Z', { fallbackFormat: 'dayMonthYear' });
    expect(out).toMatch(/Jan/);
    expect(out).toMatch(/2026/);
  });

  it('returns em dash for invalid input', () => {
    expect(formatRelativeTime('invalid')).toBe('—');
  });
});

describe('calculateDaysLeft', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-18T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when date is empty or invalid', () => {
    expect(calculateDaysLeft(null, false)).toBeNull();
    expect(calculateDaysLeft('', false)).toBeNull();
    expect(calculateDaysLeft('not-a-date', false)).toBeNull();
  });

  it('calculates days left for non-recurring future event', () => {
    expect(calculateDaysLeft('2026-05-20', false)).toBe(2);
  });

  it('calculates days left for non-recurring past event', () => {
    expect(calculateDaysLeft('2026-05-10', false)).toBe(-8);
  });

  it('calculates days left for recurring event later this year', () => {
    const days = calculateDaysLeft('1990-12-31', true);
    expect(days).toBeGreaterThan(0);
  });

  it('calculates days left for recurring event earlier this year', () => {
    const days = calculateDaysLeft('1990-01-10', true);
    expect(days).toBeGreaterThan(200);
  });
});
