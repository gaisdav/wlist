import { Redirect, Route, Router, Switch } from 'wouter';

import { AppLayout } from './layout/AppLayout';
import { MyWishlistPage } from './wishes/MyWishlistPage';
import { UserWishlistPage } from './wishes/UserWishlistPage';
import { WishDetailPage } from './wishes/WishDetailPage';
import { WishFormPage } from './wishes/WishFormPage';

export const AppRouter = (): React.JSX.Element => (
  <Router>
    <AppLayout>
      <Switch>
        <Route path="/me" component={MyWishlistPage} />
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
