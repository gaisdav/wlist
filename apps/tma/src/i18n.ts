import { retrieveLaunchParams } from '@telegram-apps/sdk-react';
import { defaultNS, resources } from '@wlist/core/i18n';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resolveAppLanguage } from './lib/resolveAppLanguage';

/**
 * Reads the Telegram user's `language_code` from launch params, synchronously,
 * at startup. Throws outside Telegram (regular browser tab during local dev),
 * same as `safeReadInitData` in `auth/useAuthBootstrap.ts` — caught here so
 * app boot never depends on running inside Telegram.
 */
const readTelegramLanguageCode = (): string | null => {
  try {
    return retrieveLaunchParams(true).tgWebAppData?.user?.languageCode ?? null;
  } catch {
    return null;
  }
};

void i18n.use(initReactI18next).init({
  resources,
  defaultNS,
  ns: ['common'],
  fallbackLng: 'en',
  lng: resolveAppLanguage(readTelegramLanguageCode()),
  interpolation: { escapeValue: false },
  returnNull: false,
});

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});
// `languageChanged` fires for subsequent changes (e.g. the optional profile
// re-sync in `useAuthBootstrap`), but not reliably for the language set
// during `init()` itself — set it explicitly once for the very first paint.
document.documentElement.lang = i18n.language;

export { i18n };
