import type { WishSlotBookingRow } from '@wlist/api';
import { useCancelSlot, useMySlotBookings } from '@wlist/core/hooks/slots';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'wouter';

import { Button } from '../../components/primitives/button';
import { PageLoadingPlaceholder, Skeleton } from '../../components/primitives/skeleton';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { useApiClient } from '../../providers/ApiClientProvider';
import { useTelegramBackButton } from '../../telegram/useTelegramBackButton';

const embeddedWish = (row: WishSlotBookingRow) => {
  const w = row.wishes;
  if (!w) return null;
  return Array.isArray(w) ? (w[0] ?? null) : w;
};

export const MyBookingsPage = (): React.JSX.Element => {
  const { t } = useTranslation('common');
  const api = useApiClient();
  const [, setLocation] = useLocation();
  const bookings = useMySlotBookings(api);
  const cancelSlot = useCancelSlot(api);
  const [actionError, setActionError] = useState<string | null>(null);

  useQueryErrorToast(bookings.isError && !bookings.isLoading, t('states.error'));

  const goBack = (): void => {
    setLocation('/me');
  };
  useTelegramBackButton(goBack, true);

  if (bookings.isLoading) {
    return (
      <PageLoadingPlaceholder>
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </PageLoadingPlaceholder>
    );
  }

  if (bookings.isError) {
    return <p className="p-4 text-sm text-muted">{t('states.error')}</p>;
  }

  const rows = bookings.data ?? [];

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex flex-col gap-1 border-b border-border pb-4">
        <h1 className="text-xl font-semibold text-foreground">{t('wishes.bookings.title')}</h1>
        <Link to="/me" className="text-sm text-primary underline">
          {t('nav.back_to_my_wishes')}
        </Link>
      </header>

      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

      {!rows.length ? (
        <p className="text-sm text-muted">{t('wishes.bookings.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => {
            const w = embeddedWish(row);
            const title = w?.title?.trim() ? w.title : t('wishes.bookings.untitled_wish');
            const isActive = row.status === 'active';
            return (
              <li
                key={row.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <Link
                    to={`/wish/${row.wish_id}`}
                    className="min-w-0 flex-1 font-medium text-primary underline"
                  >
                    {title}
                  </Link>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                      isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isActive ? t('wishes.bookings.status_active') : t('wishes.bookings.status_cancelled')}
                  </span>
                </div>
                {w?.is_archived ? (
                  <p className="text-xs text-muted">{t('wishes.bookings.archived')}</p>
                ) : null}
                {isActive ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    disabled={cancelSlot.isPending}
                    onClick={() => {
                      setActionError(null);
                      void cancelSlot
                        .mutateAsync({ slotId: row.id, wishId: row.wish_id })
                        .catch(() => {
                          setActionError(t('wishes.slots.cancel_failed'));
                        });
                    }}
                  >
                    {t('wishes.slots.cancel')}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
