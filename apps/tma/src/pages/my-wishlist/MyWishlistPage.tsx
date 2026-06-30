import { useCurrentUser } from '@wlist/core/hooks/auth';
import { useMyWishes } from '@wlist/core/hooks/wishes';
import { Gift, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'wouter';

import { UserEventsSection } from '../../components/events';
import { buttonVariants } from '../../components/primitives/button';
import { EmptyState } from '../../components/primitives/empty-state';
import { Skeleton } from '../../components/primitives/skeleton';
import { WishCard } from '../../components/wishes';
import { WishCardSkeleton } from '../../components/wishes/WishCardSkeleton';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { useApiClient } from '../../providers/ApiClientProvider';

export const MyWishlistPage = (): React.JSX.Element => {
  const { t } = useTranslation('common');
  const [, navigate] = useLocation();
  const api = useApiClient();
  const profile = useCurrentUser(api);
  const userId = profile.data?.id;
  const wishes = useMyWishes(api, userId);

  useQueryErrorToast(wishes.isError && !wishes.isLoading && Boolean(userId), t('states.error'));
  useQueryErrorToast(profile.isError && !profile.isLoading, t('states.error'));

  if (profile.isLoading || wishes.isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <header className="flex items-start justify-between gap-2 border-b border-border pb-4">
          <Skeleton className="h-7 w-36 rounded" />
          <Skeleton className="h-7 w-20 rounded-lg" />
        </header>
        <ul className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <WishCardSkeleton />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (!profile.data) {
    return <p className="p-4 text-sm text-muted">{t('states.empty')}</p>;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-start justify-between gap-2 border-b border-border pb-4">
        <h1 className="text-xl font-semibold text-foreground">{t('wishes.list.title')}</h1>
        <Link to="/wish/new" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
          {t('nav.add_wish')}
        </Link>
      </header>

      {userId && <UserEventsSection ownerId={userId} isOwner />}

      {wishes.isError ? (
        <EmptyState
          icon={WifiOff}
          tone="error"
          title={t('states.error_title')}
          description={t('states.error_description')}
          action={{ label: t('states.retry'), onClick: () => void wishes.refetch() }}
        />
      ) : !wishes.data?.length ? (
        <EmptyState
          icon={Gift}
          title={t('wishes.list.empty_title')}
          description={t('wishes.list.empty_description')}
          action={{ label: t('nav.add_wish'), onClick: () => navigate('/wish/new') }}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {wishes.data.map((w) => (
            <li key={w.id}>
              <WishCard wish={w} isOwner />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
