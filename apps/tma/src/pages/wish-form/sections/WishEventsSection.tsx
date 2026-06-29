import { useTranslation } from 'react-i18next';

import { badgeVariants } from '../../../components/primitives/badge';

interface WishEventsSectionProps {
  /** The viewer's events; minimal shape needed to render chips. */
  events: readonly { id: string; title: string }[] | undefined;
  selectedEventIds: string[];
  onToggleEvent: (eventId: string) => void;
  /** Navigate to the new-event screen. */
  onCreateEvent: () => void;
}

/**
 * Link the wish to one or more of the viewer's events via toggle chips, plus a
 * dashed "create event" chip that routes to the new-event screen.
 */
export const WishEventsSection = ({
  events,
  selectedEventIds,
  onToggleEvent,
  onCreateEvent,
}: WishEventsSectionProps): React.JSX.Element => {
  const { t } = useTranslation('common');

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{t('events.wish_select.label')}</span>
      <div className="flex flex-wrap gap-2">
        {events?.map((event) => {
          const isSelected = selectedEventIds.includes(event.id);
          return (
            <button
              key={event.id}
              type="button"
              className={badgeVariants({
                variant: isSelected ? 'brand' : 'neutral',
                size: 'md',
                className: 'cursor-pointer hover:opacity-90 transition-all',
              })}
              onClick={() => onToggleEvent(event.id)}
            >
              {event.title}
            </button>
          );
        })}
        <button
          type="button"
          className={badgeVariants({
            variant: 'brandOutline',
            size: 'md',
            className:
              'border-dashed cursor-pointer hover:bg-primary/5 transition-all flex items-center gap-1',
          })}
          onClick={onCreateEvent}
        >
          <span>+</span>
          <span>{t('events.list.add_event')}</span>
        </button>
      </div>
    </div>
  );
};
