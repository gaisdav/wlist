import {
  hideBackButton,
  mountBackButton,
  onBackButtonClick,
  showBackButton,
} from '@telegram-apps/sdk-react';
import { useEffect } from 'react';

/**
 * Shows Telegram BackButton and routes presses to `handler`. No-ops when unsupported.
 */
export const useTelegramBackButton = (handler: () => void, enabled = true): void => {
  useEffect(() => {
    if (!enabled) return;
    if (mountBackButton.isAvailable()) mountBackButton();
    if (!showBackButton.isAvailable()) return;
    showBackButton();
    if (!onBackButtonClick.isAvailable()) {
      return () => {
        if (hideBackButton.isAvailable()) hideBackButton();
      };
    }
    const off = onBackButtonClick(handler);
    return () => {
      off();
      if (hideBackButton.isAvailable()) hideBackButton();
    };
  }, [enabled, handler]);
};
