import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'wouter';

import { shouldShowBottomTabBar } from './bottomTabBarModel.js';

const tabLinkClass = (active: boolean): string =>
  clsx(
    'flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium leading-tight transition-colors',
    active ? 'text-primary' : 'text-muted hover:text-foreground',
  );

const IconFeed = ({ className }: { className?: string }): React.JSX.Element => (
  <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
  </svg>
);

const IconProfile = ({ className }: { className?: string }): React.JSX.Element => (
  <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
    <path
      d="M6 20c0-3.5 2.5-5.5 6-5.5s6 2 6 5.5"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
  </svg>
);

const IconBookings = ({ className }: { className?: string }): React.JSX.Element => (
  <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1v2M6 6h12v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
    <path d="M9 11h6M9 15h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

const IconSearch = ({ className }: { className?: string }): React.JSX.Element => (
  <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="10.5" cy="10.5" r="5.25" stroke="currentColor" strokeWidth="1.75" />
    <path d="m16.5 16.5 5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

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
          <IconProfile />
          <span className="max-w-full truncate">{t('nav.tabs.profile')}</span>
        </Link>

        <Link
          to="/feed"
          className={tabLinkClass(location === '/feed')}
          aria-current={location === '/feed' ? 'page' : undefined}
        >
          <IconFeed />
          <span className="max-w-full truncate">{t('nav.tabs.feed')}</span>
        </Link>

        <Link
          to="/me/bookings"
          className={tabLinkClass(location === '/me/bookings')}
          aria-current={location === '/me/bookings' ? 'page' : undefined}
        >
          <IconBookings />
          <span className="max-w-full truncate">{t('nav.tabs.bookings')}</span>
        </Link>

        <Link
          to="/search"
          className={tabLinkClass(location === '/search')}
          aria-current={location === '/search' ? 'page' : undefined}
        >
          <IconSearch />
          <span className="max-w-full truncate">{t('nav.tabs.find_people')}</span>
        </Link>
      </div>
    </nav>
  );
};
