import { isWishCurrencyCode, type WishCurrencyCode } from './wishConstraints.js';

/** Browser storage for "last picked wish currency" (TMA / future web). */
export const LAST_WISH_CURRENCY_STORAGE_KEY = 'wlist:lastWishCurrency';

const defaultCode = (): WishCurrencyCode => 'USD';

/**
 * Returns last persisted supported code, or USD. Safe outside browser / when storage is blocked.
 */
export const readLastWishCurrency = (): WishCurrencyCode => {
  if (typeof globalThis === 'undefined' || typeof globalThis.localStorage === 'undefined') {
    return defaultCode();
  }
  try {
    const raw = globalThis.localStorage.getItem(LAST_WISH_CURRENCY_STORAGE_KEY);
    if (raw && isWishCurrencyCode(raw)) return raw;
  } catch {
    // private mode / quota
  }
  return defaultCode();
};

export const persistLastWishCurrency = (code: string): void => {
  if (!isWishCurrencyCode(code)) return;
  if (typeof globalThis === 'undefined' || typeof globalThis.localStorage === 'undefined') return;
  try {
    globalThis.localStorage.setItem(LAST_WISH_CURRENCY_STORAGE_KEY, code);
  } catch {
    // ignore
  }
};
