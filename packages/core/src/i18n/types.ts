// Type-augmentation for react-i18next: makes `t('key')` strictly typed against
// the bundled `en` resources (the default fallback). Other languages must mirror
// the EN shape — runtime checked by the JSON files themselves.
//
// Apps must trigger the augmentation by adding /// <reference types="@wlist/core/i18n/types" />
// in their global d.ts (see apps/tma/src/env.d.ts).
import type {} from 'i18next';

import type { defaultNS, resources } from './resources.js';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)['en'];
    returnNull: false;
  }
}

export {};
