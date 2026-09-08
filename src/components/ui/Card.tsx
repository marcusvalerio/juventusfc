import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/cn';

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  interactive?: boolean;
  padded?: boolean;
  accent?: boolean;
  children?: React.ReactNode;
}

/**
 * Base surface. `accent` adds the thin gold rule that marks the sections
 * carrying the club's identity — used sparingly, never on every card.
 */
export function Card({ interactive, padded = true, accent, className, children, ...props }: CardProps) {
  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-lg border border-line bg-graphite',
        padded && 'p-5',
        interactive &&
          'cursor-pointer transition-colors duration-200 hover:border-line-strong hover:bg-surface-raised',
        className,
      )}
      {...props}
    >
      {accent && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent"
        />
      )}
      {children}
    </motion.div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h3 className="font-heading text-[15px] font-medium tracking-editorial text-ink">{title}</h3>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
