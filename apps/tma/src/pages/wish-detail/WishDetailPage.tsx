import { useCurrentUser } from '@wlist/core/hooks/auth';
import {
  useArchiveWish,
  useDeleteWish,
  useUnarchiveWish,
  useUserWishes,
  useWish,
} from '@wlist/core/hooks/wishes';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'wouter';

import { PhotoLightbox } from '../../components/overlays';
import { Button } from '../../components/primitives/button';
import { PageLoadingPlaceholder, Skeleton } from '../../components/primitives/skeleton';
import { useWishPhotoSignedUrl } from '../../components/wishes';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { useApiClient } from '../../providers/ApiClientProvider';
import { useTelegramBackButton } from '../../telegram/useTelegramBackButton';

import { WishDetailHero } from './WishDetailHero';

export const WishDetailPage = (): React.JSX.Element => {
  const { t } = useTranslation('common');
  const { wishId } = useParams<{ wishId: string }>();
  const api = useApiClient();
  const [, setLocation] = useLocation();
  const profile = useCurrentUser(api);
  const wish = useWish(api, wishId);
  const ownerWishes = useUserWishes(api, wish.data?.owner_id);
  const archive = useArchiveWish(api);
  const unarchive = useUnarchiveWish(api);
  const del = useDeleteWish(api);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useQueryErrorToast(Boolean(wishId) && wish.isError, t('states.error'));
  useQueryErrorToast(
    Boolean(wish.data?.owner_id) && ownerWishes.isError,
    t('states.error'),
  );
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
  const hasUploadedPhoto = Boolean(w.photo_storage_path);

  const list = ownerWishes.data;
  const listReady = Boolean(
    list && !ownerWishes.isLoading && !ownerWishes.isError,
  );
  const indexInList = listReady && list ? list.findIndex((item) => item.id === wishId) : -1;
  const prevWishId =
    listReady && list && indexInList > 0 ? list[indexInList - 1]?.id : undefined;
  const nextWishId =
    listReady && list && indexInList >= 0 && indexInList < list.length - 1
      ? list[indexInList + 1]?.id
      : undefined;

  const showSiblingNav = Boolean(prevWishId || nextWishId);

  const onArchive = async (): Promise<void> => {
    await archive.mutateAsync(w.id);
    setLocation('/me');
  };

  const onUnarchive = async (): Promise<void> => {
    await unarchive.mutateAsync(w.id);
  };

  const onDelete = async (): Promise<void> => {
    if (!window.confirm(t('wishes.detail.delete_confirm'))) return;
    await del.mutateAsync(w.id);
    setLocation('/me');
  };

  let priceLine: string | null = null;
  if (w.price != null) {
    const amountStr = w.price.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
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

      <article
        className={`flex flex-col gap-4 p-4${
          showSiblingNav ? ' pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]' : ''
        }`}
      >
        <WishDetailHero
          hasUploadedPhoto={hasUploadedPhoto}
          photoSrc={photoSrc}
          onOpenLightbox={() => setLightboxOpen(true)}
          t={t}
        />

        <h1 className="text-2xl font-semibold text-foreground">{w.title}</h1>

        {w.description ? (
          <section>
            <h2 className="text-sm font-medium text-muted">{t('wishes.detail.description')}</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{w.description}</p>
          </section>
        ) : null}

        {priceLine != null ? (
          <p className="text-sm text-foreground">
            <span className="text-muted">{t('wishes.detail.price')}: </span>
            {priceLine}
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

      {showSiblingNav ? (
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-4 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur supports-[backdrop-filter]:bg-background/80"
          aria-label={t('wishes.detail.sibling_nav')}
        >
          <div className="flex min-w-0 flex-1 justify-start">
            {prevWishId ? (
              <Link
                to={`/wish/${prevWishId}`}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-surface p-2 text-foreground hover:bg-muted"
                aria-label={t('wishes.detail.prev_wish')}
              >
                <ChevronLeft className="h-6 w-6" strokeWidth={2} aria-hidden />
              </Link>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 justify-end">
            {nextWishId ? (
              <Link
                to={`/wish/${nextWishId}`}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-surface p-2 text-foreground hover:bg-muted"
                aria-label={t('wishes.detail.next_wish')}
              >
                <ChevronRight className="h-6 w-6" strokeWidth={2} aria-hidden />
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </>
  );
};
