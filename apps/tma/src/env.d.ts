/// <reference types="vite/client" />
/// <reference types="@wlist/core/i18n/types" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_APP_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Telegram WebApp injected globally via telegram-web-app.js in index.html.
declare global {
  interface Window {
    Telegram?: {
      WebApp?: unknown;
    };
  }
}

export {};
