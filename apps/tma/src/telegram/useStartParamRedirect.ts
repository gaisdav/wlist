import { retrieveLaunchParams } from '@telegram-apps/sdk-react';
import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

import { startParamToRoute } from './deepLink';

/**
 * On launch, reads Telegram's `startapp` deep-link payload and redirects to the
 * matching in-app route — so a shared `t.me/<bot>?startapp=wish__<id>` opens the
 * wish, not the default screen.
 *
 * Runs once per mount (ref guard) and only when we're at the app's entry route,
 * so it never fights with in-app navigation the user has already performed.
 * No-ops outside Telegram (launch params throw → caught) and on an
 * empty/unknown payload.
 */
export const useStartParamRedirect = (): void => {
  const [location, setLocation] = useLocation();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    // Only act from the entry route. If the user already deep-navigated (or
    // wouter restored a path), don't yank them back to a shared target.
    if (location !== '/' && location !== '/me') return;

    let startParam: string | undefined;
    try {
      startParam = retrieveLaunchParams(true).tgWebAppStartParam;
    } catch {
      // Outside Telegram — no launch params.
      return;
    }

    const route = startParamToRoute(startParam);
    if (route && route !== location) setLocation(route, { replace: true });
  }, [location, setLocation]);
};
