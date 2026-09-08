import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { EASE } from '@/lib/motion';

export function ProgressBar({
  value,
  tone = 'gold',
  className,
  label,
}: {
  value: number;
  tone?: 'gold' | 'success' | 'danger' | 'neutral';
  className?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const fill = {
    gold: 'bg-gold',
    success: 'bg-success',
    danger: 'bg-danger',
    neutral: 'bg-ink-ghost',
  }[tone];

  return (
    <div
      className={cn('h-1 w-full overflow-hidden rounded-full bg-surface-sunken', className)}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <motion.div
        className={cn('h-full rounded-full', fill)}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.85, ease: EASE, delay: 0.1 }}
      />
    </div>
  );
}
