import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { cn } from '@/lib/cn';

export interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
}

/**
 * Counts up to the value once it enters the viewport.
 * Uses rAF rather than a spring so the final frame lands exactly on `value` —
 * a KPI that settles on 12.999 would be worse than no animation at all.
 */
export function AnimatedNumber({
  value,
  format = (v) => String(Math.round(v)),
  duration = 900,
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      // easeOutExpo — fast commitment, gentle settle.
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setDisplay(value);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={cn('tabular', className)}>
      {format(display)}
    </span>
  );
}
