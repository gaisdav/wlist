// Bundled translation resources. Shape consumed by `i18next.init({ resources })`
// in apps/tma/src/i18n.ts. New languages are registered here, no other code changes.
import enCommon from './locales/en/common.json' with { type: 'json' };

export const defaultNS = 'common' as const;

export const resources = {
  en: {
    common: enCommon,
  },
} as const;

export type Resources = typeof resources;
export type SupportedLanguage = keyof Resources;
