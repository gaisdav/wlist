import type { SupportedLanguage } from '@wlist/core/i18n';

/**
 * Maps a raw language code (as reported by Telegram, e.g. `'ru'`, `'ru-RU'`,
 * `'en-US'`) to one of our bundled languages. Case-insensitive; only the
 * primary subtag (before any `-`) is considered.
 *
 * Unknown/unsupported codes — including `null`/`undefined` (no Telegram
 * launch params, or the user hasn't set a language) — fall back to `'en'`.
 *
 * Adding a third bundled language later means adding one more entry to
 * `mapping`, nothing else.
 */
const mapping: Record<string, SupportedLanguage> = {
  ru: 'ru',
};

export const resolveAppLanguage = (
  telegramLanguageCode: string | null | undefined,
): SupportedLanguage => {
  if (!telegramLanguageCode) return 'en';
  const primarySubtag = telegramLanguageCode.trim().toLowerCase().split('-')[0] ?? '';
  return mapping[primarySubtag] ?? 'en';
};
