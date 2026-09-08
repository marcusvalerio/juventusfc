import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { riseItem } from '@/lib/motion';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { Sparkline } from '@/components/charts/Sparkline';
import { Skeleton } from '@/components/ui/States';

export interface StatCardProps {
  label: string;
  value: number;
  format?: (value: number) => string;
  hint?: string;
  trend?: { value: number; label: string };
  spark?: number[];
  sparkTone?: 'gold' | 'success' | 'danger';
  accent?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export function StatCard({
  label,
  value,
  format = (v) => String(Math.round(v)),
  hint,
  trend,
  spark,
  sparkTone = 'gold',
  accent,
  loading,
  icon,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="surface-card p-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-4 h-7 w-28" />
        <Skeleton className="mt-3 h-3 w-24" />
      </div>
    );
  }

  return (
    <motion.div
      variants={riseItem}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'group relative overflow-hidden rounded-lg border border-line bg-graphite p-5',
        'transition-colors duration-200 hover:border-line-strong',
      )}
    >
      {accent && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-gold/60 via-gold/20 to-transparent"
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        {icon && <span className="text-ink-ghost transition-colors duration-200 group-hover:text-gold [&_svg]:h-4 [&_svg]:w-4">{icon}</span>}
      </div>

      <p className="mt-3.5 font-heading text-[26px] font-medium leading-none tracking-tightest text-ink">
        <AnimatedNumber value={value} format={format} />
      </p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-2xs',
                trend.value >= 0 ? 'text-success' : 'text-danger',
              )}
            >
              {trend.value >= 0 ? (
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              ) : (
                <ArrowDownRight className="h-3 w-3" aria-hidden />
              )}
              <span className="tabular">{Math.abs(trend.value).toFixed(0)}%</span>
              <span className="text-ink-faint">{trend.label}</span>
            </span>
          )}
          {!trend && hint && <p className="truncate text-2xs text-ink-faint">{hint}</p>}
        </div>
        {spark && spark.length > 1 && <Sparkline values={spark} tone={sparkTone} />}
      </div>
    </motion.div>
  );
}
