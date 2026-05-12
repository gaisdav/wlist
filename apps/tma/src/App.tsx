import { getDisplayName } from '@wlist/core/entities';
import { useCurrentUser } from '@wlist/core/hooks/auth';
import { useTranslation } from 'react-i18next';

import { useApiClient } from './providers/ApiClientProvider';

/**
 * Home screen — shows the signed-in user. The real screen for plan 02+
 * (wishes feed) replaces this; for plan 01 it's the smallest possible
 * surface that proves end-to-end auth works inside Telegram.
 *
 * `<AuthGate>` (in main.tsx) guarantees we only render here once the user
 * is authenticated AND the profile query has resolved, so `data` is
 * effectively always populated. We still handle `null` defensively because
 * a sign-out + back-button race is technically possible.
 */
export const App = (): React.JSX.Element => {
  const { t } = useTranslation('common');
  const api = useApiClient();
  const profile = useCurrentUser(api);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">{t('app.name')}</h1>
        <p className="text-sm text-muted">{t('app.tagline')}</p>
      </header>

      {profile.data ? (
        <section
          aria-label="Your profile"
          className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4"
        >
          {profile.data.photoUrl ? (
            <img
              src={profile.data.photoUrl}
              alt=""
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="grid h-12 w-12 place-items-center rounded-full bg-border text-sm font-semibold text-foreground"
            >
              {profile.data.firstName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-base font-medium text-foreground">
              {getDisplayName(profile.data)}
            </span>
            <span className="text-xs text-muted">tg id: {profile.data.telegramId}</span>
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted">{t('states.empty')}</p>
      )}

      <footer className="mt-auto text-center text-xs text-muted">wlist · plan 01</footer>
    </main>
  );
};
