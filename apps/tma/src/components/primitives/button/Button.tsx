import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import { tv, type VariantProps } from 'tailwind-variants';

export const buttonVariants = tv({
  base: 'inline-flex items-center justify-center gap-2 font-medium transition-opacity disabled:pointer-events-none disabled:opacity-50',
  variants: {
    variant: {
      primary: 'bg-primary text-primary-foreground',
      secondary: 'border border-border bg-surface text-foreground',
      outline: 'border border-border bg-transparent text-foreground',
      destructive: 'border border-destructive/50 bg-transparent text-destructive',
      ghost: 'border border-transparent bg-transparent text-foreground hover:bg-muted/20',
      link: 'inline border-0 bg-transparent p-0 font-medium text-primary underline shadow-none hover:opacity-90',
      overlayIcon: 'border-0 bg-white/10 text-white hover:bg-white/20',
      media:
        'block h-full w-full cursor-zoom-in gap-0 border-0 bg-transparent p-0 text-left shadow-none hover:opacity-[0.97]',
    },
    size: {
      sm: 'rounded-lg px-3 py-2 text-sm',
      md: 'rounded-lg px-4 py-2 text-sm',
      lg: 'rounded-lg px-4 py-3 text-sm',
      iconRound: 'rounded-full p-2',
      link: 'min-h-0 rounded-none py-0 text-sm',
      none: '',
    },
    intent: {
      default: '',
      neutral: '',
      brand: '',
      danger: '',
    },
  },
  compoundVariants: [
    {
      variant: 'outline',
      intent: 'danger',
      class: 'border-destructive/50 text-destructive',
    },
    {
      variant: 'outline',
      intent: 'brand',
      class: 'border-primary text-primary',
    },
    {
      variant: 'ghost',
      intent: 'danger',
      class: 'text-destructive hover:bg-destructive/10',
    },
  ],
  defaultVariants: {
    variant: 'primary',
    size: 'lg',
    intent: 'default',
  },
});

type TV = VariantProps<typeof buttonVariants>;

export type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
  className?: string;
  variant?: TV['variant'];
  size?: TV['size'];
  intent?: TV['intent'];
  isLoading?: boolean;
};

const showSpinner = (variant: TV['variant']): boolean =>
  variant !== 'link' && variant !== 'media' && variant !== 'overlayIcon';

export const Button = ({
  className,
  variant = 'primary',
  size: sizeProp,
  intent = 'default',
  isLoading,
  disabled,
  children,
  ...rest
}: ButtonProps): React.JSX.Element => {
  const resolvedSize =
    variant === 'link'
      ? 'link'
      : variant === 'media'
        ? 'none'
        : (sizeProp ?? (variant === 'overlayIcon' ? 'iconRound' : 'lg'));

  return (
    <button
      {...rest}
      disabled={disabled ?? isLoading}
      className={buttonVariants({
        variant,
        size: resolvedSize,
        intent,
        className: clsx(className),
      })}
    >
      {isLoading && showSpinner(variant) ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" strokeWidth={2} aria-hidden />
      ) : null}
      {children}
    </button>
  );
};
