import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { currency } from '@/lib/format';
import { formatMonthRef } from '@/lib/dates';
import { EASE } from '@/lib/motion';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { Skeleton } from '@/components/ui/States';
import { statusLabel, statusTone } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import type { DuesSummary } from '@/services/analytics';

export interface OpenDue {
  id: string;
  player: string;
  amount: number;
  dueDate: string;
  status: string;
}

const TONE_BG: Record<string, string> = {
  success: 'bg-success',
  warn: 'bg-warn',
  danger: 'bg-danger',
  gold: 'bg-gold',
  neutral: 'bg-ink-ghost',
  muted: 'bg-ink-ghost',
  info: 'bg-info',
};

/** Collection health for the current month, read at a glance. */
export function DuesPanel({
  summary,
  open,
  loading,
}: {
  summary?: DuesSummary;
  open?: OpenDue[];
  loading?: boolean;
}) {
  if (loading || !summary) {
    return (
      <div className="px-5 py-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-4 h-1.5 w-full" />
        <Skeleton className="mt-5 h-3 w-40" />
      </div>
    );
  }

  const rate = summary.expected === 0 ? 0 : (summary.received / summary.expected) * 100;
  const entries = Object.entries(summary.byStatus).filter(([, count]) => count > 0);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="px-5 py-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-heading text-[26px] font-medium leading-none tracking-tightest text-ink">
            <AnimatedNumber value={summary.received} format={currency} />
          </p>
          <p className="mt-1.5 text-2xs text-ink-faint">
            de {currency(summary.expected)} previstos em {formatMonthRef(summary.ref).toLowerCase()}
          </p>
        </div>
        <p className="tabular shrink-0 font-heading text-lg text-gold">
          <AnimatedNumber value={rate} format={(v) => `${Math.round(v)}%`} />
        </p>
      </div>

      {/* Segmented bar — one stripe per status, proportional to the count */}
      <div className="mt-4 flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full">
        {entries.map(([status, count], index) => (
          <motion.span
            key={status}
            className={cn('h-full rounded-full', TONE_BG[statusTone(status)])}
            initial={{ width: 0 }}
            animate={{ width: `${(count / total) * 100}%` }}
            transition={{ duration: 0.8, delay: 0.15 + index * 0.08, ease: EASE }}
          />
        ))}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {entries.map(([status, count]) => (
          <li key={status} className="flex items-center gap-2 text-2xs">
            <span className={cn('h-1.5 w-1.5 rounded-full', TONE_BG[statusTone(status)])} aria-hidden />
            <span className="flex-1 text-ink-muted">{statusLabel(status)}</span>
            <span className="tabular text-ink">{count}</span>
          </li>
        ))}
      </ul>

      {open && open.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="eyebrow mb-3">Aguardando pagamento</p>
          <ul className="flex flex-col gap-2.5">
            {open.map((due) => (
              <li key={due.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink-muted">{due.player}</span>
                <span className="tabular shrink-0 text-2xs text-ink">{currency(due.amount)}</span>
                <span
                  className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TONE_BG[statusTone(due.status)])}
                  aria-label={statusLabel(due.status)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        to="/app/mensalidades"
        className="mt-5 inline-flex text-2xs text-gold transition-colors duration-150 hover:text-gold-light"
      >
        Ver mensalidades →
      </Link>
    </div>
  );
}
