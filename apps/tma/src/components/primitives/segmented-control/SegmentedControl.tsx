import { clsx } from 'clsx';

interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  disabled?: boolean;
  /** Accessible name for the group (e.g. "Who can see this"). */
  'aria-label'?: string;
  className?: string;
}

/**
 * Single-choice segmented control (one track, N segments) — the native pattern
 * for picking one of a few mutually-exclusive options. Built as a `radiogroup`
 * for accessibility. Segments wrap to a new line when they don't fit, so it
 * survives long localized labels instead of overflowing.
 */
export const SegmentedControl = <T extends string>({
  value,
  onChange,
  options,
  disabled,
  className,
  ...aria
}: SegmentedControlProps<T>): React.JSX.Element => (
  <div
    role="radiogroup"
    aria-label={aria['aria-label']}
    className={clsx(
      'flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1',
      className,
    )}
  >
    {options.map((opt) => {
      const isSelected = opt.value === value;
      return (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={isSelected}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={clsx(
            'min-w-0 flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium outline-none transition-colors',
            'focus-visible:ring-2 focus-visible:ring-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            isSelected
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-transparent text-muted hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);
