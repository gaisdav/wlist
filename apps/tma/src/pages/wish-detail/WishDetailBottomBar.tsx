import { type Wish } from '@wlist/core/entities/wish';
import { useBookSlots, useCancelSlot, useWishReservation } from '@wlist/core/hooks/slots';
import { ChevronLeft, ChevronRight, Gift, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

import { showErrorToast } from '../../lib/errorToast';
import { useApiClient } from '../../providers/ApiClientProvider';
import { haptics } from '../../telegram/haptics';

interface WishDetailBottomBarProps {
  wish: Wish;
  isOwner: boolean;
  viewerId: string | undefined;
  prevWishId: string | undefined;
  nextWishId: string | undefined;
  onShare: () => void;
  /** Scrolls the page to the group-gift slots section. */
  onOpenSlots: () => void;
}

const ARROW_CLASSES =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-foreground transition-colors hover:bg-muted/10 active:scale-[0.97]';

/** Placeholder that keeps the bar's layout stable when an arrow is absent. */
const ArrowSpacer = (): React.JSX.Element => <span aria-hidden className="size-11 shrink-0" />;

/**
 * The single, non-covered action for a non-owner: reserve / cancel for ordinary
 * wishes, or a jump to the slots section for group gifts (whose multi-slot flow
 * is too rich for one bar button). Owners get no action here.
 */
const ReserveAction = ({
  wish,
  viewerId,
  onOpenSlots,
}: {
  wish: Wish;
  viewerId: string;
  onOpenSlots: () => void;
}): React.JSX.Element | null => {
  const { t } = useTranslation('common');
  const api = useApiClient();
  const { summary, slotsQuery } = useWishReservation(api, wish.id, wish, viewerId, false);
  const bookSlots = useBookSlots(api);
  const cancelSlot = useCancelSlot(api);

  if (wish.is_collaborative) {
    return (
      <button
        type="button"
        onClick={onOpenSlots}
        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 active:scale-[0.99]"
      >
        <Gift className="size-4 shrink-0" strokeWidth={2} aria-hidden />
        {t('wishes.detail.gift_slots_cta')}
      </button>
    );
  }

  // Hold the action's footprint while the slots query resolves, so the reserve
  // button doesn't pop in and nudge the bar (matches the arrows' stable layout).
  if (!summary) {
    return <span aria-hidden className="h-11 flex-1 rounded-xl bg-muted/10" />;
  }

  const myActiveSlot = (slotsQuery.data ?? []).find(
    (s) => s.status === 'active' && s.booked_by === viewerId,
  );

  const onCancel = async (): Promise<void> => {
    if (!myActiveSlot) return;
    haptics.impact('medium');
    try {
      await cancelSlot.mutateAsync({ slotId: myActiveSlot.id, wishId: wish.id });
    } catch {
      showErrorToast(t('wishes.reservation.cancel_failed'));
    }
  };

  const onReserve = async (): Promise<void> => {
    haptics.impact('medium');
    try {
      await bookSlots.mutateAsync({ wishId: wish.id, count: 1 });
    } catch {
      showErrorToast(t('wishes.reservation.reserve_failed'));
    }
  };

  if (summary.isReservedByMe) {
    return (
      <button
        type="button"
        disabled={cancelSlot.isPending}
        onClick={() => void onCancel()}
        className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted/10 active:scale-[0.99] disabled:opacity-60"
      >
        {t('wishes.reservation.cancel')}
      </button>
    );
  }

  if (summary.isReserved) {
    return (
      <span className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-muted/10 px-4 text-sm font-medium text-muted">
        {t('wishes.reservation.reserved')}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={!summary.canReserve || bookSlots.isPending}
      onClick={() => void onReserve()}
      className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60"
    >
      {t('wishes.reservation.reserve')}
    </button>
  );
};

/**
 * Fixed, non-scrolling action bar at the bottom of the wish page:
 * `[‹ prev] [ Share ] [ book/unbook ] [next ›]`. Share fills the middle and is
 * fully tappable; arrows keep their slot (spacer) when there's no sibling so the
 * layout never shifts.
 */
export const WishDetailBottomBar = ({
  wish,
  isOwner,
  viewerId,
  prevWishId,
  nextWishId,
  onShare,
  onOpenSlots,
}: WishDetailBottomBarProps): React.JSX.Element => {
  const { t } = useTranslation('common');
  const showReserve = !isOwner && !wish.is_archived && Boolean(viewerId);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-border bg-background/95 px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom,0px))] backdrop-blur supports-[backdrop-filter]:bg-background/80"
      aria-label={t('wishes.detail.action_bar')}
    >
      {prevWishId ? (
        <Link
          to={`/wish/${prevWishId}`}
          className={ARROW_CLASSES}
          aria-label={t('wishes.detail.prev_wish')}
        >
          <ChevronLeft className="size-6" strokeWidth={2} aria-hidden />
        </Link>
      ) : (
        <ArrowSpacer />
      )}

      <button
        type="button"
        onClick={onShare}
        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted/10 active:scale-[0.99]"
      >
        <Share2 className="size-4 shrink-0" strokeWidth={2} aria-hidden />
        {t('actions.share')}
      </button>

      {showReserve && viewerId ? (
        <ReserveAction wish={wish} viewerId={viewerId} onOpenSlots={onOpenSlots} />
      ) : null}

      {nextWishId ? (
        <Link
          to={`/wish/${nextWishId}`}
          className={ARROW_CLASSES}
          aria-label={t('wishes.detail.next_wish')}
        >
          <ChevronRight className="size-6" strokeWidth={2} aria-hidden />
        </Link>
      ) : (
        <ArrowSpacer />
      )}
    </nav>
  );
};
