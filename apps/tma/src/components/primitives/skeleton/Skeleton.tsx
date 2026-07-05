import { clsx } from 'clsx';

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export const Skeleton = ({ className, ...rest }: SkeletonProps): React.JSX.Element => (
  <div aria-hidden="true" className={clsx('animate-pulse bg-muted', className)} {...rest} />
);
