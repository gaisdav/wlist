import {
  init,
  miniApp,
  retrieveLaunchParams,
  swipeBehavior,
  themeParams,
} from '@telegram-apps/sdk-react';
import { type PropsWithChildren, useEffect, useState } from 'react';

interface TelegramState {
  ready: boolean;
  /** True when running outside Telegram (dev fallback). */
  isMockEnv: boolean;
  error?: string;
}

/**
 * Initializes the Telegram Mini App SDK once and renders children when ready.
 * In a browser tab (no Telegram WebApp present) we still render — handy for
 * local dev — and flag `isMockEnv` so callers can skip Telegram-only flows.
 */
export const TelegramProvider = ({ children }: PropsWithChildren): React.JSX.Element => {
  const [state, setState] = useState<TelegramState>({ ready: false, isMockEnv: false });

  useEffect(() => {
    const setup = async (): Promise<void> => {
      try {
        await init();

        retrieveLaunchParams();
        if (miniApp.mountSync.isAvailable()) miniApp.mountSync();
        if (themeParams.mountSync.isAvailable()) themeParams.mountSync();
        if (themeParams.bindCssVars.isAvailable()) themeParams.bindCssVars();
        if (miniApp.bindCssVars.isAvailable()) miniApp.bindCssVars();
        if (swipeBehavior.disableVertical.isAvailable()) {
          swipeBehavior.disableVertical();
        }
        setState({ ready: true, isMockEnv: false });
      } catch (err) {
        setState({
          ready: true,
          isMockEnv: true,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    };
    void setup();
  }, []);

  if (!state.ready) return <div className="p-4 text-muted">Loading…</div>;
  return <>{children}</>;
};
