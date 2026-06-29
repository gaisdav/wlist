import { openPopup } from '@telegram-apps/sdk-react';

interface ConfirmOptions {
  title?: string;
  message: string;
  /** Label for the confirming button (e.g. "Delete"). */
  confirmLabel: string;
  /** Tints the confirm button as destructive in the native popup. */
  destructive?: boolean;
}

const CONFIRM_ID = 'confirm';

/**
 * Native Telegram confirmation popup, resolving to whether the user confirmed.
 * Falls back to `window.confirm` outside Telegram (dev/browser) so flows keep
 * working. Replaces raw `window.confirm`, which renders a non-native dialog.
 */
export const confirm = async ({
  title,
  message,
  confirmLabel,
  destructive,
}: ConfirmOptions): Promise<boolean> => {
  if (openPopup.isAvailable()) {
    const pressedId = await openPopup({
      title,
      message,
      buttons: [
        { id: CONFIRM_ID, type: destructive ? 'destructive' : 'default', text: confirmLabel },
        { type: 'cancel' },
      ],
    });
    return pressedId === CONFIRM_ID;
  }

  return window.confirm(title ? `${title}\n\n${message}` : message);
};
