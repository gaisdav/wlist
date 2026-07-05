import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { popInertRoot, pushInertRoot } from '../../lib/inertRoot';
import { Button } from '../primitives/button';

import { useDialogFocusTrap } from './useFocusTrap';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const isActive = open && Boolean(src);

  // Фокус при открытии / восстановление фокуса при закрытии.
  useEffect(() => {
    if (isActive) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      containerRef.current?.focus({ preventScroll: true });
      return;
    }

    previousFocusRef.current?.focus?.();
    previousFocusRef.current = null;
  }, [isActive]);

  // Блокировка скролла, inert-фон и обработка Escape.
  useEffect(() => {
    if (!isActive) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    pushInertRoot();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      popInertRoot();
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isActive, onClose]);

  useDialogFocusTrap(containerRef, isActive);

  if (!open || !src) return null;

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
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
