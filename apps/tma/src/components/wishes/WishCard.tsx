import { type Wish } from '@wlist/core/entities/wish';
import { truncateWishDescriptionForList } from '@wlist/core/lib';
import { Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

import { WISH_NO_PHOTO_EMOJI } from './constants';
import { WishPhoto } from './WishPhoto';

interface WishCardProps {
  wish: Wish;
}

export const WishCard = ({ wish }: WishCardProps): React.JSX.Element => {
  const { t } = useTranslation('common');
  const preview = truncateWishDescriptionForList(wish.description);
  const hasPhoto = Boolean(wish.photo_storage_path);
  const hasLink = Boolean(wish.link);

  return (
    <Link
      to={`/wish/${wish.id}`}
      className="relative flex gap-3 rounded-lg border border-border bg-surface p-3 text-left transition hover:bg-muted/10"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
        {hasPhoto ? (
          <WishPhoto
            storagePath={wish.photo_storage_path}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full select-none items-center justify-center text-2xl"
            aria-hidden
          >
            {WISH_NO_PHOTO_EMOJI}
          </div>
        )}
      </div>
      <div className={`min-w-0 flex-1${hasLink ? ' pr-7' : ''}`}>
        <p className="truncate font-medium text-foreground">{wish.title}</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted">
          {preview || t('wishes.card.no_description')}
        </p>
        {wish.price != null ? (
          <p className="mt-1 text-xs text-muted">
            {wish.currency
              ? t('wishes.card.price', {
                  amount: wish.price.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  }),
                  currency: wish.currency,
                })
              : t('wishes.card.price_no_currency', {
                  amount: wish.price.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  }),
                })}
          </p>
        ) : null}
        {wish.is_archived ? (
          <span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {t('wishes.list.archived')}
          </span>
        ) : null}
      </div>
      {hasLink ? (
        <span
          className="pointer-events-none absolute right-2 top-2 text-muted-foreground"
          aria-label={t('wishes.card.has_product_link')}
        >
          <Link2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        </span>
      ) : null}
    </Link>
  );
};
