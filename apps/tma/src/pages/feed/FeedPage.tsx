import type { FeedEventRow } from '@wlist/api';
import { useCurrentUser } from '@wlist/core/hooks/auth';
import { useInfiniteFeed } from '@wlist/core/hooks/social';
import { formatRelativeTime } from '@wlist/core/lib';
import { Inbox, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'wouter';

import { EmptyState } from '../../components/primitives/empty-state';
import { InfiniteScrollSentinel } from '../../components/primitives/infinite-scroll-sentinel';
import { Skeleton } from '../../components/primitives/skeleton';
import { WishCard } from '../../components/wishes/WishCard';
import { WishCardSkeleton } from '../../components/wishes/WishCardSkeleton';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { useApiClient } from '../../providers/ApiClientProvider';

import { FeedItemAuthorLink } from './FeedItemAuthorLink';

const titleFromPayload = (row: FeedEventRow): string => {
  const p = row.payload as { title?: unknown };
  return typeof p.title === 'string' ? p.title : '';
};

export const FeedPage = (): React.JSX.Element => {
  const { t, i18n } = useTranslation('common');
  const [, navigate] = useLocation();
  const api = useApiClient();
  const profile = useCurrentUser(api);
  const feed = useInfiniteFeed(api);

  const flat = feed.data?.pages.flat() ?? [];

  useQueryErrorToast(feed.isError && !feed.isLoading, t('states.error'));

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="border-b border-border pb-3">
        <h1 className="text-xl font-semibold text-foreground">{t('social.feed.title')}</h1>
      </header>

      {feed.isLoading ? (
        <ul className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex flex-col gap-1.5">
              <WishCardSkeleton />
              <div className="flex items-baseline justify-between gap-3 px-0.5">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            </li>
          ))}
        </ul>
      ) : feed.isError ? (
        <EmptyState
          icon={WifiOff}
          tone="error"
          title={t('states.error_title')}
          description={t('states.error_description')}
          action={{ label: t('states.retry'), onClick: () => void feed.refetch() }}
        />
      ) : flat.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={t('social.feed.empty_title')}
          description={t('social.feed.empty_description')}
          action={{ label: t('nav.tabs.find_people'), onClick: () => navigate('/search') }}
        />
      ) : (
        <ul className="flex flex-col gap-3" aria-busy={feed.isFetchingNextPage}>
          {flat.map((row) => {
            const viewerId = profile.data?.id;

            return (
              <li key={row.id} className="flex flex-col gap-1.5">
                {row.wish ? (
                  <WishCard
                    wish={row.wish}
                    isOwner={Boolean(viewerId && row.wish.owner_id === viewerId)}
                    viewerId={viewerId}
                  />
                ) : (
                  <div className="rounded-lg border border-border bg-surface px-3 py-3 text-sm text-muted">
                    <p>{titleFromPayload(row) || t('social.feed.no_title')}</p>
                    <p className="mt-2">{t('social.feed.wish_unavailable')}</p>
                    <Link
                      className="mt-2 inline-block text-primary underline"
                      to={`/wish/${row.subject_id}`}
                    >
                      {t('social.feed.open_wish')}
                    </Link>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-3 px-0.5">
                  <FeedItemAuthorLink userId={row.actor_id} />
                  <time
                    dateTime={row.created_at}
                    className="shrink-0 text-xs tabular-nums text-muted"
                  >
                    {formatRelativeTime(row.created_at, {
                      locale: i18n.language,
                      fallbackFormat: 'dayMonthYear',
                    })}
                  </time>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {feed.hasNextPage ? (
        <InfiniteScrollSentinel
          enabled={!feed.isFetchingNextPage}
          onIntersect={() => void feed.fetchNextPage()}
        />
      ) : null}
      {feed.isFetchingNextPage ? (
        <div className="flex justify-center py-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      ) : null}
    </div>
  );
};
