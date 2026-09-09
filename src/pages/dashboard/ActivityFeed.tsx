import { motion } from 'framer-motion';
import { Boxes, CircleDollarSign, Settings, Swords, UserCog } from 'lucide-react';
import { relativeTime } from '@/lib/dates';
import { riseItem, staggerContainer } from '@/lib/motion';
import { Skeleton } from '@/components/ui/States';
import type { ActivityRecord } from '@/services/analytics';

const ICONS: Record<string, React.ReactNode> = {
  financeiro: <CircleDollarSign />,
  elenco: <UserCog />,
  futebol: <Swords />,
  estoque: <Boxes />,
  sistema: <Settings />,
};

export function ActivityFeed({ records, loading }: { records: ActivityRecord[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-4 px-5 py-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="flex gap-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="mt-2 h-2.5 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.ol
      variants={staggerContainer(0.05)}
      initial="initial"
      animate="animate"
      className="relative flex flex-col px-5 py-4"
    >
      {/* Timeline spine */}
      <span className="absolute bottom-6 left-[31px] top-7 w-px bg-line" aria-hidden />

      {records.map((record) => (
        <motion.li key={record.id} variants={riseItem} className="relative flex gap-3 pb-5 last:pb-0">
          <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-graphite text-ink-faint [&_svg]:h-3 [&_svg]:w-3">
            {ICONS[record.kind] ?? ICONS.sistema}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[13px] text-ink">{record.title}</span>
              <span className="shrink-0 text-2xs text-ink-ghost">{relativeTime(record.at)}</span>
            </span>
            <span className="mt-0.5 block truncate text-2xs text-ink-muted">{record.detail}</span>
            <span className="mt-0.5 block text-2xs text-ink-ghost">{record.actor}</span>
          </span>
        </motion.li>
      ))}
    </motion.ol>
  );
}
