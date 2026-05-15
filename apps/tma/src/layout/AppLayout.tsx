import { clsx } from 'clsx';
import { useLocation } from 'wouter';

import { BottomTabBar, shouldShowBottomTabBar } from '../components/nav';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps): React.JSX.Element => {
  const [location] = useLocation();
  const tabBar = shouldShowBottomTabBar(location);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main
        className={clsx(
          'flex-1',
          tabBar ? 'pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))]' : 'pb-8',
        )}
      >
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
};
