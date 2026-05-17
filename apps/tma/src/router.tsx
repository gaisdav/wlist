import { lazy, Suspense } from 'react';
import { Redirect, Route, Router, Switch } from 'wouter';

import { PageLoadingPlaceholder, Skeleton } from './components/primitives/skeleton';
import { AppLayout } from './layout/AppLayout';

const FeedPage = lazy(() => import('./pages/feed/FeedPage').then((m) => ({ default: m.FeedPage })));
const MyBookingsPage = lazy(() =>
  import('./pages/my-bookings/MyBookingsPage').then((m) => ({ default: m.MyBookingsPage })),
);
const MyWishlistPage = lazy(() =>
  import('./pages/my-wishlist/MyWishlistPage').then((m) => ({ default: m.MyWishlistPage })),
);
const SearchUsersPage = lazy(() =>
  import('./pages/search-users/SearchUsersPage').then((m) => ({ default: m.SearchUsersPage })),
);
const UserFollowPage = lazy(() =>
  import('./pages/user-follow/UserFollowPage').then((m) => ({ default: m.UserFollowPage })),
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
          <Route path="/me/bookings" component={MyBookingsPage} />
          <Route path="/me" component={MyWishlistPage} />
          <Route path="/feed" component={FeedPage} />
          <Route path="/search" component={SearchUsersPage} />
          <Route path="/u/:userId/following" component={UserFollowPage} />
          <Route path="/u/:userId/followers" component={UserFollowPage} />
          <Route path="/u/:userId" component={UserWishlistPage} />
          <Route path="/wish/new">
            <WishFormPage mode="create" />
          </Route>
          <Route path="/wish/:wishId/edit">
            <WishFormPage mode="edit" />
          </Route>
          <Route path="/wish/:wishId" component={WishDetailPage} />
          <Route>
            <Redirect to="/me" replace />
          </Route>
        </Switch>
      </Suspense>
    </AppLayout>
  </Router>
);
