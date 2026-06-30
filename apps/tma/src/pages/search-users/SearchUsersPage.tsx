import type { Profile } from '@wlist/core/entities/profile';
import { getDisplayName } from '@wlist/core/entities/profile';
import { useCurrentUser } from '@wlist/core/hooks/auth';
import {
  useFollowingStatus,
  useFollowUser,
  useUnfollowUser,
  useUsersList,
} from '@wlist/core/hooks/social';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

import { Button } from '../../components/primitives/button';
import { ProfileAvatar } from '../../components/primitives/profile-avatar';
import { Skeleton } from '../../components/primitives/skeleton';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { useApiClient } from '../../providers/ApiClientProvider';

const DEBOUNCE_MS = 300;

const UserRow = ({
  user,
  isSelf,
  isFollowing,
  onFollow,
  onUnfollow,
  isPending,
}: {
  user: Profile;
  isSelf: boolean;
  isFollowing: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
  isPending: boolean;
}): React.JSX.Element => {
  const { t } = useTranslation('common');
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  const initial = (user.first_name || user.username || '?').trim().charAt(0).toUpperCase() || '?';
  const handle = user.username ? `@${user.username}` : null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2">
      <Link to={`/u/${user.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <ProfileAvatar photoUrl={user.photo_url} initial={initial} className="size-6 text-xs" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-foreground">
            {fullName || getDisplayName(user)}
          </span>
          {handle ? <span className="truncate text-xs text-muted">{handle}</span> : null}
        </span>
      </Link>
      {isSelf ? null : (
        <Button
          type="button"
          size="sm"
          variant={isFollowing ? 'outline' : 'primary'}
          className="shrink-0"
          disabled={isPending}
          onClick={isFollowing ? onUnfollow : onFollow}
        >
          {isFollowing ? t('social.unfollow') : t('social.follow')}
        </Button>
      )}
    </div>
  );
};

export const SearchUsersPage = (): React.JSX.Element => {
  const { t } = useTranslation('common');
  const api = useApiClient();

  const me = useCurrentUser(api);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');

  // Live search with debounce — no submit button, results follow typing.
  useEffect(() => {
    const id = setTimeout(() => setQuery(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [input]);

  const users = useUsersList(api, query);
  const flat = useMemo(() => users.data?.pages.flat() ?? [], [users.data]);
  const ids = useMemo(() => flat.map((u) => u.id), [flat]);
  const status = useFollowingStatus(api, ids);

  const follow = useFollowUser(api, me.data?.id);
  const unfollow = useUnfollowUser(api, me.data?.id);

  // Only the row whose toggle is in flight should disable — `variables` is the
  // id passed to the active mutateAsync, so a follow on one user leaves the rest
  // tappable.
  const pendingId = follow.isPending
    ? follow.variables
    : unfollow.isPending
      ? unfollow.variables
      : undefined;

  useQueryErrorToast(users.isError && !users.isLoading, t('states.error'));

  const isFiltering = query.length >= 2;
  const isInitialLoading = users.isLoading;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            strokeWidth={1.75}
            aria-hidden
          />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('social.search.placeholder')}
            aria-label={t('social.search.placeholder')}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        {input.trim().length === 1 ? (
          <p className="text-xs text-muted">{t('social.search.hint')}</p>
        ) : null}
      </div>

      {isInitialLoading ? (
        <ul className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2"
            >
              <Skeleton className="size-6 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1">
                <Skeleton className="h-3.5 w-28 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
              <Skeleton className="h-7 w-16 shrink-0 rounded-md" />
            </li>
          ))}
        </ul>
      ) : users.isError ? (
        <p className="text-sm text-destructive">{t('states.error')}</p>
      ) : flat.length === 0 ? (
        <p className="text-sm text-muted">
          {isFiltering ? t('social.search.no_results') : t('social.search.empty')}
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {flat.map((u) => (
              <li key={u.id}>
                <UserRow
                  user={u}
                  isSelf={u.id === me.data?.id}
                  isFollowing={Boolean(status.data?.[u.id])}
                  isPending={pendingId === u.id}
                  onFollow={() => void follow.mutateAsync(u.id)}
                  onUnfollow={() => void unfollow.mutateAsync(u.id)}
                />
              </li>
            ))}
          </ul>

          {users.hasNextPage ? (
            <Button
              type="button"
              variant="outline"
              className="self-center"
              disabled={users.isFetchingNextPage}
              isLoading={users.isFetchingNextPage}
              onClick={() => void users.fetchNextPage()}
            >
              {t('social.feed.load_more')}
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
};
