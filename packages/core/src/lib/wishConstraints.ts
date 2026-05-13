/**
 * Wish list field limits and allowed currencies (Stage 02).
 *
 * Values MUST stay in sync with:
 *   - `supabase/migrations/*wishes*.sql` CHECK constraints on `wishes`
 *   - `plans/02-mvp-wishlist-crud.md`
 */
export const WISH_TITLE_MAX_CHARS = 200;
export const WISH_DESCRIPTION_MAX_CHARS = 1000;
/** Plain-text preview length on list cards (full text on detail, up to max). */
export const WISH_DESCRIPTION_LIST_PREVIEW_CHARS = 160;

export type WishCurrencyCode =
  | 'USD'
  | 'EUR'
  | 'RUB'
  | 'KZT'
  | 'GBP'
  | 'CHF'
  | 'PLN'
  | 'UAH'
  | 'TRY'
  | 'JPY';

export interface WishCurrencyOption {
  code: WishCurrencyCode;
  /** English label for MVP select (i18n keys can map code later). */
  label: string;
}

/** Order matches product preference: major + regional + rest. */
export const SUPPORTED_WISH_CURRENCIES: readonly WishCurrencyOption[] = [
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'RUB', label: 'Russian Ruble (RUB)' },
  { code: 'KZT', label: 'Kazakhstani Tenge (KZT)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'CHF', label: 'Swiss Franc (CHF)' },
  { code: 'PLN', label: 'Polish Złoty (PLN)' },
  { code: 'UAH', label: 'Ukrainian Hryvnia (UAH)' },
  { code: 'TRY', label: 'Turkish Lira (TRY)' },
  { code: 'JPY', label: 'Japanese Yen (JPY)' },
] as const;

const SUPPORTED_CODES = new Set(SUPPORTED_WISH_CURRENCIES.map((c) => c.code));

export const isWishCurrencyCode = (value: string): value is WishCurrencyCode =>
  SUPPORTED_CODES.has(value as WishCurrencyCode);

/**
 * Truncate description for list cards; does not append ellipsis if shorter.
 */
export const truncateWishDescriptionForList = (
  description: string | null | undefined,
  maxChars: number = WISH_DESCRIPTION_LIST_PREVIEW_CHARS,
): string => {
  const s = (description ?? '').trim();
  if (s.length <= maxChars) return s;
  return `${s.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
};
