/**
 * Format a wish price amount for display. Returns only the localized number
 * string — the currency suffix / i18n key choice stays in the UI layer
 * (`wishes.card.price` vs `price_no_currency`), since `core` does not own copy.
 */
export const formatWishAmount = (price: number, locale?: string): string =>
  price.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
