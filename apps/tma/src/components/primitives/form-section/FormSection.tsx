import { clsx } from 'clsx';

interface FormSectionProps {
  /** Section heading. Omit for an unlabeled group. */
  title?: React.ReactNode;
  /** Trailing element on the heading row (e.g. an info button). */
  action?: React.ReactNode;
  children: React.ReactNode;
  /** Draw a top divider to separate this section from the previous one. */
  divided?: boolean;
  className?: string;
}

/** A titled group of form fields with consistent spacing and an optional divider. */
export const FormSection = ({
  title,
  action,
  children,
  divided,
  className,
}: FormSectionProps): React.JSX.Element => (
  <section
    className={clsx('flex flex-col gap-4', divided && 'border-t border-border pt-4', className)}
  >
    {title ? (
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h2>
        {action}
      </div>
    ) : null}
    {children}
  </section>
);
