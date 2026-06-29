import { mountMainButton, onMainButtonClick, setMainButtonParams } from '@telegram-apps/sdk-react';
import { useEffect, useRef } from 'react';

interface MainButtonOptions {
  text: string;
  onClick: () => void;
  /** Hide the button entirely (e.g. while a step is invalid). Defaults to shown. */
  isVisible?: boolean;
  /** Dim + block presses without hiding (e.g. form has errors). Defaults to enabled. */
  isEnabled?: boolean;
  /** Show the native spinner inside the button while a mutation runs. */
  isLoaderVisible?: boolean;
}

/**
 * Drives Telegram's native MainButton — the platform's primary CTA — for the
 * lifetime of the calling screen. No-ops when the API is unavailable (dev/browser);
 * screens keep their in-page submit button as the fallback. Mirrors the
 * `isAvailable()` guard pattern of `useTelegramBackButton`.
 */
export const useTelegramMainButton = ({
  text,
  onClick,
  isVisible = true,
  isEnabled = true,
  isLoaderVisible = false,
}: MainButtonOptions): void => {
  // Keep the latest handler in a ref so callers can pass an inline `onClick`
  // without forcing the effect (and the click re-registration) to re-run.
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  useEffect(() => {
    if (mountMainButton.isAvailable()) mountMainButton();
    if (!setMainButtonParams.isAvailable()) return;

    setMainButtonParams({ text, isVisible, isEnabled, isLoaderVisible });

    const off: VoidFunction | undefined = onMainButtonClick.isAvailable()
      ? onMainButtonClick(() => onClickRef.current())
      : undefined;

    return () => {
      off?.();
      // Hide on unmount so the button never bleeds into the next screen.
      if (setMainButtonParams.isAvailable()) setMainButtonParams({ isVisible: false });
    };
  }, [text, isVisible, isEnabled, isLoaderVisible]);
};
