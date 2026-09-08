import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { DUR, EASE } from '@/lib/motion';

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}

/** Editorial page opening: eyebrow, title, one line of intent, then actions. */
export function PageHeader({ eyebrow, title, description, actions, meta, className }: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.slow, ease: EASE }}
      className={cn('mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4', className)}
    >
      <div className="min-w-[280px] flex-1">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="font-heading text-[26px] font-medium leading-tight tracking-tightest text-ink sm:text-[30px]">
          {title}
        </h2>
        {description && (
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink-muted">{description}</p>
        )}
        {meta && <div className="mt-3">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </motion.header>
  );
}
