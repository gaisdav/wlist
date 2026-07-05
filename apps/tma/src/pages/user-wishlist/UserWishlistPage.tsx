import { getDisplayName } from '@wlist/core/entities/profile';
import { useCurrentUser } from '@wlist/core/hooks/auth';
import {
  useFollowsCounts,
  useFollowUser,
  useIsFollowing,
  useProfileById,
  useUnfollowUser,
} from '@wlist/core/hooks/social';
import { useUserWishes } from '@wlist/core/hooks/wishes';
import { Gift, Share2, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Redirect, useParams } from 'wouter';

import { UserEventsSection } from '../../components/events';
import { Button } from '../../components/primitives/button';
import { EmptyState } from '../../components/primitives/empty-state';
import { ProfileAvatar } from '../../components/primitives/profile-avatar';
import { PageLoadingPlaceholder, Skeleton } from '../../components/primitives/skeleton';
import { WishCard } from '../../components/wishes';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { useApiClient } from '../../providers/ApiClientProvider';
import { haptics } from '../../telegram/haptics';
import { share } from '../../telegram/share';
import { useTelegramBackButton } from '../../telegram/useTelegramBackButton';

/** A follow/following count rendered as a stacked, read-only stat. */
const FollowStat = ({
  value,
  label,
  isLoading,
}: {
  value: number;
  label: string;
  isLoading: boolean;
}): React.JSX.Element => (
  <div className="flex flex-1 flex-col items-center px-2 py-1">
    {isLoading ? (
      <Skeleton className="h-[18px] w-6 rounded" />
    ) : (
      <span className="text-lg font-semibold leading-none text-foreground">{value}</span>
    )}
    <span className="mt-1 text-xs text-muted">{label}</span>
  </div>
);

export const UserWishlistPage = (): React.JSX.Element => {
  const { t } = useTranslation('common');
  const { userId } = useParams<{ userId?: string }>();
  const api = useApiClient();
  const profile = useCurrentUser(api);
  const ownerProfile = useProfileById(api, userId);
  const wishes = useUserWishes(api, userId);
  const counts = useFollowsCounts(api, userId);
  const isFollowing = useIsFollowing(api, userId);
  const follow = useFollowUser(api, profile.data?.id);
  const unfollow = useUnfollowUser(api, profile.data?.id);

  useQueryErrorToast(Boolean(userId) && wishes.isError && !wishes.isLoading, t('states.error'));
  useQueryErrorToast(profile.isError && !profile.isLoading, t('states.error'));
  useQueryErrorToast(
    Boolean(userId) && ownerProfile.isError && !ownerProfile.isLoading,
    t('states.error'),
  );

  const goBack = (): void => {
    window.history.back();
  };
  useTelegramBackButton(goBack, Boolean(userId));

  if (!userId) {
    return <p className="p-4 text-sm text-muted">{t('states.error')}</p>;
  }

  // Searching for yourself lands here — send it to the own-profile hub instead
  // of rendering a stripped-down copy of your own wishlist.
  if (profile.data?.id === userId) {
    return <Redirect to="/profile" replace />;
  }

  if (wishes.isLoading || ownerProfile.isLoading) {
    return (
      <PageLoadingPlaceholder>
        <Skeleton className="mx-auto size-20 rounded-full" />
        <Skeleton className="mx-auto h-6 w-40 rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </PageLoadingPlaceholder>
    );
  }

  const owner = ownerProfile.data;
  const displayName = owner ? getDisplayName(owner) : '…';
  const fullName = owner
    ? [owner.first_name, owner.last_name].filter(Boolean).join(' ').trim()
    : '';
  const initial =
    (owner?.first_name || owner?.username || '?').trim().charAt(0).toUpperCase() || '?';
  const handle = owner?.username ? `@${owner.username}` : null;

  return (
    <div className="flex flex-col gap-5 p-4">
      <header className="flex flex-col items-center gap-3 pt-2">
        <ProfileAvatar
          photoUrl={owner?.photo_url ?? null}
          initial={initial}
          className="size-20"
          eager
        />
        <div className="flex flex-col items-center gap-0.5 text-center">
          <h1 className="text-xl font-semibold text-foreground">{fullName || displayName}</h1>
          {handle ? <p className="text-sm text-muted">{handle}</p> : null}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="inline-flex items-center gap-2"
          onClick={() => {
            haptics.impact('light');
            void share({
              target: { kind: 'user', id: userId },
              text: t('share.list_other', { name: fullName || displayName }),
            });
          }}
        >
          <Share2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          {t('actions.share')}
        </Button>

        {profile.data ? (
          <Button
            type="button"
            className="w-full max-w-xs"
            variant={isFollowing.data ? 'outline' : 'primary'}
            disabled={follow.isPending || unfollow.isPending || isFollowing.isLoading}
            onClick={() =>
              void (isFollowing.data ? unfollow.mutateAsync(userId) : follow.mutateAsync(userId))
            }
          >
            {isFollowing.data ? t('social.unfollow') : t('social.follow')}
          </Button>
        ) : null}

        <div className="flex w-full max-w-xs items-stretch rounded-xl border border-border bg-surface">
          <FollowStat
            value={counts.data?.followers ?? 0}
            label={t('profile.followers')}
            isLoading={counts.isLoading}
          />
          <span aria-hidden className="my-2 w-px self-stretch bg-border" />
          <FollowStat
            value={counts.data?.following ?? 0}
            label={t('profile.following')}
            isLoading={counts.isLoading}
          />
        </div>
      </header>

      <UserEventsSection ownerId={userId} />

      {wishes.isError ? (
        <EmptyState
          icon={WifiOff}
          tone="error"
          title={t('states.error_title')}
          description={t('states.error_description')}
          action={{ label: t('states.retry'), onClick: () => void wishes.refetch() }}
        />
      ) : !wishes.data?.length ? (
        <EmptyState
          icon={Gift}
          title={t('wishes.list.user_empty_title')}
          description={t('wishes.list.user_empty_description')}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {wishes.data.map((w) => (
            <li key={w.id}>
              <WishCard
                wish={w}
                isOwner={Boolean(profile.data?.id === w.owner_id)}
                viewerId={profile.data?.id}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
