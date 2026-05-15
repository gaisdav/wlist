import { getDisplayName } from '@wlist/core/entities/profile';
import { useFollowersList, useFollowingList } from '@wlist/core/hooks/social';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'wouter';

import { PageLoadingPlaceholder, Skeleton } from '../../components/primitives/skeleton';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { useApiClient } from '../../providers/ApiClientProvider';
import { useTelegramBackButton } from '../../telegram/useTelegramBackButton';

export const UserFollowPage = (): React.JSX.Element => {
  const { t } = useTranslation('common');
  const { userId } = useParams<{ userId?: string }>();
  const [path] = useLocation();
  const api = useApiClient();
  const mode = path.includes('/followers') ? 'followers' : 'following';
  const following = useFollowingList(api, mode === 'following' ? userId : undefined);
  const followers = useFollowersList(api, mode === 'followers' ? userId : undefined);

  const list = mode === 'following' ? following : followers;

  useQueryErrorToast(Boolean(userId) && list.isError && !list.isLoading, t('states.error'));

  const goBack = (): void => {
    window.history.back();
  };
  useTelegramBackButton(goBack, Boolean(userId));

  if (!userId) {
    return <p className="p-4 text-sm text-muted">{t('states.error')}</p>;
  }

  const title =
    mode === 'following'
      ? t('social.follows.following_title')
      : t('social.follows.followers_title');

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="border-b border-border pb-3">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      </header>

      {list.isLoading ? (
        <PageLoadingPlaceholder>
          <Skeleton className="h-12 rounded-lg" />
        </PageLoadingPlaceholder>
      ) : list.isError ? (
        <p className="text-sm text-destructive">{t('states.error')}</p>
      ) : !list.data?.length ? (
        <p className="text-sm text-muted">{t('social.follows.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.data.map((p) => (
            <li key={p.id}>
              <Link
                to={`/u/${p.id}`}
                className="block rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/10"
              >
                {getDisplayName(p)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
