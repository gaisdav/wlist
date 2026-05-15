import type { FeedEventRow } from '@wlist/api';
import { useCurrentUser } from '@wlist/core/hooks/auth';
import { useInfiniteFeed } from '@wlist/core/hooks/social';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

import { Button } from '../../components/primitives/button';
import { PageLoadingPlaceholder, Skeleton } from '../../components/primitives/skeleton';
import { WishCard } from '../../components/wishes/WishCard';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { useApiClient } from '../../providers/ApiClientProvider';

import { FeedItemAuthorLink } from './FeedItemAuthorLink';

const titleFromPayload = (row: FeedEventRow): string => {
  const p = row.payload as { title?: unknown };
  return typeof p.title === 'string' ? p.title : '';
};

const formatFeedDate = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export const FeedPage = (): React.JSX.Element => {
  const { t } = useTranslation('common');
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
        <PageLoadingPlaceholder>
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </PageLoadingPlaceholder>
      ) : feed.isError ? (
        <p className="text-sm text-destructive">{t('states.error')}</p>
      ) : flat.length === 0 ? (
        <p className="text-sm text-muted">{t('social.feed.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
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
                    {formatFeedDate(row.created_at)}
                  </time>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {feed.hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          className="self-center"
          disabled={feed.isFetchingNextPage}
          isLoading={feed.isFetchingNextPage}
          onClick={() => void feed.fetchNextPage()}
        >
          {t('social.feed.load_more')}
        </Button>
      ) : null}
    </div>
  );
};
