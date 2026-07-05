import { type Wish } from '@wlist/core/entities/wish';
import { useWishReservation } from '@wlist/core/hooks/slots';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { useApiClient } from '../../providers/ApiClientProvider';
import { Badge, type BadgeProps } from '../primitives/badge';

interface WishReservationBadgeProps {
  wish: Wish;
  isOwner: boolean;
  viewerId: string | undefined;
  /** `compact` — single line under title on detail; `inline` — on list card */
  variant?: 'compact' | 'inline';
}

export const WishReservationBadge = memo(function WishReservationBadge({
  wish,
  isOwner,
  viewerId,
  variant = 'inline',
}: WishReservationBadgeProps): React.JSX.Element | null {
  const { t } = useTranslation('common');
  const api = useApiClient();
  const { slotsQuery, summary, enabled } = useWishReservation(
    api,
    wish.id,
    wish,
    viewerId,
    isOwner,
  );

  if (!enabled) return null;

  // The detail page renders this as a plain line; the list card renders a chip.
  if (variant === 'compact') {
    if (slotsQuery.isLoading) {
      return <span className="text-sm font-medium text-foreground">…</span>;
    }
    if (!summary) return null;
    return (
      <span className="text-sm font-medium text-foreground">
        {reservationLabel(t, wish, summary)}
      </span>
    );
  }

  if (slotsQuery.isLoading) {
    return (
      <Badge size="sm" variant="neutral">
        …
      </Badge>
    );
  }

  if (!summary) return null;

  // Green when the viewer can still act (reserved by them / still available),
  // neutral once it's taken — so the actionable state is the one that pops.
  const stillActionable = summary.isReservedByMe || (!summary.isReserved && !wish.is_collaborative);
  const tone: BadgeProps['variant'] = stillActionable ? 'success' : 'neutral';

  return (
    <Badge size="sm" variant={tone}>
      {reservationLabel(t, wish, summary)}
    </Badge>
  );
});

type Summary = NonNullable<ReturnType<typeof useWishReservation>['summary']>;

const reservationLabel = (
  t: (key: string, opts?: Record<string, unknown>) => string,
  wish: Wish,
  summary: Summary,
): string => {
  if (summary.isReservedByMe) return t('wishes.reservation.reserved_by_you');
  if (wish.is_collaborative) {
    return t('wishes.reservation.slots_filled', { active: summary.activeCount, cap: summary.cap });
  }
  if (summary.isReserved) return t('wishes.reservation.reserved');
  return t('wishes.reservation.available');
};
