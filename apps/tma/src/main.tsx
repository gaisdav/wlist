import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createApiClient } from './api/createApiClient';
import { AuthGate } from './auth/AuthGate';
import './i18n';
import { ApiClientProvider } from './providers/ApiClientProvider';
import { QueryProvider } from './providers/QueryProvider';
import { TelegramProvider } from './providers/TelegramProvider';
import { ToastProvider } from './providers/ToastProvider';
import { AppRouter } from './router';
import './styles/globals.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root is missing from index.html');

const apiClient = createApiClient();

createRoot(rootEl).render(
  <StrictMode>
    <TelegramProvider>
      <ToastProvider>
        <ApiClientProvider client={apiClient}>
          <QueryProvider>
            <AuthGate>
              <AppRouter />
            </AuthGate>
          </QueryProvider>
        </ApiClientProvider>
      </ToastProvider>
    </TelegramProvider>
  </StrictMode>,
);
