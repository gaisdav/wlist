import { clsx } from 'clsx';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name. Omit when `aria-labelledby` (or an external label) applies. */
  'aria-label'?: string;
  /** Id of the element labelling this switch (preferred when a visible label exists). */
  'aria-labelledby'?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Accessible on/off toggle (`role="switch"`). Use for turning a behaviour on or
 * off (e.g. group gift, recurring) — reads more nativ­ely than a checkbox in a
 * Telegram Mini App. Track animation is dropped under `prefers-reduced-motion`.
 */
export const Switch = ({
  checked,
  onChange,
  disabled,
  id,
  className,
  ...aria
}: SwitchProps): React.JSX.Element => (
  <button
    type="button"
    role="switch"
    id={id}
    aria-checked={checked}
    aria-label={aria['aria-label']}
    aria-labelledby={aria['aria-labelledby']}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={clsx(
      'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent outline-none transition-colors',
      'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'disabled:cursor-not-allowed disabled:opacity-50',
      checked ? 'bg-primary' : 'bg-muted/40',
      className,
    )}
  >
    <span
      aria-hidden
      className={clsx(
        'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none',
        checked ? 'translate-x-5' : 'translate-x-0.5',
      )}
    />
  </button>
);
