import { clsx } from 'clsx';
import { forwardRef } from 'react';

import { textFieldVariants } from './textFieldVariants';

export type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & {
  className?: string;
  invalid?: boolean;
  /** Allow vertical resize. Defaults to true (matches existing textareas). */
  resizable?: boolean;
};

/** Multi-line text input with the shared field styling. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, resizable = true, ...rest }, ref) => (
    <textarea
      ref={ref}
      className={textFieldVariants({ invalid, resizable, className: clsx(className) })}
      {...rest}
    />
  ),
);

Textarea.displayName = 'Textarea';
