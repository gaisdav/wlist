import { getDisplayName } from '@wlist/core/entities/profile';
import { useCurrentUser } from '@wlist/core/hooks/auth';
import { useDeleteEvent, useEvent, useEventWishes } from '@wlist/core/hooks/events';
import { useProfileById } from '@wlist/core/hooks/social';
import { calculateDaysLeft, formatDate } from '@wlist/core/lib';
import { Calendar, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'wouter';

import { Badge } from '../../components/primitives/badge';
import { Button } from '../../components/primitives/button';
import { PageLoadingPlaceholder, Skeleton } from '../../components/primitives/skeleton';
import { WishCard } from '../../components/wishes';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { useApiClient } from '../../providers/ApiClientProvider';
import { useTelegramBackButton } from '../../telegram/useTelegramBackButton';

export const EventDetailPage = (): React.JSX.Element => {
  const { t } = useTranslation('common');
  const { eventId } = useParams<{ eventId: string }>();
  const api = useApiClient();
  const [, setLocation] = useLocation();

  const profile = useCurrentUser(api);
  const event = useEvent(api, eventId);
  const wishes = useEventWishes(api, eventId);
  const deleteMut = useDeleteEvent(api);

  const ownerProfile = useProfileById(api, event.data?.owner_id);

  useQueryErrorToast(Boolean(eventId) && event.isError, t('states.error'));
  useQueryErrorToast(Boolean(eventId) && wishes.isError, t('states.error'));

  const goBack = (): void => {
    const data = event.data;
    if (!data) {
      window.history.back();
      return;
    }
    const profilePath = profile.data?.id === data.owner_id ? '/me' : `/u/${data.owner_id}`;
    setLocation(profilePath, { replace: true });
  };
  useTelegramBackButton(goBack, Boolean(eventId));

  const onDelete = async (): Promise<void> => {
    if (!eventId || !event.data) return;
    if (!window.confirm(t('events.detail.delete_confirm'))) return;
    await deleteMut.mutateAsync(eventId);
    setLocation('/me', { replace: true });
  };

  if (!eventId) {
    return <p className="p-4 text-sm text-muted">{t('states.error')}</p>;
  }

  if (event.isLoading || wishes.isLoading || profile.isLoading) {
    return (
      <PageLoadingPlaceholder>
        <Skeleton className="h-10 w-2/3 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </PageLoadingPlaceholder>
    );
  }

  if (event.isError || !event.data) {
    return <p className="p-4 text-sm text-muted">{t('states.error')}</p>;
  }

  const ev = event.data;
  const isOwner = profile.data?.id === ev.owner_id;
  const daysLeft = calculateDaysLeft(ev.event_date, ev.is_recurring_yearly);
  const ownerName = ownerProfile.data ? getDisplayName(ownerProfile.data) : '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex flex-col gap-3 border-b border-border pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs text-muted font-medium mb-1">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>
                {ev.event_date ? formatDate(ev.event_date, 'long') : 'Date not set'}
                {ev.is_recurring_yearly ? ' (Recurring)' : ''}
              </span>
            </div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight break-words">
              {ev.title}
            </h1>
            {!isOwner && ownerName ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Event by{' '}
                <Link
                  to={`/u/${ev.owner_id}`}
                  className="underline font-medium hover:text-foreground"
                >
                  {ownerName}
                </Link>
              </p>
            ) : null}
          </div>

          {isOwner ? (
            <div className="flex items-center gap-1 shrink-0">
              <Link
                to={`/event/${ev.id}/edit`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground hover:bg-muted/10 transition shadow-sm"
                title={t('actions.edit')}
              >
                <Edit className="h-4 w-4" />
              </Link>
              <Button
                type="button"
                variant="destructive"
                size="iconRound"
                className="h-9 w-9 border border-destructive/20 shadow-sm"
                disabled={deleteMut.isPending}
                onClick={() => void onDelete()}
                title={t('actions.delete')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>

        {daysLeft !== null ? (
          <div className="self-start">
            <Badge
              variant={daysLeft < 0 ? 'destructive' : 'soft'}
              size="md"
              className="py-1 px-3 rounded-xl shadow-sm text-sm"
            >
              {daysLeft < 0
                ? t('events.list.passed')
                : daysLeft === 0
                  ? t('events.list.days_left_today')
                  : daysLeft === 1
                    ? t('events.list.days_left_one', { count: daysLeft })
                    : t('events.list.days_left_other', { count: daysLeft })}
            </Badge>
          </div>
        ) : null}
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          {t('events.detail.wishes')}
        </h2>

        {wishes.isError ? (
          <p className="text-sm text-destructive">{t('states.error')}</p>
        ) : !wishes.data || wishes.data.length === 0 ? (
          <p className="text-sm text-muted">{t('events.detail.empty_wishes')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {wishes.data.map((w) => (
              <li key={w.id}>
                <WishCard
                  wish={w}
                  isOwner={profile.data?.id === w.owner_id}
                  viewerId={profile.data?.id}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
