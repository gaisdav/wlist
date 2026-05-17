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
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Redirect, useParams } from 'wouter';

import { Button } from '../../components/primitives/button';
import { PageLoadingPlaceholder, Skeleton } from '../../components/primitives/skeleton';
import { UserFollowsBottomSheet } from '../../components/social';
import { WishCard } from '../../components/wishes';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { useApiClient } from '../../providers/ApiClientProvider';
import { useTelegramBackButton } from '../../telegram/useTelegramBackButton';

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

  const [followSheet, setFollowSheet] = useState<{
    isOpen: boolean;
    initialTab: 'following' | 'followers';
  }>({
    isOpen: false,
    initialTab: 'following',
  });

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

  if (profile.data?.id === userId) {
    return <Redirect to="/me" replace />;
  }

  if (wishes.isLoading || ownerProfile.isLoading) {
    return (
      <PageLoadingPlaceholder>
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </PageLoadingPlaceholder>
    );
  }

  const displayName = ownerProfile.data ? getDisplayName(ownerProfile.data) : '…';

  const openFollowSheet = (tab: 'following' | 'followers') => {
    setFollowSheet({
      isOpen: true,
      initialTab: tab,
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex flex-col gap-3 border-b border-border pb-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-foreground">{displayName}</h1>
              <p className="text-sm text-muted">{t('wishes.list.user_title')}</p>
            </div>
            {profile.data ? (
              <Button
                type="button"
                size="sm"
                variant={isFollowing.data ? 'outline' : 'primary'}
                disabled={
                  follow.isPending || unfollow.isPending || isFollowing.isLoading || !userId
                }
                onClick={() =>
                  void (isFollowing.data
                    ? unfollow.mutateAsync(userId)
                    : follow.mutateAsync(userId))
                }
              >
                {isFollowing.data ? t('social.unfollow') : t('social.follow')}
              </Button>
            ) : null}
          </div>
          {counts.data ? (
            <div className="flex flex-wrap gap-3 text-sm text-muted">
              <button
                type="button"
                onClick={() => openFollowSheet('following')}
                className="underline hover:text-foreground transition-colors"
              >
                {t('social.counts.following', { n: counts.data.following })}
              </button>
              <button
                type="button"
                onClick={() => openFollowSheet('followers')}
                className="underline hover:text-foreground transition-colors"
              >
                {t('social.counts.followers', { n: counts.data.followers })}
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {wishes.isError ? (
        <p className="text-sm text-destructive">{t('states.error')}</p>
      ) : !wishes.data?.length ? (
        <p className="text-sm text-muted">{t('wishes.list.empty')}</p>
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
