import { useWishPhotoSignedUrl } from './useWishPhotoSignedUrl';

interface WishPhotoProps {
  storagePath: string | null;
  alt?: string;
  className?: string;
}

/**
 * Renders `<img>` when a signed URL is available for the private `wish-photos` object.
 */
export const WishPhoto = ({
  storagePath,
  alt = '',
  className,
}: WishPhotoProps): React.JSX.Element | null => {
  const src = useWishPhotoSignedUrl(storagePath);
  if (!src) return null;
  return <img src={src} alt={alt} className={className} />;
};
