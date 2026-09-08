import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { formatDateShort } from '@/lib/dates';
import { riseItem, staggerContainer } from '@/lib/motion';
import { matchResult } from '@/services/analytics';
import { Skeleton } from '@/components/ui/States';
import type { Match } from '@/types/domain';

const RESULT_STYLES = {
  vitoria: { chip: 'border-[rgba(53,183,121,0.3)] bg-success-wash text-success', letter: 'V' },
  empate: { chip: 'border-line-strong bg-surface-raised text-ink-muted', letter: 'E' },
  derrota: { chip: 'border-[rgba(224,82,82,0.3)] bg-danger-wash text-danger', letter: 'D' },
} as const;

/** Last five results, most recent first — the club's current form. */
export function ResultsStrip({ matches, loading }: { matches: Match[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="flex gap-3 px-5 py-4">
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton key={index} className="h-[72px] flex-1" />
        ))}
      </div>
    );
  }

  return (
    <motion.ul
      variants={staggerContainer(0.05)}
      initial="initial"
      animate="animate"
      className="grid grid-cols-2 gap-2.5 px-5 py-4 sm:grid-cols-3 lg:grid-cols-5"
    >
      {matches.map((match) => {
        const result = matchResult(match);
        const style = result ? RESULT_STYLES[result] : RESULT_STYLES.empate;
        return (
          <motion.li
            key={match.id}
            variants={riseItem}
            className="rounded-md border border-line bg-surface-sunken p-3 transition-colors duration-150 hover:border-line-strong"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xs text-ink-faint">{formatDateShort(match.date)}</span>
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded border text-[10px] font-medium',
                  style.chip,
                )}
              >
                {style.letter}
              </span>
            </div>
            <p className="tabular mt-2 font-heading text-lg leading-none text-ink">
              {match.goalsFor}
              <span className="mx-1 text-ink-ghost">×</span>
              {match.goalsAgainst}
            </p>
            <p className="mt-1.5 truncate text-2xs text-ink-muted" title={match.opponent}>
              {match.opponent}
            </p>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
