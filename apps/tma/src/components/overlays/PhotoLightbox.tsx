import { X } from 'lucide-react';

import { Button } from '../primitives/button';

export type PhotoLightboxProps = {
  open: boolean;
  src: string | null;
  ariaLabel: string;
  closeLabel: string;
  onClose: () => void;
};

export const PhotoLightbox = ({
  open,
  src,
  ariaLabel,
  closeLabel,
  onClose,
}: PhotoLightboxProps): React.JSX.Element | null => {
  if (!open || !src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <Button
        type="button"
        variant="overlayIcon"
        className="absolute right-4 top-4 z-10"
        onClick={onClose}
        aria-label={closeLabel}
      >
        <X className="h-5 w-5" strokeWidth={2} />
      </Button>
      <img
        src={src}
        alt=""
        className="max-h-full max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};
