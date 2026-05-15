import { type Wish } from '@wlist/core/entities/wish';
import { useWishReservation } from '@wlist/core/hooks/slots';
import { useTranslation } from 'react-i18next';

import { useApiClient } from '../../providers/ApiClientProvider';

interface WishReservationBadgeProps {
  wish: Wish;
  isOwner: boolean;
  viewerId: string | undefined;
  /** `compact` — single line under title on detail; `inline` — on list card */
  variant?: 'compact' | 'inline';
}

export const WishReservationBadge = ({
  wish,
  isOwner,
  viewerId,
  variant = 'inline',
}: WishReservationBadgeProps): React.JSX.Element | null => {
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

  const className =
    variant === 'compact'
      ? 'text-sm font-medium text-foreground'
      : 'mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground';

  if (slotsQuery.isLoading) {
    return <span className={className}>…</span>;
  }

  if (!summary) return null;

  let label: string;
  if (summary.isReservedByMe) {
    label = t('wishes.reservation.reserved_by_you');
  } else if (wish.is_collaborative) {
    label = t('wishes.reservation.slots_filled', {
      active: summary.activeCount,
      cap: summary.cap,
    });
  } else if (summary.isReserved) {
    label = t('wishes.reservation.reserved');
  } else {
    label = t('wishes.reservation.available');
  }

  return <span className={className}>{label}</span>;
};
