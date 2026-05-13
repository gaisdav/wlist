import { getDisplayName } from '@wlist/core/entities/profile';
import { useCurrentUser } from '@wlist/core/hooks/auth';
import { useMyWishes } from '@wlist/core/hooks/wishes';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

import { useQueryErrorToast } from '../hooks/useQueryErrorToast';
import { useApiClient } from '../providers/ApiClientProvider';

import { WishCard } from './WishCard';

export const MyWishlistPage = (): React.JSX.Element => {
  const { t } = useTranslation('common');
  const api = useApiClient();
  const profile = useCurrentUser(api);
  const wishes = useMyWishes(api, profile.data?.id);

  useQueryErrorToast(
    wishes.isError && !wishes.isLoading && Boolean(profile.data?.id),
    t('states.error'),
  );
  useQueryErrorToast(profile.isError && !profile.isLoading, t('states.error'));

  if (profile.isLoading || wishes.isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="h-10 animate-pulse rounded-lg bg-muted" />
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!profile.data) {
    return <p className="p-4 text-sm text-muted">{t('states.empty')}</p>;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex flex-col gap-2 border-b border-border pb-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-foreground">{t('wishes.list.title')}</h1>
          <Link
            to="/wish/new"
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            {t('nav.add_wish')}
          </Link>
        </div>
        <p className="text-sm text-muted">
          {getDisplayName(profile.data)}{' '}
          <Link className="text-primary underline" to={`/u/${profile.data.id}`}>
            {t('nav.public_preview')}
          </Link>
        </p>
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
