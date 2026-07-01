import {
  disableClosingConfirmation,
  enableClosingConfirmation,
  mountClosingBehavior,
} from '@telegram-apps/sdk-react';
import { useEffect } from 'react';

/**
 * Asks Telegram to confirm closing the Mini App while `active` is true — e.g.
 * when a form has unsaved changes — so a swipe-down doesn't silently discard
 * input. No-ops when the API is unavailable (dev/browser); disables on unmount
 * so the flag never leaks into the next screen. Mirrors the `isAvailable()`
 * guard pattern of the other telegram helpers.
 */
export const useClosingConfirmation = (active: boolean): void => {
  useEffect(() => {
    if (mountClosingBehavior.isAvailable()) mountClosingBehavior();
    if (!enableClosingConfirmation.isAvailable()) return;

    if (active) {
      enableClosingConfirmation();
    } else if (disableClosingConfirmation.isAvailable()) {
      disableClosingConfirmation();
    }

    return () => {
      if (disableClosingConfirmation.isAvailable()) disableClosingConfirmation();
    };
  }, [active]);
};
