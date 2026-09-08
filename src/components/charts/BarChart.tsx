import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { EASE } from '@/lib/motion';

export interface BarGroup {
  label: string;
  income: number;
  expense: number;
}

/** Paired bars: entradas vs saídas per month. */
export function BarChart({
  data,
  height = 200,
  formatValue = String,
  className,
}: {
  data: BarGroup[];
  height?: number;
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = useMemo(
    () => Math.max(1, ...data.flatMap((group) => [group.income, group.expense])),
    [data],
  );

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-end gap-2" style={{ height }} onMouseLeave={() => setHover(null)}>
        {data.map((group, index) => {
          const dim = hover != null && hover !== index;
          return (
            <div
              key={group.label}
              className="group flex h-full flex-1 flex-col justify-end gap-2"
              onMouseEnter={() => setHover(index)}
            >
              <div className="relative flex h-full items-end justify-center gap-1">
                {hover === index && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -top-1 z-10 whitespace-nowrap rounded border border-line-strong bg-elevated px-2 py-1 text-2xs shadow-raised"
                  >
                    <span className="text-success">{formatValue(group.income)}</span>
                    <span className="mx-1 text-ink-ghost">/</span>
                    <span className="text-danger">{formatValue(group.expense)}</span>
                  </motion.div>
                )}
                {(['income', 'expense'] as const).map((key, seriesIndex) => (
                  <motion.div
                    key={key}
                    className={cn(
                      'w-full max-w-[18px] rounded-t-sm transition-opacity duration-200',
                      key === 'income' ? 'bg-success/70' : 'bg-danger/60',
                      dim && 'opacity-35',
                    )}
                    initial={{ height: 0 }}
                    animate={{ height: `${(group[key] / max) * 100}%` }}
                    transition={{
                      duration: 0.7,
                      delay: 0.1 + index * 0.06 + seriesIndex * 0.04,
                      ease: EASE,
                    }}
                  />
                ))}
              </div>
              <span
                className={cn(
                  'text-center text-[10px] uppercase tracking-wider transition-colors duration-150',
                  hover === index ? 'text-ink' : 'text-ink-faint',
                )}
              >
                {group.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
