import type { FeedEventKind, FeedEventRow } from '@wlist/api';
import { useInfiniteFeed } from '@wlist/core/hooks/social';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

import { Button } from '../../components/primitives/button';
import { PageLoadingPlaceholder, Skeleton } from '../../components/primitives/skeleton';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { useApiClient } from '../../providers/ApiClientProvider';

const feedKindLabelKey = (kind: FeedEventKind): string => {
  switch (kind) {
    case 'wish_created':
      return 'social.feed.wish_created';
    case 'wish_reposted':
      return 'social.feed.wish_reposted';
    case 'wish_collected':
      return 'social.feed.wish_collected';
    case 'slot_booked_public':
      return 'social.feed.slot_booked';
    case 'event_created':
      return 'social.feed.event_created';
    default:
      return 'social.feed.generic';
  }
};

const titleFromPayload = (row: FeedEventRow): string => {
  const p = row.payload as { title?: unknown };
  return typeof p.title === 'string' ? p.title : '';
};

export const FeedPage = (): React.JSX.Element => {
  const { t } = useTranslation('common');
  const api = useApiClient();
  const feed = useInfiniteFeed(api);

  useQueryErrorToast(feed.isError && !feed.isLoading, t('states.error'));

  const flat = feed.data?.pages.flat() ?? [];

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="border-b border-border pb-3">
        <h1 className="text-xl font-semibold text-foreground">{t('social.feed.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('social.feed.subtitle')}</p>
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
        <ul className="flex flex-col gap-2">
          {flat.map((row) => {
            const title = titleFromPayload(row);
            const label = t(feedKindLabelKey(row.kind));
            const wishHref =
              row.kind === 'wish_created' ||
              row.kind === 'wish_reposted' ||
              row.kind === 'wish_collected' ||
              row.kind === 'slot_booked_public'
                ? `/wish/${row.subject_id}`
                : null;
            return (
              <li
                key={row.id}
                className="rounded-lg border border-border bg-surface px-3 py-3 text-sm text-foreground"
              >
                <p className="text-xs text-muted">
                  {label} · {new Date(row.created_at).toLocaleString()}
                </p>
                <p className="mt-1 font-medium">{title || t('social.feed.no_title')}</p>
                {wishHref ? (
                  <Link className="mt-2 inline-block text-primary underline" to={wishHref}>
                    {t('social.feed.open_wish')}
                  </Link>
                ) : null}
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
