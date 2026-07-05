import { useEffect, useRef } from 'react';

export interface InfiniteScrollSentinelProps {
  onIntersect: () => void;
  enabled: boolean;
  rootMargin?: string;
}

/** Invisible marker that triggers `onIntersect` once it scrolls into view. Place at the end of an infinite list. */
export const InfiniteScrollSentinel = ({
  onIntersect,
  enabled,
  rootMargin = '400px',
}: InfiniteScrollSentinelProps): React.JSX.Element => {
  const ref = useRef<HTMLDivElement>(null);
  const onIntersectRef = useRef(onIntersect);
  onIntersectRef.current = onIntersect;

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onIntersectRef.current();
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return <div ref={ref} aria-hidden="true" className="h-1" />;
};
