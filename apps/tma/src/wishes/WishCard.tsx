import { type Wish } from '@wlist/core/entities/wish';
import { truncateWishDescriptionForList } from '@wlist/core/lib';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

import { WishPhoto } from './WishPhoto';

interface WishCardProps {
  wish: Wish;
}

export const WishCard = ({ wish }: WishCardProps): React.JSX.Element => {
  const { t } = useTranslation('common');
  const preview = truncateWishDescriptionForList(wish.description);

  return (
    <Link
      to={`/wish/${wish.id}`}
      className="flex gap-3 rounded-lg border border-border bg-surface p-3 text-left transition hover:bg-muted/10"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
        <WishPhoto
          storagePath={wish.photo_storage_path}
          alt=""
          className="h-full w-full object-cover"
        />
        {!wish.photo_storage_path ? (
          <div className="absolute inset-0 grid place-items-center text-sm font-semibold text-foreground">
            {wish.title.slice(0, 1).toUpperCase()}
          </div>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{wish.title}</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted">
          {preview || t('wishes.card.no_description')}
        </p>
        {wish.price != null ? (
          <p className="mt-1 text-xs text-muted">
            {t('wishes.card.price', {
              amount: wish.price.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              }),
              currency: wish.currency,
            })}
          </p>
        ) : null}
        {wish.is_archived ? (
          <span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {t('wishes.list.archived')}
          </span>
        ) : null}
      </div>
    </Link>
  );
};
