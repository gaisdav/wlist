import { lazy, Suspense } from 'react';
import { Redirect, Route, Router, Switch } from 'wouter';

import { PageLoadingPlaceholder, Skeleton } from './components/primitives/skeleton';
import { AppLayout } from './layout/AppLayout';
import { FeedPage } from './pages/feed/FeedPage';
import { MyWishlistPage } from './pages/my-wishlist/MyWishlistPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { SearchUsersPage } from './pages/search-users/SearchUsersPage';

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

export const AppRouter = (): React.JSX.Element => (
  <Router>
    <AppLayout>
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
    </AppLayout>
  </Router>
);
