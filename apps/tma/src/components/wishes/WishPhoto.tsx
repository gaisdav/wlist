import { clsx } from 'clsx';
import { useState } from 'react';

import { useWishPhotoSignedUrl } from './useWishPhotoSignedUrl';

interface WishPhotoProps {
  storagePath: string | null;
  alt?: string;
  className?: string;
}

/**
 * Renders `<img>` when a signed URL is available for the private `wish-photos` object.
 * Lazy-loaded with a short fade-in once the browser actually paints it, so a list of
 * cards doesn't pop images in abruptly as their signed URLs resolve.
 */
export const WishPhoto = ({
  storagePath,
  alt = '',
  className,
}: WishPhotoProps): React.JSX.Element | null => {
  const src = useWishPhotoSignedUrl(storagePath);
  const [loaded, setLoaded] = useState(false);
  if (!src) return null;
  return (
    <img
      // Remounts (resetting `loaded`) if `src` ever changes identity — simpler than an
      // effect, and cards don't swap photos in place in practice.
      key={src}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={clsx(
        className,
        'transition-opacity duration-200 motion-reduce:transition-none',
        loaded ? 'opacity-100' : 'opacity-0',
      )}
    />
  );
};
