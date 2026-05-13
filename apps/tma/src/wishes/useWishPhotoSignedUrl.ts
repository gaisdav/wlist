import { useEffect, useState } from 'react';

import { useApiClient } from '../providers/ApiClientProvider';

/**
 * Resolves a short-lived signed read URL for `wish-photos`, or `null` while loading / on error / no path.
 */
export const useWishPhotoSignedUrl = (storagePath: string | null): string | null => {
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

  return src;
};
