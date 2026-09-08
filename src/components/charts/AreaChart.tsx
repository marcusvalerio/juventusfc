import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { EASE } from '@/lib/motion';
import { useMeasure } from '@/hooks/useMeasure';
import { smoothPath, type Point } from './geometry';

export interface AreaSeriesPoint {
  label: string;
  value: number;
}

export interface AreaChartProps {
  data: AreaSeriesPoint[];
  height?: number;
  formatValue?: (value: number) => string;
  className?: string;
}

// Side padding keeps the first and last month labels fully inside the frame.
const PADDING = { top: 16, right: 20, bottom: 24, left: 20 };

/**
 * Single-series area chart used for the running balance.
 * The line draws in once; the fill follows. Hover reads the nearest month.
 */
export function AreaChart({ data, height = 200, formatValue = String, className }: AreaChartProps) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const geometry = useMemo(() => {
    if (width === 0 || data.length === 0) return null;
    const plotWidth = width - PADDING.left - PADDING.right;
    const plotHeight = height - PADDING.top - PADDING.bottom;

    const values = data.map((d) => d.value);
    const rawMin = Math.min(...values, 0);
    const rawMax = Math.max(...values);
    const span = rawMax - rawMin || 1;
    const min = rawMin - span * 0.12;
    const max = rawMax + span * 0.14;

    const points: Point[] = data.map((d, index) => ({
      x: PADDING.left + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth),
      y: PADDING.top + plotHeight - ((d.value - min) / (max - min)) * plotHeight,
    }));

    const line = smoothPath(points);
    const area = `${line} L ${points[points.length - 1].x} ${PADDING.top + plotHeight} L ${points[0].x} ${
      PADDING.top + plotHeight
    } Z`;

    return { points, line, area, plotHeight, baseline: PADDING.top + plotHeight };
  }, [data, width, height]);

  const active = hover != null ? data[hover] : null;

  return (
    <div ref={ref} className={cn('relative w-full', className)} style={{ height }}>
      {geometry && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="Evolução do saldo por mês"
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C9A227" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#C9A227" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal rules — quiet, behind the data */}
          {[0, 0.5, 1].map((ratio) => (
            <line
              key={ratio}
              x1={PADDING.left}
              x2={width - PADDING.right}
              y1={PADDING.top + geometry.plotHeight * ratio}
              y2={PADDING.top + geometry.plotHeight * ratio}
              stroke="rgba(244,244,242,0.06)"
              strokeWidth={1}
            />
          ))}

          <motion.path
            d={geometry.area}
            fill="url(#areaFill)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45, ease: EASE }}
          />

          <motion.path
            d={geometry.line}
            fill="none"
            stroke="#C9A227"
            strokeWidth={1.75}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0.4 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.05, ease: EASE }}
          />

          {geometry.points.map((point, index) => (
            <g key={data[index].label + index}>
              {hover === index && (
                <line
                  x1={point.x}
                  x2={point.x}
                  y1={PADDING.top}
                  y2={geometry.baseline}
                  stroke="rgba(201,162,39,0.35)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              )}
              <motion.circle
                cx={point.x}
                cy={point.y}
                r={hover === index ? 4.5 : 3}
                fill="#08090B"
                stroke={hover === index ? '#E0BE55' : '#C9A227'}
                strokeWidth={1.75}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.55 + index * 0.05, ease: EASE }}
              />
              <rect
                x={point.x - (width / data.length) / 2}
                y={0}
                width={width / data.length}
                height={height}
                fill="transparent"
                onMouseEnter={() => setHover(index)}
              />
              <text
                x={point.x}
                y={height - 6}
                textAnchor="middle"
                className="fill-current text-[10px] uppercase tracking-wider"
                fill={hover === index ? '#F4F4F2' : '#6A6E77'}
              >
                {data[index].label}
              </text>
            </g>
          ))}
        </svg>
      )}

      {active && (
        <div
          className="pointer-events-none absolute top-0 rounded border border-line-strong bg-elevated px-2 py-1 shadow-raised"
          style={{
            left: Math.min(Math.max((geometry?.points[hover!].x ?? 0) - 44, 0), Math.max(width - 92, 0)),
          }}
        >
          <p className="text-2xs uppercase tracking-label text-ink-faint">{active.label}</p>
          <p className="tabular text-[13px] text-ink">{formatValue(active.value)}</p>
        </div>
      )}
    </div>
  );
}
