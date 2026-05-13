import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PropsWithChildren, useState } from 'react';

import { showErrorToast } from '../lib/errorToast';

const makeQueryClient = (): QueryClient =>
  new QueryClient({
    mutationCache: new MutationCache({
      onError(_error, _variables, _context, mutation) {
        if (mutation.meta?.suppressErrorToast === true) return;
        showErrorToast();
      },
    }),
    defaultOptions: {
      queries: {
        // TMA spends a lot of time in background → don't aggressively refetch
        // and don't burn the server with retries on flaky mobile networks.
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
    },
  });

export const QueryProvider = ({ children }: PropsWithChildren): React.JSX.Element => {
  const [client] = useState(makeQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
