import { getDisplayName } from '@wlist/core/entities/profile';
import { useCurrentUser } from '@wlist/core/hooks/auth';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

import { useApiClient } from '../providers/ApiClientProvider';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps): React.JSX.Element => {
  const { t } = useTranslation('common');
  const api = useApiClient();
  const profile = useCurrentUser(api);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <Link to="/me" className="text-lg font-semibold text-foreground">
          {t('app.name')}
        </Link>
        {profile.data ? (
          <span className="max-w-[45%] truncate text-xs text-muted">
            {getDisplayName(profile.data)}
          </span>
        ) : null}
      </header>
      <main className="flex-1 pb-8">{children}</main>
    </div>
  );
};
