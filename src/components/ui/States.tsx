import { motion } from 'framer-motion';
import { AlertTriangle, Inbox, RotateCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DUR, EASE, riseItem, staggerContainer } from '@/lib/motion';
import { Button } from './Button';

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('skeleton-sheen rounded', className)} style={style} aria-hidden />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn('h-3', index === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="flex flex-col" aria-busy="true" aria-label="Carregando registros">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 border-b border-line px-5 py-3.5 last:border-b-0"
          style={{ opacity: 1 - rowIndex * 0.09 }}
        >
          {Array.from({ length: columns }).map((__, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn('h-3', colIndex === 0 ? 'w-[22%]' : colIndex === columns - 1 ? 'w-[10%]' : 'w-[15%]')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('surface-card p-5', className)} aria-busy="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-7 w-32" />
      <Skeleton className="mt-3 h-3 w-40" />
    </div>
  );
}

/** Empty state with a small, purposeful animation — never a bouncing mascot. */
export function EmptyState({
  title,
  description,
  action,
  icon,
  compact,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <motion.div
      variants={staggerContainer(0.06)}
      initial="initial"
      animate="animate"
      className={cn('flex flex-col items-center justify-center px-6 text-center', compact ? 'py-10' : 'py-16')}
    >
      <motion.div variants={riseItem} className="relative mb-4">
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border border-line-gold"
          animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface-raised text-ink-faint [&_svg]:h-4 [&_svg]:w-4">
          {icon ?? <Inbox />}
        </span>
      </motion.div>
      <motion.p variants={riseItem} className="font-heading text-sm font-medium text-ink">
        {title}
      </motion.p>
      {description && (
        <motion.p variants={riseItem} className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-muted">
          {description}
        </motion.p>
      )}
      {action && (
        <motion.div variants={riseItem} className="mt-5">
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}

export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  return (
    <EmptyState
      icon={<AlertTriangle className="text-danger" />}
      title="Não foi possível carregar"
      description={message ?? 'Ocorreu uma falha ao buscar os dados. Tente novamente em instantes.'}
      action={
        onRetry && (
          <Button variant="secondary" size="sm" icon={<RotateCw />} onClick={onRetry}>
            Tentar novamente
          </Button>
        )
      }
    />
  );
}

/** Inline spinner for actions that replace content in place. */
export function LoadingState({ label = 'Carregando' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-[13px] text-ink-muted" role="status">
      <motion.span
        className="h-3.5 w-3.5 rounded-full border border-line-strong border-t-gold"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
        aria-hidden
      />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: DUR.slow, ease: EASE }}
      >
        {label}…
      </motion.span>
    </div>
  );
}
