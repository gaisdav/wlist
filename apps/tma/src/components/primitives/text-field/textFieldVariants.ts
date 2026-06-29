import { tv } from 'tailwind-variants';

/**
 * Shared control styling for text inputs, textareas and selects across forms.
 * Single source so fields don't drift (focus ring, disabled state, padding).
 */
export const textFieldVariants = tv({
  base: 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-70',
  variants: {
    invalid: {
      true: 'border-destructive focus:border-destructive',
    },
    resizable: {
      true: 'resize-y',
      false: 'resize-none',
    },
  },
});
