import {
  mountSecondaryButton,
  onSecondaryButtonClick,
  setSecondaryButtonParams,
} from '@telegram-apps/sdk-react';
import { useEffect, useRef, useState } from 'react';

type SecondaryButtonPosition = 'left' | 'right' | 'top' | 'bottom';

interface SecondaryButtonOptions {
  text: string;
  onClick: () => void;
  /** Placement relative to the MainButton. Defaults to 'left'. */
  position?: SecondaryButtonPosition;
  /** Hide the button entirely. Defaults to shown. */
  isVisible?: boolean;
  /** Dim + block presses without hiding. Defaults to enabled. */
  isEnabled?: boolean;
  /** Show the native spinner inside the button. */
  isLoaderVisible?: boolean;
}

/**
 * Drives Telegram's native SecondaryButton — the companion CTA beside the
 * MainButton — for the lifetime of the calling screen. No-ops when the API is
 * unavailable (dev/browser); screens keep an in-page button as the fallback.
 * Mirrors `useTelegramMainButton` (ref-stashed handler, hide-on-unmount).
 */
export const useTelegramSecondaryButton = ({
  text,
  onClick,
  position = 'left',
  isVisible = true,
  isEnabled = true,
  isLoaderVisible = false,
}: SecondaryButtonOptions): boolean => {
  // Keep the latest handler in a ref so an inline `onClick` doesn't force the
  // effect (and click re-registration) to re-run every render.
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  // Whether the native SecondaryButton is actually driving the CTA. Callers use
  // this to hide their in-page button inside Telegram (and keep it in browsers).
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (mountSecondaryButton.isAvailable()) mountSecondaryButton();
    if (!setSecondaryButtonParams.isAvailable()) {
      setIsActive(false);
      return;
    }
    setIsActive(true);

    setSecondaryButtonParams({ text, position, isVisible, isEnabled, isLoaderVisible });

    const off: VoidFunction | undefined = onSecondaryButtonClick.isAvailable()
      ? onSecondaryButtonClick(() => onClickRef.current())
      : undefined;

    return () => {
      off?.();
      // Hide on unmount so the button never bleeds into the next screen.
      if (setSecondaryButtonParams.isAvailable()) setSecondaryButtonParams({ isVisible: false });
    };
  }, [text, position, isVisible, isEnabled, isLoaderVisible]);

  return isActive;
};
