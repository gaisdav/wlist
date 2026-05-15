import { type Wish } from '@wlist/core/entities/wish';
import { useBookSlots, useCancelSlot, useWishReservation } from '@wlist/core/hooks/slots';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useApiClient } from '../../providers/ApiClientProvider';
import { Button } from '../primitives/button';

interface WishReservationSectionProps {
  wish: Wish;
  viewerId: string;
}

/** Booking / reservation actions for a non-owner (ordinary reserve or group-gift slots). */
export const WishReservationSection = ({
  wish,
  viewerId,
}: WishReservationSectionProps): React.JSX.Element | null => {
  const { t } = useTranslation('common');
  const api = useApiClient();
  const { slotsQuery, summary } = useWishReservation(api, wish.id, wish, viewerId, false);
  const bookSlots = useBookSlots(api);
  const cancelSlot = useCancelSlot(api);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!summary) {
    if (slotsQuery.isLoading) {
      return <p className="text-sm text-muted">{t('wishes.reservation.loading')}</p>;
    }
    return null;
  }

  const activeSlots = slotsQuery.data?.filter((s) => s.status === 'active') ?? [];
  const myActiveSlots = activeSlots.filter((s) => s.booked_by === viewerId);

  const tryBook = async (count: number): Promise<void> => {
    setActionError(null);
    try {
      await bookSlots.mutateAsync({ wishId: wish.id, count });
    } catch {
      setActionError(
        wish.is_collaborative
          ? t('wishes.slots.book_failed')
          : t('wishes.reservation.reserve_failed'),
      );
    }
  };

  const tryCancelSlot = async (slotId: string): Promise<void> => {
    setActionError(null);
    try {
      await cancelSlot.mutateAsync({ slotId, wishId: wish.id });
    } catch {
      setActionError(
        wish.is_collaborative
          ? t('wishes.slots.cancel_failed')
          : t('wishes.reservation.cancel_failed'),
      );
    }
  };

  if (wish.is_collaborative) {
    const { activeCount, cap, remaining } = summary;

    return (
      <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
        <h2 className="text-sm font-medium text-muted">{t('wishes.slots.title')}</h2>
        {slotsQuery.isLoading ? (
          <p className="text-sm text-muted">{t('wishes.slots.loading')}</p>
        ) : (
          <>
            <p className="text-sm text-foreground">
              {t('wishes.slots.filled', { active: activeCount, cap })}
            </p>
            {myActiveSlots.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-foreground">{t('wishes.reservation.reserved_by_you')}</p>
                <p className="text-sm text-muted">
                  {t('wishes.slots.your_slots', { count: myActiveSlots.length })}
                </p>
                <ul className="flex flex-col gap-1">
                  {myActiveSlots.map((s, i) => (
                    <li key={s.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-foreground">#{i + 1}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={cancelSlot.isPending}
                        onClick={() => void tryCancelSlot(s.id)}
                      >
                        {t('wishes.slots.cancel')}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={remaining < 1 || bookSlots.isPending}
                isLoading={bookSlots.isPending}
                onClick={() => void tryBook(1)}
              >
                {t('wishes.slots.book_one')}
              </Button>
              {remaining > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={bookSlots.isPending}
                  onClick={() => void tryBook(remaining)}
                >
                  {t('wishes.slots.book_remaining', { n: remaining })}
                </Button>
              ) : null}
            </div>
            {actionError ? <p className="text-xs text-destructive">{actionError}</p> : null}
          </>
        )}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
      {slotsQuery.isLoading ? (
        <p className="text-sm text-muted">{t('wishes.reservation.loading')}</p>
      ) : summary.isReservedByMe ? (
        <>
          <p className="text-sm text-foreground">{t('wishes.reservation.reserved_by_you')}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={cancelSlot.isPending}
            isLoading={cancelSlot.isPending}
            onClick={() => {
              const mine = myActiveSlots[0];
              if (mine) void tryCancelSlot(mine.id);
            }}
          >
            {t('wishes.reservation.cancel')}
          </Button>
        </>
      ) : summary.isReserved ? (
        <p className="text-sm text-muted">{t('wishes.reservation.reserved')}</p>
      ) : (
        <Button
          type="button"
          size="sm"
          disabled={!summary.canReserve || bookSlots.isPending}
          isLoading={bookSlots.isPending}
          onClick={() => void tryBook(1)}
        >
          {t('wishes.reservation.reserve')}
        </Button>
      )}
      {actionError ? <p className="text-xs text-destructive">{actionError}</p> : null}
    </section>
  );
};
