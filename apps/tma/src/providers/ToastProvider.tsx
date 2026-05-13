import { type PropsWithChildren } from 'react';
import { Toaster } from 'sonner';

import 'sonner/dist/styles.css';

export const ToastProvider = ({ children }: PropsWithChildren): React.JSX.Element => (
  <>
    {children}
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
