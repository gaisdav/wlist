import { clsx } from 'clsx';
import { ClipboardList, House, Search, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'wouter';

import { shouldShowBottomTabBar } from './bottomTabBarModel.js';

const tabLinkClass = (active: boolean): string =>
  clsx(
    'flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium leading-tight transition-colors',
    active ? 'text-primary' : 'text-muted hover:text-foreground',
  );

const tabIconClass = 'h-[22px] w-[22px] shrink-0';

export const BottomTabBar = (): React.JSX.Element | null => {
  const [location] = useLocation();
  const { t } = useTranslation('common');

  if (!shouldShowBottomTabBar(location)) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      aria-label={t('nav.tabs.aria')}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between gap-1 px-2">
        <Link
          to="/me"
          className={tabLinkClass(location === '/me')}
          aria-current={location === '/me' ? 'page' : undefined}
        >
          <User className={tabIconClass} strokeWidth={1.75} aria-hidden />
          <span className="max-w-full truncate">{t('nav.tabs.profile')}</span>
        </Link>

        <Link
          to="/feed"
          className={tabLinkClass(location === '/feed')}
          aria-current={location === '/feed' ? 'page' : undefined}
        >
          <House className={tabIconClass} strokeWidth={1.75} aria-hidden />
          <span className="max-w-full truncate">{t('nav.tabs.feed')}</span>
        </Link>

        <Link
          to="/me/bookings"
          className={tabLinkClass(location === '/me/bookings')}
          aria-current={location === '/me/bookings' ? 'page' : undefined}
        >
          <ClipboardList className={tabIconClass} strokeWidth={1.75} aria-hidden />
          <span className="max-w-full truncate">{t('nav.tabs.bookings')}</span>
        </Link>

        <Link
          to="/search"
          className={tabLinkClass(location === '/search')}
          aria-current={location === '/search' ? 'page' : undefined}
        >
          <Search className={tabIconClass} strokeWidth={1.75} aria-hidden />
          <span className="max-w-full truncate">{t('nav.tabs.find_people')}</span>
        </Link>
      </div>
    </nav>
  );
};
