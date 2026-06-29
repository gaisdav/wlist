import { type Wish } from '@wlist/core/entities/wish';
import { useWishEvents } from '@wlist/core/hooks/events';
import { formatDate, formatWishAmount, truncateWishDescriptionForList } from '@wlist/core/lib';
import { clsx } from 'clsx';
import { Link2, Lock, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

import { useApiClient } from '../../providers/ApiClientProvider';
import { Badge } from '../primitives/badge';

import { WISH_NO_PHOTO_EMOJI } from './constants';
import { WishPhoto } from './WishPhoto';
import { WishReservationBadge } from './WishReservationBadge';
import { WishSocialStrip } from './WishSocialStrip';

/** List-style wish tile (my list, user list, feed). Feed loads rows via `wishes.listByIds` then passes the same `Wish` shape here. */
interface WishCardProps {
  wish: Wish;
  /** When true, like toggle is hidden (cannot like own wish). */
  isOwner?: boolean;
  viewerId?: string;
}

export const WishCard = ({ wish, isOwner = false, viewerId }: WishCardProps): React.JSX.Element => {
  const { t } = useTranslation('common');
  const api = useApiClient();
  const { data: events } = useWishEvents(api, wish.id);
  const preview = truncateWishDescriptionForList(wish.description);
  const hasPhoto = Boolean(wish.photo_storage_path);
  const hasLink = Boolean(wish.link);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <Link
        to={`/wish/${wish.id}`}
        className="relative flex gap-3 p-3 text-left transition hover:bg-muted/10"
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
        <div className={clsx('min-w-0 flex-1', hasLink && 'pr-7')}>
          <p className="truncate font-medium text-foreground">{wish.title}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted">
            {preview || t('wishes.card.no_description')}
          </p>
          {wish.price != null ? (
            <p className="mt-1 text-xs text-muted">
              {wish.currency
                ? t('wishes.card.price', {
                    amount: formatWishAmount(wish.price),
                    currency: wish.currency,
                  })
                : t('wishes.card.price_no_currency', {
                    amount: formatWishAmount(wish.price),
                  })}
            </p>
          ) : null}
          {/* Status band: one wrapping row so chips read as a group, not stacked lines.
              Reservation leads (most actionable); collaborative/archived follow as chips;
              visibility is owner-only and stays quietest. */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <WishReservationBadge
              wish={wish}
              isOwner={isOwner}
              viewerId={viewerId}
              variant="inline"
            />
            {wish.is_archived ? (
              <Badge size="sm" variant="neutral">
                {t('wishes.list.archived')}
              </Badge>
            ) : wish.is_collaborative ? (
              <Badge size="sm" variant="soft">
                {t('wishes.card.collaborative')}
              </Badge>
            ) : null}
            {isOwner && wish.visibility !== 'public' ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                {wish.visibility === 'followers' ? (
                  <Users className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
                ) : (
                  <Lock className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
                )}
                {t(`wishes.card.visibility_${wish.visibility}`)}
              </span>
            ) : null}
          </div>
          {events && events.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {events.map((event) => (
                <Badge key={event.id} size="sm" variant="outline">
                  {event.title}
                  {event.event_date ? ` (${formatDate(event.event_date, 'short')})` : ''}
                </Badge>
              ))}
            </div>
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
      <WishSocialStrip wish={wish} isOwner={isOwner} />
    </div>
  );
};
