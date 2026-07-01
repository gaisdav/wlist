import { shareURL } from '@telegram-apps/sdk-react';

import { type DeepLinkTarget, encodeStartParam, targetToRoute } from './deepLink';

const APP_URL = import.meta.env.VITE_PUBLIC_APP_URL;
const BOT_USERNAME = import.meta.env.VITE_PUBLIC_BOT_USERNAME;

/**
 * Builds the shareable link for a target. Prefers a bot deep link
 * (`t.me/<bot>?startapp=<payload>`) so recipients land back inside the Mini App;
 * falls back to the raw app URL when no bot username is configured.
 */
export const buildShareUrl = (target: DeepLinkTarget): string => {
  if (BOT_USERNAME) {
    const param = encodeStartParam(target);
    return `https://t.me/${BOT_USERNAME}?startapp=${param}`;
  }
  return new URL(targetToRoute(target), APP_URL).toString();
};

interface ShareOptions {
  target: DeepLinkTarget;
  /** Message shown alongside the link in the share sheet. */
  text: string;
}

/**
 * Opens Telegram's native "share to a chat" sheet for a deep link. Outside
 * Telegram (dev/browser) it falls back to the Web Share API, then to copying the
 * link to the clipboard — so the action never silently does nothing. Mirrors the
 * `isAvailable()` guard + fallback pattern of `confirm.ts` / `haptics.ts`.
 */
export const share = async ({ target, text }: ShareOptions): Promise<void> => {
  const url = buildShareUrl(target);

  if (shareURL.isAvailable()) {
    shareURL(url, text);
    return;
  }
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text, url });
      return;
    } catch {
      // User dismissed the sheet or it's unsupported — fall through to copy.
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(`${text} ${url}`);
  }
};
