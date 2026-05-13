import { useCurrentUser } from '@wlist/core/hooks/auth';
import { useArchiveWish, useDeleteWish, useUnarchiveWish, useWish } from '@wlist/core/hooks/wishes';
import { Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'wouter';

import { useApiClient } from '../providers/ApiClientProvider';
import { useTelegramBackButton } from '../telegram/useTelegramBackButton';

import { WISH_NO_PHOTO_EMOJI } from './constants';
import { useWishPhotoSignedUrl } from './useWishPhotoSignedUrl';

export const WishDetailPage = (): React.JSX.Element => {
  const { t } = useTranslation('common');
  const { wishId } = useParams<{ wishId: string }>();
  const api = useApiClient();
  const [, setLocation] = useLocation();
  const profile = useCurrentUser(api);
  const wish = useWish(api, wishId);
  const archive = useArchiveWish(api);
  const unarchive = useUnarchiveWish(api);
  const del = useDeleteWish(api);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const photoSrc = useWishPhotoSignedUrl(
    wish.data?.photo_storage_path ? wish.data.photo_storage_path : null,
  );

  const goBack = (): void => {
    window.history.back();
  };
  useTelegramBackButton(goBack, Boolean(wishId));

  if (!wishId) {
    return <p className="p-4 text-sm text-muted">{t('states.error')}</p>;
  }

  if (wish.isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (wish.isError || !wish.data) {
    return <p className="p-4 text-sm text-muted">{t('states.error')}</p>;
  }

  const w = wish.data;
  const isOwner = profile.data?.id === w.owner_id;
  const hasUploadedPhoto = Boolean(w.photo_storage_path);

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
      {lightboxOpen && photoSrc ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('wishes.detail.photo_lightbox')}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightboxOpen(false)}
            aria-label={t('actions.close')}
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
          <img
            src={photoSrc}
            alt=""
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}

      <article className="flex flex-col gap-4 p-4">
        <WishDetailHero
          hasUploadedPhoto={hasUploadedPhoto}
          photoSrc={photoSrc}
          onOpenLightbox={() => setLightboxOpen(true)}
          t={t}
        />

        <div>
          <h1 className="text-2xl font-semibold text-foreground">{w.title}</h1>
          {isOwner ? (
            <p className="mt-1 text-xs text-muted">{t('wishes.detail.owner_hint')}</p>
          ) : null}
        </div>

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
              <button
                type="button"
                disabled={unarchive.isPending}
                onClick={() => void onUnarchive()}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium"
              >
                {t('wishes.detail.unarchive')}
              </button>
            ) : (
              <button
                type="button"
                disabled={archive.isPending}
                onClick={() => void onArchive()}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium"
              >
                {t('wishes.detail.archive')}
              </button>
            )}
            <button
              type="button"
              disabled={del.isPending}
              onClick={() => void onDelete()}
              className="rounded-lg border border-destructive/50 px-3 py-2 text-sm font-medium text-destructive"
            >
              {t('actions.delete')}
            </button>
          </div>
        ) : null}
      </article>
    </>
  );
};

function WishDetailHero({
  hasUploadedPhoto,
  photoSrc,
  onOpenLightbox,
  t,
}: {
  hasUploadedPhoto: boolean;
  photoSrc: string | null;
  onOpenLightbox: () => void;
  t: (key: string) => string;
}): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="relative aspect-video w-full bg-muted">
        {hasUploadedPhoto ? (
          photoSrc ? (
            <button
              type="button"
              onClick={onOpenLightbox}
              className="relative block h-full w-full cursor-zoom-in overflow-hidden p-0 text-left"
            >
              <img src={photoSrc} alt="" className="h-full w-full object-cover" />
            </button>
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              aria-busy="true"
              aria-label={t('states.loading')}
            >
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" strokeWidth={2} />
            </div>
          )
        ) : (
          <div
            className="flex h-full w-full select-none items-center justify-center text-5xl"
            aria-hidden
          >
            {WISH_NO_PHOTO_EMOJI}
          </div>
        )}
      </div>
    </div>
  );
}
