import { useCurrentUser } from '@wlist/core/hooks/auth';
import { useUserWishes } from '@wlist/core/hooks/wishes';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'wouter';

import { Button } from '../../components/primitives/button';
import { PageLoadingPlaceholder, Skeleton } from '../../components/primitives/skeleton';
import { WishCard } from '../../components/wishes';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { useApiClient } from '../../providers/ApiClientProvider';
import { useTelegramBackButton } from '../../telegram/useTelegramBackButton';

export const UserWishlistPage = (): React.JSX.Element => {
  const { t } = useTranslation('common');
  const { userId } = useParams<{ userId?: string }>();
  const api = useApiClient();
  const profile = useCurrentUser(api);
  const wishes = useUserWishes(api, userId);

  useQueryErrorToast(Boolean(userId) && wishes.isError && !wishes.isLoading, t('states.error'));
  useQueryErrorToast(profile.isError && !profile.isLoading, t('states.error'));

  const goBack = (): void => {
    window.history.back();
  };
  useTelegramBackButton(goBack, Boolean(userId));

  const isSelf = Boolean(profile.data?.id && userId && profile.data.id === userId);

  if (!userId) {
    return <p className="p-4 text-sm text-muted">{t('states.error')}</p>;
  }

  if (wishes.isLoading) {
    return (
      <PageLoadingPlaceholder>
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </PageLoadingPlaceholder>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex flex-col gap-3 border-b border-border pb-4">
        {isSelf ? (
          <Button type="button" variant="link" className="self-start" onClick={goBack}>
            {t('nav.back_to_my_wishes')}
          </Button>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-foreground">{t('wishes.list.user_title')}</h1>
          {isSelf ? (
            <Link to="/wish/new" className="text-sm font-medium text-primary underline">
              {t('nav.add_wish')}
            </Link>
          ) : null}
        </div>
      </header>

      {wishes.isError ? (
        <p className="text-sm text-destructive">{t('states.error')}</p>
      ) : !wishes.data?.length ? (
        <p className="text-sm text-muted">{t('wishes.list.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {wishes.data.map((w) => (
            <li key={w.id}>
              <WishCard wish={w} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
