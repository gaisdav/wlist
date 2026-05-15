import { useCurrentUser } from '@wlist/core/hooks/auth';
import { useFollowsCounts } from '@wlist/core/hooks/social';
import { useMyWishes } from '@wlist/core/hooks/wishes';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

import { PageLoadingPlaceholder, Skeleton } from '../../components/primitives/skeleton';
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

  useQueryErrorToast(
    wishes.isError && !wishes.isLoading && Boolean(userId),
    t('states.error'),
  );
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

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex flex-col gap-2 border-b border-border pb-4">
        <h1 className="text-xl font-semibold text-foreground">{t('wishes.list.title')}</h1>
        {counts.data ? (
          <div className="flex flex-wrap gap-3 text-sm text-muted">
            <Link to={`/u/${profile.data.id}/following`} className="underline">
              {t('social.counts.following', { n: counts.data.following })}
            </Link>
            <Link to={`/u/${profile.data.id}/followers`} className="underline">
              {t('social.counts.followers', { n: counts.data.followers })}
            </Link>
          </div>
        ) : null}
      </header>

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
    </div>
  );
};
