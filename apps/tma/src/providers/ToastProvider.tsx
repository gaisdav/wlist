import { type PropsWithChildren } from 'react';
import { Toaster } from 'sonner';

import 'sonner/dist/styles.css';

export const ToastProvider = ({ children }: PropsWithChildren): React.JSX.Element => (
  <>
    {children}
    {/* sonner renders its own `aria-live="polite"` region internally (its
     * toast list `<section>`), so toasts are already announced to screen
     * readers — do not wrap this in another live region. */}
    <Toaster
      position="bottom-center"
      closeButton
      toastOptions={{
        duration: 5_000,
        classNames: {
          toast: 'border border-border bg-surface text-foreground shadow-md',
          error: 'border-destructive/50',
          closeButton: 'border-border bg-background text-foreground hover:bg-muted',
        },
      }}
    />
  </>
);
