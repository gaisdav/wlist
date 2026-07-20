import { useUserEvents } from '@wlist/core/hooks/events';
import { calculateDaysLeft, formatDate } from '@wlist/core/lib';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

import { useApiClient } from '../../providers/ApiClientProvider';

interface UserEventsSectionProps {
  ownerId: string;
  isOwner?: boolean;
}

export const UserEventsSection = ({
  ownerId,
  isOwner = false,
}: UserEventsSectionProps): React.JSX.Element => {
  const { t } = useTranslation('common');
  const api = useApiClient();
  const { data: events, isLoading, isError } = useUserEvents(api, ownerId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="flex gap-2 overflow-x-auto pb-2">
          <div className="h-24 w-32 shrink-0 animate-pulse rounded-xl bg-muted" />
          <div className="h-24 w-32 shrink-0 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (isError) return <p className="text-sm text-destructive">{t('states.error')}</p>;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          {t('events.title')}
        </h2>
        {isOwner ? (
          <Link
            to="/event/new"
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-90"
          >
            <Plus className="h-3 w-3" />
            {t('events.list.add_event')}
          </Link>
        ) : null}
      </div>

      {!events || events.length === 0 ? (
        <p className="text-sm text-muted">{t('events.list.empty')}</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-none">
          {events.map((event) => {
            const daysLeft = calculateDaysLeft(event.event_date, event.is_recurring_yearly);
            return (
              <Link
                key={event.id}
                to={`/event/${event.id}`}
                className="block w-[140px] shrink-0 snap-start rounded-xl border border-border bg-surface p-3 transition hover:bg-muted/10 text-left shadow-sm"
              >
                <p className="truncate text-sm font-semibold text-foreground">{event.title}</p>
                {event.event_date ? (
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDate(event.event_date, 'short')}
                  </p>
                ) : null}
                {daysLeft !== null ? (
                  <p
                    className={`mt-2 text-xs font-medium ${
                      daysLeft < 0 ? 'text-destructive' : 'text-primary'
                    }`}
                  >
                    {daysLeft < 0
                      ? t('events.list.passed')
                      : daysLeft === 0
                        ? t('events.list.days_left_today')
                        : t('events.list.days_left', { count: daysLeft })}
                  </p>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
};
