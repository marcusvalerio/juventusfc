import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDateShort, daysBetween, TODAY_ISO } from '@/lib/dates';
import { riseItem, staggerContainer } from '@/lib/motion';
import { competitionName } from '@/services/analytics';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, Skeleton } from '@/components/ui/States';
import type { Match } from '@/types/domain';

const countdown = (date: string) => {
  const days = daysBetween(TODAY_ISO, date);
  if (days === 0) return 'hoje';
  if (days === 1) return 'amanhã';
  return `em ${days} dias`;
};

export function UpcomingMatches({ matches, loading }: { matches: Match[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 px-5 py-4">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="mt-2 h-2.5 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return <EmptyState compact title="Sem jogos no horizonte" description="Nenhuma partida agendada para os próximos dias." />;
  }

  return (
    <motion.ul variants={staggerContainer(0.05)} initial="initial" animate="animate" className="flex flex-col">
      {matches.map((match, index) => (
        <motion.li key={match.id} variants={riseItem}>
          <Link
            to="/app/jogos"
            className={cn(
              'group flex items-center gap-4 px-5 py-3.5 transition-colors duration-150 hover:bg-surface-raised',
              index > 0 && 'border-t border-line',
            )}
          >
            <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded border border-line bg-surface-sunken">
              <span className="tabular font-heading text-[15px] leading-none text-ink">
                {formatDateShort(match.date).split(' ')[0]}
              </span>
              <span className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-faint">
                {formatDateShort(match.date).split(' ')[1]}
              </span>
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-[13px] text-ink">{match.opponent}</span>
                <Badge tone={match.venue === 'mandante' ? 'gold' : 'muted'}>
                  {match.venue === 'mandante' ? 'Casa' : 'Fora'}
                </Badge>
              </span>
              <span className="mt-1 flex items-center gap-1.5 truncate text-2xs text-ink-faint">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                {match.location} · {competitionName(match.competitionId)}
              </span>
            </span>

            <span className="shrink-0 text-right">
              <span className="tabular block text-[13px] text-ink-muted">{match.time}</span>
              <span className="block text-2xs text-ink-ghost">{countdown(match.date)}</span>
            </span>

            <ArrowUpRight
              className="h-3.5 w-3.5 shrink-0 text-ink-ghost opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
              aria-hidden
            />
          </Link>
        </motion.li>
      ))}
    </motion.ul>
  );
}
