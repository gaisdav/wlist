import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createApiClient } from './api/createApiClient';
import { App } from './App';
import './i18n';
import { ApiClientProvider } from './providers/ApiClientProvider';
import { QueryProvider } from './providers/QueryProvider';
import { TelegramProvider } from './providers/TelegramProvider';
import './styles/globals.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root is missing from index.html');

const apiClient = createApiClient();

createRoot(rootEl).render(
  <StrictMode>
    <TelegramProvider>
      <ApiClientProvider client={apiClient}>
        <QueryProvider>
          <App />
        </QueryProvider>
      </ApiClientProvider>
    </TelegramProvider>
  </StrictMode>,
);
