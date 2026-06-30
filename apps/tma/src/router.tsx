import { Search } from 'lucide-react';
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
const ProfilePage = lazy(() =>
  import('./pages/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const MyListsPage = lazy(() =>
  import('./pages/my-lists/MyListsPage').then((m) => ({ default: m.MyListsPage })),
);
const SearchUsersPage = lazy(() =>
  import('./pages/search-users/SearchUsersPage').then((m) => ({ default: m.SearchUsersPage })),
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

const SearchPageSkeleton = (): React.JSX.Element => (
  <div className="flex flex-col gap-4 p-4">
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        strokeWidth={1.75}
        aria-hidden
      />
      <div className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3" />
    </div>
    <ul className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2">
          <Skeleton className="size-6 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1">
            <Skeleton className="h-3.5 w-28 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
          <Skeleton className="h-7 w-16 shrink-0 rounded-md" />
        </li>
      ))}
    </ul>
  </div>
);

const ProfilePageSkeleton = (): React.JSX.Element => (
  <div className="flex flex-col gap-5 p-4">
    <div className="flex flex-col items-center gap-3 pt-2">
      <Skeleton className="size-20 rounded-full" />
      <div className="flex flex-col items-center gap-1.5">
        <Skeleton className="h-5 w-32 rounded" />
        <Skeleton className="h-4 w-20 rounded" />
      </div>
      <Skeleton className="h-12 w-full max-w-xs rounded-xl" />
    </div>
    <div className="flex flex-col gap-2">
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-16 rounded-xl" />
    </div>
  </div>
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
          <Route path="/profile">
            <Suspense fallback={<ProfilePageSkeleton />}>
              <ProfilePage />
            </Suspense>
          </Route>
          <Route path="/me/bookings" component={MyBookingsPage} />
          <Route path="/me/lists" component={MyListsPage} />
          <Route path="/me" component={MyWishlistPage} />
          <Route path="/feed" component={FeedPage} />
          <Route path="/search">
            <Suspense fallback={<SearchPageSkeleton />}>
              <SearchUsersPage />
            </Suspense>
          </Route>
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
