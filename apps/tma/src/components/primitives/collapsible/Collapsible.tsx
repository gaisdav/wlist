import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface CollapsibleProps {
  /** Text on the toggle row (e.g. "Add details"). */
  summary: React.ReactNode;
  children: React.ReactNode;
  /**
   * Open on first render only. The value is captured at mount, so a later change
   * to it (e.g. a query resolving) can't re-open or re-close the disclosure
   * after the user has toggled it — the `<details>` stays genuinely uncontrolled.
   */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Native `<details>`-based disclosure — keyboard-accessible for free, works
 * without JS, and respects reduced motion (the chevron rotates via CSS only).
 * Use to tuck advanced/optional fields under a single tap.
 */
export const Collapsible = ({
  summary,
  children,
  defaultOpen = false,
  className,
}: CollapsibleProps): React.JSX.Element => {
  // Freeze the initial open state so React writes the `open` attribute once on
  // mount and never re-syncs it; afterwards the native <details> owns its state
  // and the user's manual toggles win, even if the `defaultOpen` prop changes.
  const [initialOpen] = useState(defaultOpen);

  return (
    <details open={initialOpen} className={clsx('group flex flex-col', className)}>
      <summary className="flex cursor-pointer list-none items-center gap-1.5 py-1 text-sm font-medium text-foreground marker:hidden [&::-webkit-details-marker]:hidden">
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
          strokeWidth={2}
          aria-hidden
        />
        {summary}
      </summary>
      <div className="flex flex-col gap-4 pt-3">{children}</div>
    </details>
  );
};
