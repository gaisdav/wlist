import { getDisplayName } from '@wlist/core/entities/profile';
import { useCurrentUser } from '@wlist/core/hooks/auth';
import { useUserLists } from '@wlist/core/hooks/lists';
import { useMySlotBookings } from '@wlist/core/hooks/slots';
import { useFollowsCounts } from '@wlist/core/hooks/social';
import { useMyWishes } from '@wlist/core/hooks/wishes';
import {
  ChevronRight,
  ClipboardList,
  FolderHeart,
  Gift,
  type LucideIcon,
  Share2,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

import { Button } from '../../components/primitives/button';
import { ProfileAvatar } from '../../components/primitives/profile-avatar';
import { Skeleton } from '../../components/primitives/skeleton';
import { UserFollowsBottomSheet } from '../../components/social';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { useApiClient } from '../../providers/ApiClientProvider';
import { haptics } from '../../telegram/haptics';
import { share } from '../../telegram/share';

/** A tappable follow/following count, styled as a stacked stat. */
const FollowStat = ({
  value,
  label,
  isLoading,
  onClick,
}: {
  value: number;
  label: string;
  isLoading: boolean;
  onClick: () => void;
}): React.JSX.Element => (
  <button
    type="button"
    onClick={onClick}
    className="flex flex-1 flex-col items-center rounded-lg px-2 py-1 transition-colors hover:bg-surface active:scale-[0.98]"
  >
    {isLoading ? (
      <Skeleton className="h-[18px] w-6 rounded" />
    ) : (
      <span className="text-lg font-semibold leading-none text-foreground">{value}</span>
    )}
    <span className="mt-1 text-xs text-muted">{label}</span>
  </button>
);

/**
 * One navigation card on the profile hub: an icon, a label, the item count,
 * and a chevron. Counts surface "how much is in here" at a glance, matching
 * the Instagram-style hub the user asked for.
 */
const HubCard = ({
  to,
  icon: Icon,
  label,
  count,
  isLoading,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  count: number;
  isLoading: boolean;
}): React.JSX.Element => (
  <Link
    to={to}
    className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-primary/40 active:scale-[0.99]"
  >
    <span
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
    >
      <Icon className="size-5" strokeWidth={1.75} />
    </span>
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-sm font-medium text-foreground">{label}</span>
      {isLoading ? (
        <Skeleton className="mt-1 h-3 w-8 rounded" />
      ) : (
        <span className="text-xs text-muted">{count}</span>
      )}
    </span>
    <ChevronRight
      className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
      strokeWidth={2}
      aria-hidden
    />
  </Link>
);

export const ProfilePage = (): React.JSX.Element => {
  const { t } = useTranslation('common');
  const api = useApiClient();
  const profile = useCurrentUser(api);
  const userId = profile.data?.id;

  const counts = useFollowsCounts(api, userId);
  const lists = useUserLists(api);
  const bookings = useMySlotBookings(api);
  const wishes = useMyWishes(api, userId);

  const [followSheet, setFollowSheet] = useState<{
    isOpen: boolean;
    initialTab: 'following' | 'followers';
  }>({
    isOpen: false,
    initialTab: 'following',
  });

  useQueryErrorToast(profile.isError && !profile.isLoading, t('states.error'));
  useQueryErrorToast(Boolean(userId) && counts.isError && !counts.isLoading, t('states.error'));
  // The hub-card counts are secondary, but a silent failure would render "0"
  // as if the user had nothing — toast so a failed count doesn't read as empty.
  useQueryErrorToast(Boolean(userId) && wishes.isError && !wishes.isLoading, t('states.error'));
  useQueryErrorToast(lists.isError && !lists.isLoading, t('states.error'));
  useQueryErrorToast(bookings.isError && !bookings.isLoading, t('states.error'));

  if (profile.isLoading) {
    return (
      <div className="flex flex-col gap-5 p-4">
        <div className="flex flex-col items-center gap-3 pt-2">
          <Skeleton className="size-20 rounded-full" />
          <div className="flex flex-col items-center gap-1.5">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          <Skeleton className="h-12 w-full max-w-xs rounded-xl" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!profile.data) {
    return <p className="p-4 text-sm text-muted">{t('states.empty')}</p>;
  }

  const { data } = profile;
  const displayName = getDisplayName(data);
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
  const initial = (data.first_name || data.username || '?').trim().charAt(0).toUpperCase() || '?';
  const handle = data.username ? `@${data.username}` : null;

  const openFollowSheet = (tab: 'following' | 'followers') => {
    setFollowSheet({ isOpen: true, initialTab: tab });
  };

  return (
    <div className="flex flex-col gap-5 p-4">
      <header className="flex flex-col items-center gap-3 pt-2">
        <ProfileAvatar photoUrl={data.photo_url} initial={initial} className="size-20" eager />
        <div className="flex flex-col items-center gap-0.5 text-center">
          <h1 className="text-xl font-semibold text-foreground">{fullName || displayName}</h1>
          {handle ? <p className="text-sm text-muted">{handle}</p> : null}
        </div>

        {userId ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="inline-flex items-center gap-2"
            onClick={() => {
              haptics.impact('light');
              void share({
                target: { kind: 'user', id: userId },
                text: t('share.profile'),
              });
            }}
          >
            <Share2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            {t('actions.share')}
          </Button>
        ) : null}

        <div className="flex w-full max-w-xs items-stretch rounded-xl border border-border bg-surface">
          <FollowStat
            value={counts.data?.followers ?? 0}
            label={t('profile.followers')}
            isLoading={Boolean(userId) && counts.isLoading}
            onClick={() => openFollowSheet('followers')}
          />
          <span aria-hidden className="my-2 w-px self-stretch bg-border" />
          <FollowStat
            value={counts.data?.following ?? 0}
            label={t('profile.following')}
            isLoading={Boolean(userId) && counts.isLoading}
            onClick={() => openFollowSheet('following')}
          />
        </div>
      </header>

      <section className="flex flex-col gap-2">
        <HubCard
          to="/me"
          icon={Gift}
          label={t('profile.cards.my_wishes')}
          count={wishes.data?.length ?? 0}
          isLoading={Boolean(userId) && wishes.isLoading}
        />
        <HubCard
          to="/me/lists"
          icon={FolderHeart}
          label={t('profile.cards.lists')}
          count={lists.data?.length ?? 0}
          isLoading={lists.isLoading}
        />
        <HubCard
          to="/me/bookings"
          icon={ClipboardList}
          label={t('profile.cards.bookings')}
          count={bookings.data?.length ?? 0}
          isLoading={bookings.isLoading}
        />
      </section>

      {userId && (
        <UserFollowsBottomSheet
          userId={userId}
          isOpen={followSheet.isOpen}
          initialTab={followSheet.initialTab}
          onClose={() => setFollowSheet((prev) => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
};
