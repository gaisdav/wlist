import { Redirect, Route, Router, Switch } from 'wouter';

import { AppLayout } from './layout/AppLayout';
import { FeedPage } from './pages/feed/FeedPage';
import { MyBookingsPage } from './pages/my-bookings/MyBookingsPage';
import { MyWishlistPage } from './pages/my-wishlist/MyWishlistPage';
import { SearchUsersPage } from './pages/search-users/SearchUsersPage';
import { UserFollowPage } from './pages/user-follow/UserFollowPage';
import { UserWishlistPage } from './pages/user-wishlist/UserWishlistPage';
import { WishDetailPage } from './pages/wish-detail/WishDetailPage';
import { WishFormPage } from './pages/wish-form/WishFormPage';

export const AppRouter = (): React.JSX.Element => (
  <Router>
    <AppLayout>
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
    </AppLayout>
  </Router>
);
