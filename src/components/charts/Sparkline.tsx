import { motion } from 'framer-motion';
import { EASE } from '@/lib/motion';
import { smoothPath, type Point } from './geometry';

/** Compact trend line for stat cards. */
export function Sparkline({
  values,
  width = 88,
  height = 28,
  tone = 'gold',
}: {
  values: number[];
  width?: number;
  height?: number;
  tone?: 'gold' | 'success' | 'danger';
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points: Point[] = values.map((value, index) => ({
    x: (index / (values.length - 1)) * (width - 2) + 1,
    y: height - 2 - ((value - min) / span) * (height - 4),
  }));

  const stroke = { gold: '#C9A227', success: '#35B779', danger: '#E05252' }[tone];

  return (
    <svg width={width} height={height} aria-hidden className="overflow-visible">
      <motion.path
        d={smoothPath(points)}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.9 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
      />
      <motion.circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={2}
        fill={stroke}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.3 }}
      />
    </svg>
  );
}
