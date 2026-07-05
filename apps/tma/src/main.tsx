import { AlertTriangle } from 'lucide-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useTranslation } from 'react-i18next';

import { createApiClient } from './api/createApiClient';
import { AuthGate } from './auth/AuthGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EmptyState } from './components/primitives/empty-state';
import './i18n';
import { ApiClientProvider } from './providers/ApiClientProvider';
import { QueryProvider } from './providers/QueryProvider';
import { TelegramProvider } from './providers/TelegramProvider';
import { ToastProvider } from './providers/ToastProvider';
import { AppRouter } from './router';
import './styles/globals.css';

/**
 * Top-level, catch-all fallback. If an error escapes even the route-level
 * boundary in `router.tsx`, routing/layout itself may be broken — a hard
 * `location.reload()` is the safer recovery here rather than just resetting
 * local boundary state.
 */
const RootErrorFallback = (): React.JSX.Element => {
  const { t } = useTranslation('common');
  return (
    <div className="flex min-h-screen items-center justify-center">
      <EmptyState
        icon={AlertTriangle}
        tone="error"
        title={t('states.error_title')}
        description={t('states.error_description')}
        action={{ label: t('states.retry'), onClick: () => location.reload() }}
      />
    </div>
  );
};

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
              <ErrorBoundary fallback={() => <RootErrorFallback />}>
                <AppRouter />
              </ErrorBoundary>
            </AuthGate>
          </QueryProvider>
        </ApiClientProvider>
      </ToastProvider>
    </TelegramProvider>
  </StrictMode>,
);
