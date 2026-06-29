import { clsx } from 'clsx';
import { forwardRef } from 'react';

import { textFieldVariants } from './textFieldVariants';

export type TextInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  className?: string;
  /** Applies the destructive border (e.g. when the field has a validation error). */
  invalid?: boolean;
};

/** Single-line text/number/date input with the shared field styling. */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, invalid, ...rest }, ref) => (
    <input
      ref={ref}
      className={textFieldVariants({ invalid, className: clsx(className) })}
      {...rest}
    />
  ),
);

TextInput.displayName = 'TextInput';
