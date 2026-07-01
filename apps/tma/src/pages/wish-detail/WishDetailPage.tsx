import { useCurrentUser } from '@wlist/core/hooks/auth';
import { useWishEvents } from '@wlist/core/hooks/events';
import {
  useArchiveWish,
  useDeleteWish,
  useUnarchiveWish,
  useUserWishes,
  useWish,
} from '@wlist/core/hooks/wishes';
import { formatDate, formatWishAmount } from '@wlist/core/lib';
import { Check, Copy, Lock, Repeat2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'wouter';

import { PhotoLightbox } from '../../components/overlays';
import { Badge } from '../../components/primitives/badge';
import { Button } from '../../components/primitives/button';
import { PageLoadingPlaceholder, Skeleton } from '../../components/primitives/skeleton';
import { useWishPhotoSignedUrl } from '../../components/wishes';
import { WishReservationBadge } from '../../components/wishes/WishReservationBadge';
import { WishReservationSection } from '../../components/wishes/WishReservationSection';
import { WishSocialStrip } from '../../components/wishes/WishSocialStrip';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { useApiClient } from '../../providers/ApiClientProvider';
import { confirm } from '../../telegram/confirm';
import { haptics } from '../../telegram/haptics';
import { share } from '../../telegram/share';
import { useTelegramBackButton } from '../../telegram/useTelegramBackButton';

import { WishDetailBottomBar } from './WishDetailBottomBar';
import { WishDetailHero } from './WishDetailHero';

/** Scroll target the bottom bar's "Gift slots" action jumps to. */
const SLOTS_ANCHOR_ID = 'wish-slots';

export const WishDetailPage = (): React.JSX.Element => {
  const { t } = useTranslation('common');
  const { wishId } = useParams<{ wishId: string }>();
  const api = useApiClient();
  const [, setLocation] = useLocation();
  const profile = useCurrentUser(api);
  const wish = useWish(api, wishId);
  const { data: events } = useWishEvents(api, wishId);
  const ownerWishes = useUserWishes(api, wish.data?.owner_id);
  const archive = useArchiveWish(api);
  const unarchive = useUnarchiveWish(api);
  const del = useDeleteWish(api);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (copiedIndex === null) return;
    const timer = setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [copiedIndex]);

  useQueryErrorToast(Boolean(wishId) && wish.isError, t('states.error'));
  useQueryErrorToast(Boolean(wish.data?.owner_id) && ownerWishes.isError, t('states.error'));
  useQueryErrorToast(profile.isError && !profile.isLoading, t('states.error'));

  const photoSrc = useWishPhotoSignedUrl(
    wish.data?.photo_storage_path ? wish.data.photo_storage_path : null,
  );

  const goTelegramBack = (): void => {
    const data = wish.data;
    if (!data) {
      window.history.back();
      return;
    }
    const listPath = profile.data?.id === data.owner_id ? '/me' : `/u/${data.owner_id}`;
    setLocation(listPath, { replace: true });
  };
  useTelegramBackButton(goTelegramBack, Boolean(wishId));

  const onShare = (): void => {
    if (!wish.data) return;
    haptics.impact('light');
    void share({
      target: { kind: 'wish', id: wish.data.id },
      text: t('share.wish', { title: wish.data.title }),
    });
  };

  if (!wishId) {
    return <p className="p-4 text-sm text-muted">{t('states.error')}</p>;
  }

  if (wish.isLoading) {
    return (
      <PageLoadingPlaceholder>
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-6 w-2/3 rounded" />
      </PageLoadingPlaceholder>
    );
  }

  if (wish.isError || !wish.data) {
    return <p className="p-4 text-sm text-muted">{t('states.error')}</p>;
  }

  const w = wish.data;
  const isOwner = profile.data?.id === w.owner_id;
  const viewerId = profile.data?.id;
  const hasUploadedPhoto = Boolean(w.photo_storage_path);

  const list = ownerWishes.data;
  const listReady = Boolean(list && !ownerWishes.isLoading && !ownerWishes.isError);
  const indexInList = listReady && list ? list.findIndex((item) => item.id === wishId) : -1;
  const prevWishId = listReady && list && indexInList > 0 ? list[indexInList - 1]?.id : undefined;
  const nextWishId =
    listReady && list && indexInList >= 0 && indexInList < list.length - 1
      ? list[indexInList + 1]?.id
      : undefined;

  const onOpenSlots = (): void => {
    document
      .getElementById(SLOTS_ANCHOR_ID)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const onArchive = async (): Promise<void> => {
    await archive.mutateAsync(w.id);
    setLocation('/me');
  };

  const onUnarchive = async (): Promise<void> => {
    await unarchive.mutateAsync(w.id);
  };

  const onDelete = async (): Promise<void> => {
    const confirmed = await confirm({
      message: t('wishes.detail.delete_confirm'),
      confirmLabel: t('actions.delete'),
      destructive: true,
    });
    if (!confirmed) return;
    await del.mutateAsync(w.id);
    haptics.notify('success');
    setLocation('/me');
  };

  let priceLine: string | null = null;
  if (w.price != null) {
    const amountStr = formatWishAmount(w.price);
    priceLine = w.currency
      ? `${amountStr} ${w.currency}`
      : t('wishes.card.price_no_currency', { amount: amountStr });
  }

  return (
    <>
      <PhotoLightbox
        open={lightboxOpen}
        src={photoSrc}
        ariaLabel={t('wishes.detail.photo_lightbox')}
        closeLabel={t('actions.close')}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Always reserve space for the fixed bottom bar so it never covers content. */}
      <article className="flex flex-col gap-4 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
        <WishDetailHero
          hasUploadedPhoto={hasUploadedPhoto}
          photoSrc={photoSrc}
          onOpenLightbox={() => setLightboxOpen(true)}
          t={t}
        />

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-foreground">{w.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <WishReservationBadge
              wish={w}
              isOwner={isOwner}
              viewerId={viewerId}
              variant="compact"
            />
            {events && events.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {events.map((event) => (
                  <Badge key={event.id} size="sm" variant="soft">
                    {event.title}
                    {event.event_date ? ` (${formatDate(event.event_date, 'short')})` : ''}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {w.description ? (
          <section>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{w.description}</p>
          </section>
        ) : null}

        {priceLine != null ? (
          <p className="text-sm text-foreground">
            <span className="text-muted">{t('wishes.detail.price')}: </span>
            {priceLine}
          </p>
        ) : null}

        {isOwner && w.visibility !== 'public' ? (
          <p className="inline-flex items-center gap-1 text-sm text-muted">
            {w.visibility === 'followers' ? (
              <Users className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            ) : (
              <Lock className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            )}
            {t(`wishes.card.visibility_${w.visibility}`)}
          </p>
        ) : null}

        {w.link ? (
          <a
            href={w.link}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-primary underline"
          >
            {t('wishes.detail.open_link')}
          </a>
        ) : null}

        {w.copy_lines && w.copy_lines.length > 0 ? (
          <section className="flex flex-col gap-2" aria-label={t('wishes.detail.copy_lines')}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
              {t('wishes.detail.copy_lines')}
            </h2>
            <ul className="flex flex-col gap-2">
              {w.copy_lines.map((line, idx) => (
                <li
                  key={`${idx}-${line.slice(0, 12)}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-foreground">
                    {line}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="iconRound"
                    className="shrink-0"
                    aria-label={t('wishes.detail.copy_line')}
                    onClick={() => {
                      void navigator.clipboard.writeText(line);
                      setCopiedIndex(idx);
                    }}
                  >
                    {copiedIndex === idx ? (
                      <Check className="h-4 w-4 text-green-500" strokeWidth={2} aria-hidden />
                    ) : (
                      <Copy className="h-4 w-4" strokeWidth={2} aria-hidden />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <WishSocialStrip wish={w} isOwner={isOwner} />

        {!isOwner && !w.is_archived ? (
          <Link
            to={`/wish/new?repostFrom=${w.id}`}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground"
          >
            <Repeat2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            {t('social.repost')}
          </Link>
        ) : null}

        {!isOwner && !w.is_archived && viewerId ? (
          <div id={SLOTS_ANCHOR_ID} className="scroll-mt-4">
            <WishReservationSection wish={w} viewerId={viewerId} />
          </div>
        ) : null}

        {isOwner ? (
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/wish/${w.id}/edit`}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium"
            >
              {t('actions.edit')}
            </Link>
            {w.is_archived ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={unarchive.isPending}
                onClick={() => void onUnarchive()}
              >
                {t('wishes.detail.unarchive')}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={archive.isPending}
                onClick={() => void onArchive()}
              >
                {t('wishes.detail.archive')}
              </Button>
            )}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={del.isPending}
              onClick={() => void onDelete()}
            >
              {t('actions.delete')}
            </Button>
          </div>
        ) : null}
      </article>

      <WishDetailBottomBar
        wish={w}
        isOwner={isOwner}
        viewerId={viewerId}
        prevWishId={prevWishId}
        nextWishId={nextWishId}
        onShare={onShare}
        onOpenSlots={onOpenSlots}
      />
    </>
  );
};
