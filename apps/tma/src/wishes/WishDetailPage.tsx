import { useCurrentUser } from '@wlist/core/hooks/auth';
import { useArchiveWish, useDeleteWish, useWish } from '@wlist/core/hooks/wishes';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'wouter';

import { useApiClient } from '../providers/ApiClientProvider';
import { useTelegramBackButton } from '../telegram/useTelegramBackButton';

import { WishPhoto } from './WishPhoto';

export const WishDetailPage = (): React.JSX.Element => {
  const { t } = useTranslation('common');
  const { wishId } = useParams<{ wishId: string }>();
  const api = useApiClient();
  const [, setLocation] = useLocation();
  const profile = useCurrentUser(api);
  const wish = useWish(api, wishId);
  const archive = useArchiveWish(api);
  const del = useDeleteWish(api);

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

  const onArchive = async (): Promise<void> => {
    await archive.mutateAsync(w.id);
    setLocation('/me');
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
    <article className="flex flex-col gap-4 p-4">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="relative aspect-video w-full bg-muted">
          <WishPhoto
            storagePath={w.photo_storage_path}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      </div>

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
          {!w.is_archived ? (
            <button
              type="button"
              disabled={archive.isPending}
              onClick={() => void onArchive()}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium"
            >
              {t('wishes.detail.archive')}
            </button>
          ) : null}
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
  );
};
