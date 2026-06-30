import { clsx } from 'clsx';
import { useEffect, useState } from 'react';

/**
 * Avatar with a graceful initials fallback. Shared so the same user reads the
 * same way on the own-profile hub, on another user's wishlist, and in the
 * follows / comments sheets.
 */
export const ProfileAvatar = ({
  photoUrl,
  initial,
  className,
}: {
  photoUrl: string | null;
  initial: string;
  className?: string;
}): React.JSX.Element => {
  const [imgError, setImgError] = useState(false);

  // Reset the error flag when the source changes — a react-query cache refresh
  // can swap in a new photo_url without remounting, and a stale `true` would
  // keep the fallback initial visible over a perfectly good image.
  useEffect(() => {
    setImgError(false);
  }, [photoUrl]);

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt=""
        onError={() => setImgError(true)}
        className={clsx('size-20 shrink-0 rounded-full object-cover ring-1 ring-border', className)}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={clsx(
        'flex size-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary ring-1 ring-border',
        className,
      )}
    >
      {initial}
    </div>
  );
};
