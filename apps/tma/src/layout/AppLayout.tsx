import { getDisplayName } from '@wlist/core/entities/profile';
import { useCurrentUser } from '@wlist/core/hooks/auth';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'wouter';

import { BottomTabBar, shouldShowBottomTabBar } from '../components/nav';
import { useApiClient } from '../providers/ApiClientProvider';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps): React.JSX.Element => {
  const { t } = useTranslation('common');
  const api = useApiClient();
  const profile = useCurrentUser(api);
  const [location] = useLocation();
  const tabBar = shouldShowBottomTabBar(location);

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
      <main
        className={clsx(
          'flex-1',
          tabBar ? 'pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))]' : 'pb-8',
        )}
      >
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
};
