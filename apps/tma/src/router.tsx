import { AlertTriangle } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Redirect, Route, Router, Switch, useLocation } from 'wouter';

import { ErrorBoundary } from './components/ErrorBoundary';
import { EmptyState } from './components/primitives/empty-state';
import { PageLoadingPlaceholder, Skeleton } from './components/primitives/skeleton';
import { AppLayout } from './layout/AppLayout';
import { FeedPage } from './pages/feed/FeedPage';
import { MyWishlistPage } from './pages/my-wishlist/MyWishlistPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { SearchUsersPage } from './pages/search-users/SearchUsersPage';
import { useStartParamRedirect } from './telegram/useStartParamRedirect';

/**
 * Route-level fallback — a crash on one screen shouldn't take down the
 * bottom tab bar (this boundary lives inside `AppLayout`'s children, so the
 * layout survives). Just resets the boundary; navigating to another tab
 * also recovers since `resetKey={location}` clears it on route change.
 */
const RouteErrorFallback = ({ onRetry }: { onRetry: () => void }): React.JSX.Element => {
  const { t } = useTranslation('common');
  return (
    <EmptyState
      icon={AlertTriangle}
      tone="error"
      title={t('states.error_title')}
      description={t('states.error_description')}
      action={{ label: t('states.retry'), onClick: onRetry }}
    />
  );
};

const MyBookingsPage = lazy(() =>
  import('./pages/my-bookings/MyBookingsPage').then((m) => ({ default: m.MyBookingsPage })),
);
const MyListsPage = lazy(() =>
  import('./pages/my-lists/MyListsPage').then((m) => ({ default: m.MyListsPage })),
);
const UserWishlistPage = lazy(() =>
  import('./pages/user-wishlist/UserWishlistPage').then((m) => ({ default: m.UserWishlistPage })),
);
const WishDetailPage = lazy(() =>
  import('./pages/wish-detail/WishDetailPage').then((m) => ({ default: m.WishDetailPage })),
);
const WishFormPage = lazy(() =>
  import('./pages/wish-form/WishFormPage').then((m) => ({ default: m.WishFormPage })),
);
const EventDetailPage = lazy(() =>
  import('./pages/event-detail/EventDetailPage').then((m) => ({ default: m.EventDetailPage })),
);
const EventFormPage = lazy(() =>
  import('./pages/event-form/EventFormPage').then((m) => ({ default: m.EventFormPage })),
);

/**
 * Routes, plus the one-shot `startapp` deep-link redirect. Split from
 * `AppRouter` so `useStartParamRedirect` runs inside `<Router>` (it needs
 * wouter's location context).
 */
const AppRoutes = (): React.JSX.Element => {
  useStartParamRedirect();
  const [location] = useLocation();

  return (
    <AppLayout>
      <ErrorBoundary
        resetKey={location}
        fallback={(retry) => <RouteErrorFallback onRetry={retry} />}
      >
        <Suspense
          fallback={
            <PageLoadingPlaceholder>
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </PageLoadingPlaceholder>
          }
        >
          <Switch>
            <Route path="/profile" component={ProfilePage} />
            <Route path="/me/bookings" component={MyBookingsPage} />
            <Route path="/me/lists" component={MyListsPage} />
            <Route path="/me" component={MyWishlistPage} />
            <Route path="/feed" component={FeedPage} />
            <Route path="/search" component={SearchUsersPage} />
            <Route path="/u/:userId" component={UserWishlistPage} />
            <Route path="/wish/new">
              <WishFormPage mode="create" />
            </Route>
            <Route path="/wish/:wishId/edit">
              <WishFormPage mode="edit" />
            </Route>
            <Route path="/wish/:wishId" component={WishDetailPage} />
            <Route path="/event/new">
              <EventFormPage mode="create" />
            </Route>
            <Route path="/event/:eventId/edit">
              <EventFormPage mode="edit" />
            </Route>
            <Route path="/event/:eventId" component={EventDetailPage} />
            <Route>
              <Redirect to="/me" replace />
            </Route>
          </Switch>
        </Suspense>
      </ErrorBoundary>
    </AppLayout>
  );
};

export const AppRouter = (): React.JSX.Element => (
  <Router>
    <AppRoutes />
  </Router>
);
