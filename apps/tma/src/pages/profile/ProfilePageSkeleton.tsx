import { Skeleton } from '../../components/primitives/skeleton';

export const ProfilePageSkeleton = (): React.JSX.Element => (
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
