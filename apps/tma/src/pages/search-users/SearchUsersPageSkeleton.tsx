import { Search } from 'lucide-react';

import { Skeleton } from '../../components/primitives/skeleton';

export const SearchUsersPageSkeleton = (): React.JSX.Element => (
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
