import { useEffect, useState } from 'react';

import { useApiClient } from '../providers/ApiClientProvider';

interface WishPhotoProps {
  storagePath: string | null;
  alt?: string;
  className?: string;
}

/**
 * Resolves a short-lived signed URL for the private `wish-photos` bucket.
 */
export const WishPhoto = ({
  storagePath,
  alt = '',
  className,
}: WishPhotoProps): React.JSX.Element | null => {
  const api = useApiClient();
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!storagePath) {
      setSrc(null);
      return;
    }
    let alive = true;
    void api.storage
      .createWishPhotoSignedReadUrl(storagePath)
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        if (alive) setSrc(null);
      });
    return () => {
      alive = false;
    };
  }, [api, storagePath]);

  if (!src) return null;
  return <img src={src} alt={alt} className={className} />;
};
