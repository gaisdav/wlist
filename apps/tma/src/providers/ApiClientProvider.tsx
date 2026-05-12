import { type ApiClient } from '@wlist/api';
import { createContext, type PropsWithChildren, useContext } from 'react';

const ApiClientContext = createContext<ApiClient | null>(null);

export interface ApiClientProviderProps extends PropsWithChildren {
  client: ApiClient;
}

export const ApiClientProvider = ({
  client,
  children,
}: ApiClientProviderProps): React.JSX.Element => (
  <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>
);

export const useApiClient = (): ApiClient => {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error('useApiClient must be used inside <ApiClientProvider>.');
  }
  return client;
};
