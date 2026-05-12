import { defaultNS, resources } from '@wlist/core/i18n';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

void i18n.use(initReactI18next).init({
  resources,
  defaultNS,
  ns: ['common'],
  fallbackLng: 'en',
  lng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export { i18n };
