import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  headerSlot?: React.ReactNode;
  bodySlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  children?: React.ReactNode;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  headerSlot,
  bodySlot,
  footerSlot,
  children,
}: BottomSheetProps) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsVisible(true));
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = originalOverflow;
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isRendered) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'bottom-sheet-title' : undefined}
    >
      {/* Overlay */}
      <div
        className={clsx(
          'absolute inset-0 bg-black/50 transition-opacity duration-300',
          isVisible ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={contentRef}
        className={clsx(
          'relative flex w-full flex-col rounded-t-2xl bg-background shadow-xl transition-transform duration-300',
          'max-h-[min(90dvh,800px)]',
          isVisible ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        {/* Handle */}
        <div className="flex shrink-0 justify-center pb-2 pt-3" aria-hidden="true">
          <div className="h-1.5 w-12 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-4 pb-3">
          <div className="min-w-0 flex-1">
            {headerSlot ||
              (title && (
                <h2
                  id="bottom-sheet-title"
                  className="truncate text-lg font-semibold text-foreground"
                >
                  {title}
                </h2>
              ))}
          </div>
          <button
            type="button"
            className="-mr-2 shrink-0 rounded-full p-2 text-muted hover:text-foreground"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {bodySlot || children}
        </div>

        {/* Footer (sticky) */}
        {footerSlot && (
          <div className="shrink-0 border-t border-border/50 bg-background pb-[env(safe-area-inset-bottom)]">
            {footerSlot}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
