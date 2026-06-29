import { useId } from 'react';

import { Switch } from './Switch';

interface SwitchFieldProps {
  label: React.ReactNode;
  /** Secondary line under the label explaining what the toggle does. */
  hint?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** Label + description on the left, Switch on the right — the common toggle row. */
export const SwitchField = ({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: SwitchFieldProps): React.JSX.Element => {
  const labelId = useId();
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span id={labelId} className="text-sm font-medium text-foreground">
          {label}
        </span>
        {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} aria-labelledby={labelId} />
    </div>
  );
};
