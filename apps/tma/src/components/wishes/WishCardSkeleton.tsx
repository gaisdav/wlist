import { Skeleton } from '../primitives/skeleton';

export const WishCardSkeleton = (): React.JSX.Element => (
  <div className="overflow-hidden rounded-lg border border-border bg-surface">
    <div className="flex gap-3 p-3">
      <Skeleton className="h-14 w-14 shrink-0 rounded-md" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3.5 w-full rounded" />
        <Skeleton className="h-3.5 w-1/2 rounded" />
      </div>
    </div>
    <div className="flex gap-4 border-t border-border px-3 py-2">
      <Skeleton className="h-4 w-8 rounded" />
      <Skeleton className="h-4 w-8 rounded" />
      <Skeleton className="h-4 w-8 rounded" />
    </div>
  </div>
);
