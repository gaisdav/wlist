import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { popInertRoot, pushInertRoot } from '../../../lib/inertRoot';
import { Button } from '../../primitives/button';
import { useDialogFocusTrap } from '../useFocusTrap';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  closeLabel: string;
  headerSlot?: React.ReactNode;
  bodySlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  children?: React.ReactNode;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  closeLabel,
  headerSlot,
  bodySlot,
  footerSlot,
  children,
}: BottomSheetProps) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  // Состояние для трекинга свайпа
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);

  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Логика анимации появления/исчезновения
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      setIsRendered(true);
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsVisible(true));
      });
      return () => cancelAnimationFrame(raf);
    }

    setIsVisible(false);
    setDragY(0); // Сбрасываем сдвиг при закрытии
    // Возвращаем фокус сразу по намерению закрыть, не дожидаясь fade-out таймера.
    previousFocusRef.current?.focus?.();
    previousFocusRef.current = null;
    const timer = setTimeout(() => setIsRendered(false), 300);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Переносим фокус в шторку, когда она полностью отрендерена и видима.
  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.focus({ preventScroll: true });
    }
  }, [isVisible]);

  // Блокировка скролла, inert-фон и обработка Escape
  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen, onClose]);

  useDialogFocusTrap(sheetRef, isOpen);

  // Хэндлеры для тач-событий (вешаем только на шапку)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    startYRef.current = touch.clientY;
    currentYRef.current = touch.clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    if (!touch) return;
    currentYRef.current = touch.clientY;

    const deltaY = currentYRef.current - startYRef.current;

    // Позволяем тянуть только вниз
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const deltaY = currentYRef.current - startYRef.current;
    const sheetHeight = sheetRef.current?.clientHeight || 300;

    // Если протащили ниже чем на 25% от высоты шторки — закрываем
    if (deltaY > sheetHeight * 0.25) {
      onClose();
    } else {
      // Иначе возвращаем на место
      setDragY(0);
    }
  };

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
          'absolute inset-0 bg-black/30 backdrop-blur-[2px] transition-all duration-300',
          isVisible ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          opacity:
            isDragging && sheetRef.current
              ? Math.max(0, 1 - dragY / sheetRef.current.clientHeight)
              : undefined,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        tabIndex={-1}
        className={clsx(
          'relative flex w-full flex-col rounded-t-2xl bg-background shadow-xl',
          'max-h-[min(90dvh,800px)] touch-none',
          // Включаем transition только когда НЕ тянем пальцем
          isDragging ? 'transition-none' : 'transition-transform duration-300',
          isVisible && !isDragging ? 'translate-y-0' : '',
          !isVisible && !isDragging ? 'translate-y-full' : '',
        )}
        style={{
          // Динамически сдвигаем шторку при симуляции drag-движения
          transform: isDragging ? `translateY(${dragY}px)` : undefined,
        }}
      >
        {/* Drag Zone (Шапка + хэндлер) */}
        <div
          className="select-none touch-pan-y active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Handle */}
          <div className="flex shrink-0 justify-center pb-2 pt-3" aria-hidden="true">
            <div className="h-1.5 w-12 rounded-full bg-border" />
          </div>

          {/* Header (always rendered so the close button is always reachable) */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 px-4 pb-2">
            <div className="min-w-0 flex-1">
              {headerSlot ||
                (title && (
                  <h3
                    id="bottom-sheet-title"
                    className="truncate text-base font-semibold text-foreground text-center"
                  >
                    {title}
                  </h3>
                ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="iconRound"
              className="shrink-0 text-foreground"
              onClick={onClose}
              aria-label={closeLabel}
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            </Button>
          </div>
        </div>

        {/* Body (scrollable) - сюда возвращаем touch-автоматику для скролла */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-auto px-4 py-2">
          {bodySlot || children}
        </div>

        {/* Footer (sticky) */}
        {footerSlot && (
          <div className="shrink-0 border-t border-border/50 bg-background pb-[max(1rem,env(safe-area-inset-bottom,0px))] px-4 pt-2">
            {footerSlot}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
