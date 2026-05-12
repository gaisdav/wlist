import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@wlist/core/config';
import { routes } from '@wlist/core/routes';
import { useTranslation } from 'react-i18next';

import { useApiClient } from './providers/ApiClientProvider';

/**
 * Hello World screen — proves the full wiring works:
 * - i18n (react-i18next + @wlist/core/i18n)
 * - ApiClient DI (`useApiClient`)
 * - TanStack Query (queryKeys factory from core)
 * - Tailwind v4 + Telegram theme variables (semantic colors)
 * - Declarative routes table from core
 */
export const App = (): React.JSX.Element => {
  const { t } = useTranslation('common');
  const apiClient = useApiClient();

  const ping = useQuery({
    queryKey: queryKeys.currentUser(),
    queryFn: async () => {
      // Placeholder until plan 01 wires real auth.
      void apiClient;
      return { ok: true };
    },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">{t('app.name')}</h1>
        <p className="text-sm text-muted">{t('app.tagline')}</p>
      </header>

      <section className="rounded-lg border border-border bg-surface p-4">
        <p className="mb-2 text-sm font-medium text-foreground">Wiring smoke test</p>
        <ul className="space-y-1 text-sm text-muted">
          <li>i18n: {t('actions.save')}</li>
          <li>queryKey: {JSON.stringify(queryKeys.currentUser())}</li>
          <li>route(home): {routes.home.pattern}</li>
          <li>query.status: {ping.status}</li>
        </ul>
      </section>

      <footer className="mt-auto text-center text-xs text-muted">
        {t('states.loading') === 'Loading…' ? null : null}
        wlist · scaffold (PR2)
      </footer>
    </main>
  );
};
