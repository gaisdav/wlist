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

  // Состояние для трекинга свайпа
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);

  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Логика анимации появления/исчезновения
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsVisible(true));
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setIsVisible(false);
      setDragY(0); // Сбрасываем сдвиг при закрытии
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Блокировка скролла и обработка Escape
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
          'absolute inset-0 bg-black/50 transition-opacity duration-300',
          isVisible ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          // Слегка уменьшаем прозрачность фона пропорционально свайпу шторки
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
            {/* Кнопка закрытия вынесена из зоны тача, чтобы не триггерить клик при свайпе */}
            <button
              type="button"
              className="-mr-2 shrink-0 rounded-full p-2 text-muted hover:text-foreground relative z-10"
              onClick={(e) => {
                e.stopPropagation(); // изолируем от drag зоны
                onClose();
              }}
              aria-label="Close dialog"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body (scrollable) - сюда возвращаем touch-автоматику для скролла */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-auto px-4 py-2">
          {bodySlot || children}
        </div>

        {/* Footer (sticky) */}
        {footerSlot && (
          <div className="shrink-0 border-t border-border/50 bg-background pb-[env(safe-area-inset-bottom)] px-4 pt-2">
            {footerSlot}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
