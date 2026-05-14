import { type SignInErrorCode } from '@wlist/api';
import { type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '../components/primitives/button';

import { useAuthBootstrap } from './useAuthBootstrap';

/**
 * Renders children only after the user has a live Supabase session.
 *
 * The 4 paths it covers (in order):
 *   - loading       → splash (i18n `auth.signing_in`)
 *   - error         → typed error screen with optional `Try again` button
 *   - no_init_data  → "Open this in Telegram" (e.g. when running in a
 *                     regular browser tab during local dev)
 *   - authenticated → render `children`
 *
 * Authenticated state is owned by the platform (supabase-js + auth-telegram
 * Edge Function). This component is a thin presentation gate; all flow
 * logic lives in `useAuthBootstrap`.
 */
export const AuthGate = ({ children }: PropsWithChildren): React.JSX.Element => {
  const status = useAuthBootstrap();
  const { t } = useTranslation('common');

  if (status.kind === 'authenticated') {
    return <>{children}</>;
  }

  if (status.kind === 'no_init_data') {
    return <Splash heading={t('auth.errors.outside_telegram')} />;
  }

  if (status.kind === 'error') {
    return (
      <Splash
        heading={t(`auth.errors.${errorTranslationKey(status.code)}`)}
        detail={status.message}
        retry={isRetryable(status.code) ? () => location.reload() : undefined}
        retryLabel={t('auth.actions.retry')}
      />
    );
  }

  return <Splash heading={t('auth.signing_in')} spinner />;
};

interface SplashProps {
  heading: string;
  detail?: string;
  spinner?: boolean;
  retry?: () => void;
  retryLabel?: string;
}

const Splash = ({ heading, detail, spinner, retry, retryLabel }: SplashProps) => (
  <main
    role="status"
    className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center"
  >
    {spinner ? (
      <div
        aria-hidden
        className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-transparent"
      />
    ) : null}
    <p className="text-base font-medium text-foreground">{heading}</p>
    {detail ? <p className="text-xs text-muted">{detail}</p> : null}
    {retry ? (
      <Button type="button" variant="secondary" size="md" onClick={retry}>
        {retryLabel}
      </Button>
    ) : null}
  </main>
);

/**
 * Map server-side error codes to i18n keys under `auth.errors.*`.
 *
 * We intentionally collapse a few internal codes into `generic`: the user
 * has nothing actionable to do for those, and showing the literal code adds
 * noise. The original message is still passed via `detail` for debugging.
 */
const errorTranslationKey = (code: SignInErrorCode | 'unknown'): string => {
  switch (code) {
    case 'invalid_init_data':
    case 'expired_init_data':
    case 'replayed_init_data':
    case 'network':
    case 'verify_otp_failed':
      return code;
    case 'malformed_request':
    case 'internal_error':
    case 'unknown':
    default:
      return 'generic';
  }
};

const isRetryable = (code: SignInErrorCode | 'unknown'): boolean =>
  code === 'network' || code === 'verify_otp_failed' || code === 'unknown';
