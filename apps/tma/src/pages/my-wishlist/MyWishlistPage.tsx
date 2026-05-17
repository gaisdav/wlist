import { useCurrentUser } from '@wlist/core/hooks/auth';
import { useFollowsCounts } from '@wlist/core/hooks/social';
import { useMyWishes } from '@wlist/core/hooks/wishes';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

import { UserEventsSection } from '../../components/events';
import { buttonVariants } from '../../components/primitives/button';
import { PageLoadingPlaceholder, Skeleton } from '../../components/primitives/skeleton';
import { UserFollowsBottomSheet } from '../../components/social';
import { WishCard } from '../../components/wishes';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { useApiClient } from '../../providers/ApiClientProvider';

export const MyWishlistPage = (): React.JSX.Element => {
  const { t } = useTranslation('common');
  const api = useApiClient();
  const profile = useCurrentUser(api);
  const userId = profile.data?.id;
  const wishes = useMyWishes(api, userId);
  const counts = useFollowsCounts(api, userId);

  const [followSheet, setFollowSheet] = useState<{
    isOpen: boolean;
    initialTab: 'following' | 'followers';
  }>({
    isOpen: false,
    initialTab: 'following',
  });

  useQueryErrorToast(wishes.isError && !wishes.isLoading && Boolean(userId), t('states.error'));
  useQueryErrorToast(profile.isError && !profile.isLoading, t('states.error'));
  useQueryErrorToast(Boolean(userId) && counts.isError && !counts.isLoading, t('states.error'));

  if (profile.isLoading || wishes.isLoading) {
    return (
      <PageLoadingPlaceholder>
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </PageLoadingPlaceholder>
    );
  }

  if (!profile.data) {
    return <p className="p-4 text-sm text-muted">{t('states.empty')}</p>;
  }

  const openFollowSheet = (tab: 'following' | 'followers') => {
    setFollowSheet({
      isOpen: true,
      initialTab: tab,
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex flex-col gap-2 border-b border-border pb-4">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-semibold text-foreground">{t('wishes.list.title')}</h1>
          <Link to="/wish/new" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
            {t('nav.add_wish')}
          </Link>
        </div>
        {counts.data ? (
          <div className="flex flex-wrap gap-3 text-sm text-muted">
            <button
              type="button"
              onClick={() => openFollowSheet('following')}
              className="underline hover:text-foreground transition-colors"
            >
              {t('social.counts.following', { n: counts.data.following })}
            </button>
            <button
              type="button"
              onClick={() => openFollowSheet('followers')}
              className="underline hover:text-foreground transition-colors"
            >
              {t('social.counts.followers', { n: counts.data.followers })}
            </button>
          </div>
        ) : null}
      </header>

      {userId && <UserEventsSection ownerId={userId} isOwner />}

      {wishes.isError ? (
        <p className="text-sm text-destructive">{t('states.error')}</p>
      ) : !wishes.data?.length ? (
        <p className="text-sm text-muted">{t('wishes.list.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {wishes.data.map((w) => (
            <li key={w.id}>
              <WishCard wish={w} isOwner />
            </li>
          ))}
        </ul>
      )}

      {userId && (
        <UserFollowsBottomSheet
          userId={userId}
          isOpen={followSheet.isOpen}
          initialTab={followSheet.initialTab}
          onClose={() => setFollowSheet((prev) => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
};
