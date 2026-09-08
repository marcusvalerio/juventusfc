import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { EASE } from '@/lib/motion';
import { arcPath } from './geometry';

export interface DonutSlice {
  label: string;
  value: number;
}

/**
 * Category breakdown. Gold leads the palette and the remaining slices step
 * down through neutrals — the chart stays legible without turning polychrome.
 */
const PALETTE = ['#C9A227', '#E0BE55', '#8E7119', '#6A6E77', '#43474E', '#2A2D34'];

export function DonutChart({
  data,
  size = 168,
  thickness = 22,
  formatValue = String,
  className,
}: {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  const radius = size / 2;

  let cursor = 0;
  const arcs = data.map((slice, index) => {
    const angle = total === 0 ? 0 : (slice.value / total) * Math.PI * 2;
    const start = cursor;
    cursor += angle;
    return {
      ...slice,
      index,
      d: arcPath(radius, radius, radius - 2, thickness, start, start + Math.max(angle - 0.02, 0.001)),
      color: PALETTE[index % PALETTE.length],
      share: total === 0 ? 0 : (slice.value / total) * 100,
    };
  });

  const active = hover != null ? arcs[hover] : null;

  return (
    <div className={cn('flex flex-wrap items-center gap-6', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label="Distribuição por categoria">
          {arcs.map((arc) => (
            <motion.path
              key={arc.label}
              d={arc.d}
              fill={arc.color}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: hover == null || hover === arc.index ? 1 : 0.35,
                scale: 1,
              }}
              transition={{ duration: 0.5, delay: 0.08 * arc.index, ease: EASE }}
              style={{ transformOrigin: `${radius}px ${radius}px` }}
              onMouseEnter={() => setHover(arc.index)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <motion.p
            key={active?.label ?? 'total'}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="max-w-[80px] text-2xs leading-tight text-ink-faint"
          >
            {active ? active.label : 'Total'}
          </motion.p>
          <p className="tabular mt-0.5 font-heading text-[15px] text-ink">
            {formatValue(active ? active.value : total)}
          </p>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2">
        {arcs.map((arc) => (
          <li
            key={arc.label}
            onMouseEnter={() => setHover(arc.index)}
            onMouseLeave={() => setHover(null)}
            className={cn(
              'flex items-center gap-2.5 text-[13px] transition-opacity duration-150',
              hover != null && hover !== arc.index && 'opacity-45',
            )}
          >
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: arc.color }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-ink-muted">{arc.label}</span>
            <span className="tabular text-2xs text-ink-faint">{arc.share.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
