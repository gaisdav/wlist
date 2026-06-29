import { clsx } from 'clsx';

interface FormFieldProps {
  label: React.ReactNode;
  /** Validation message; renders in the destructive color below the control. */
  error?: string | null;
  /** Optional helper text below the control (above any error). */
  hint?: React.ReactNode;
  /** The control(s): an input, textarea, select, or custom widget. */
  children: React.ReactNode;
  className?: string;
  /**
   * When the control is itself focusable (input/textarea/select), wrap in a
   * `<label>` so the label text is clickable. For composite controls (a group
   * of buttons, a segmented control) pass `as="div"` to avoid nesting issues.
   */
  as?: 'label' | 'div';
}

/** Label + control + optional hint/error, with consistent spacing across forms. */
export const FormField = ({
  label,
  error,
  hint,
  children,
  className,
  as = 'label',
}: FormFieldProps): React.JSX.Element => {
  const Wrapper = as;
  return (
    <Wrapper className={clsx('flex flex-col gap-1', className)}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </Wrapper>
  );
};
