import { clsx } from 'clsx';
import { tv, type VariantProps } from 'tailwind-variants';

export const badgeVariants = tv({
  base: 'inline-flex items-center justify-center font-medium rounded-full border transition-all select-none',
  variants: {
    variant: {
      neutral: 'bg-muted/10 border-muted/20 text-muted-foreground',
      brand: 'bg-primary border-primary text-primary-foreground',
      soft: 'bg-primary/10 border-primary/20 text-primary',
      outline: 'bg-transparent border-border text-foreground',
      brandOutline: 'bg-transparent border-primary/50 text-primary',
      success: 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400',
      destructive: 'bg-destructive/10 border-destructive/20 text-destructive',
    },
    size: {
      sm: 'px-2 py-0.5 text-xs font-semibold',
      md: 'px-2.5 py-1 text-sm font-semibold',
    },
  },
  defaultVariants: {
    variant: 'neutral',
    size: 'md',
  },
});

type TV = VariantProps<typeof badgeVariants>;

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: TV['variant'];
  size?: TV['size'];
};

export const Badge = ({
  className,
  variant = 'neutral',
  size = 'md',
  children,
  ...rest
}: BadgeProps): React.JSX.Element => {
  return (
    <span
      {...rest}
      className={badgeVariants({
        variant,
        size,
        className: clsx(className),
      })}
    >
      {children}
    </span>
  );
};
