import { clsx } from 'clsx';
import { type LucideIcon } from 'lucide-react';

import { Button } from '../button';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  isLoading?: boolean;
}

interface EmptyStateProps {
  /** Decorative glyph that sets the tone of the state. */
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Primary call-to-action. Empty screens invite an action, not just announce a void. */
  action?: EmptyStateAction;
  /** `error` tints the glyph with the destructive color (e.g. a failed load). */
  tone?: 'muted' | 'error';
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  tone = 'muted',
  className,
}: EmptyStateProps): React.JSX.Element => (
  <div
    className={clsx(
      'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
      className,
    )}
  >
    <span
      className={clsx(
        'flex h-14 w-14 items-center justify-center rounded-full',
        tone === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-surface text-muted',
      )}
      aria-hidden
    >
      <Icon className="h-7 w-7" strokeWidth={1.75} />
    </span>
    <div className="flex flex-col gap-1">
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description ? <p className="text-sm text-muted">{description}</p> : null}
    </div>
    {action ? (
      <Button
        type="button"
        variant={tone === 'error' ? 'secondary' : 'primary'}
        size="md"
        className="mt-1"
        isLoading={action.isLoading}
        onClick={action.onClick}
      >
        {action.label}
      </Button>
    ) : null}
  </div>
);
