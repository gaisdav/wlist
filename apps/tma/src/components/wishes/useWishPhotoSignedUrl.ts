import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@wlist/core/config';

import { useApiClient } from '../../providers/ApiClientProvider';

const SIGNED_URL_TTL_SEC = 3600;

/**
 * Resolves a short-lived signed read URL for `wish-photos`, or `null` while loading / on error / no path.
 *
 * Cached via TanStack Query (keyed on the storage path) so scrolling a list in and out of
 * view — or navigating away and back — doesn't re-request a signed URL that's still fresh.
 * `staleTime` is set to 80% of the signed URL's TTL so a refetch kicks in with margin before
 * the URL actually expires, instead of an `<img>` silently pointing at a dead link.
 */
export const useWishPhotoSignedUrl = (storagePath: string | null): string | null => {
  const api = useApiClient();

  const { data } = useQuery({
    queryKey: queryKeys.storage.wishPhotoSignedUrl(storagePath ?? '__disabled__'),
    queryFn: () =>
      api.storage.createWishPhotoSignedReadUrl(storagePath as string, SIGNED_URL_TTL_SEC),
    enabled: Boolean(storagePath),
    staleTime: SIGNED_URL_TTL_SEC * 0.8 * 1000,
  });

  return data ?? null;
};
