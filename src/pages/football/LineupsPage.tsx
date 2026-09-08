import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Plus } from 'lucide-react';
import { PageTransition } from '@/components/motion/PageTransition';
import { PageHeader } from '@/layouts/PageHeader';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/ui/States';
import { cn } from '@/lib/cn';
import { EASE, riseItem, staggerContainer } from '@/lib/motion';
import { useAsync } from '@/hooks/useAsync';
import { lineupsRepo, matchesRepo } from '@/services';
import { competitionName, matchLabel, playerById, staffName } from '@/services/analytics';
import { formatDateLong, formatDateShort } from '@/lib/dates';
import type { Lineup, LineupEntry } from '@/types/domain';

/** Splits the starters into the rows described by the formation ("4-3-3"). */
function formationRows(formation: string, starters: LineupEntry[]) {
  const counts = formation.split('-').map(Number).filter(Boolean);
  const goalkeeper = starters.filter((entry) => entry.position === 'Goleiro');
  const outfield = starters.filter((entry) => entry.position !== 'Goleiro');

  const rows: LineupEntry[][] = [];
  let cursor = 0;
  counts.forEach((count) => {
    rows.push(outfield.slice(cursor, cursor + count));
    cursor += count;
  });
  const leftovers = outfield.slice(cursor);
  if (leftovers.length > 0) rows.push(leftovers);

  return [goalkeeper, ...rows].filter((row) => row.length > 0);
}

function PlayerToken({ entry, index }: { entry: LineupEntry; index: number }) {
  const player = playerById(entry.playerId);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 + index * 0.035, ease: EASE }}
      className="flex flex-col items-center gap-1.5"
    >
      <span className="tabular flex h-8 w-8 items-center justify-center rounded-full border border-line-gold bg-gold-wash font-heading text-[13px] text-gold-light">
        {entry.shirtNumber ?? '—'}
      </span>
      <span className="max-w-[76px] truncate text-center text-[10px] leading-tight text-ink-muted">
        {player?.nickname ?? player?.name.split(' ')[0] ?? '—'}
      </span>
    </motion.div>
  );
}

/** Match-sheet pitch: rows derived from the formation, not tactical analysis. */
function Pitch({ lineup }: { lineup: Lineup }) {
  const starters = lineup.entries.filter((entry) => entry.slot === 'titular');
  const rows = useMemo(() => formationRows(lineup.formation, starters), [lineup.formation, starters]);

  return (
    <div className="relative flex h-[460px] flex-col overflow-hidden rounded-lg border border-line bg-surface-sunken px-4 py-7">
      {/* Pitch markings, kept faint so the names stay the subject */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-6 inset-y-4 rounded border border-line" />
        <div className="absolute inset-x-6 top-1/2 h-px bg-line" />
        <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line" />
      </div>

      {/* Rows spread across the full height so the shape reads as a formation. */}
      <div className="relative flex flex-1 flex-col-reverse justify-between gap-6">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex items-start justify-around gap-2">
            {row.map((entry, index) => (
              <PlayerToken key={entry.playerId} entry={entry} index={rowIndex * 4 + index} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LineupsPage() {
  const lineups = useAsync(() => lineupsRepo.list(), []);
  const matches = useAsync(() => matchesRepo.list(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = lineups.data ?? [];
  const current = list.find((lineup) => lineup.id === selectedId) ?? list[0];
  const match = (matches.data ?? []).find((item) => item.id === current?.matchId);

  const starters = current?.entries.filter((entry) => entry.slot === 'titular') ?? [];
  const reserves = current?.entries.filter((entry) => entry.slot === 'reserva') ?? [];

  if (lineups.status === 'loading') {
    return (
      <PageTransition>
        <PageHeader eyebrow="Futebol" title="Escalações" />
        <LoadingState label="Carregando fichas de partida" />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Futebol"
        title="Escalações"
        description="Ficha de partida com titulares, reservas e comissão técnica relacionada."
        actions={
          <Button variant="primary" icon={<Plus />}>
            Nova escalação
          </Button>
        }
      />

      {list.length === 0 ? (
        <div className="rounded-lg border border-line bg-graphite">
          <EmptyState
            icon={<ClipboardList />}
            title="Nenhuma escalação registrada"
            description="Monte a ficha de uma partida para relacionar titulares e reservas."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[300px_1fr]">
          {/* Sheet index */}
          <motion.aside
            variants={staggerContainer(0.05)}
            initial="initial"
            animate="animate"
            className="overflow-hidden rounded-lg border border-line bg-graphite"
          >
            <p className="eyebrow border-b border-line px-5 py-3.5">Fichas</p>
            <ul className="flex flex-col">
              {list.map((lineup) => {
                const related = (matches.data ?? []).find((item) => item.id === lineup.matchId);
                const active = lineup.id === current?.id;
                return (
                  <motion.li key={lineup.id} variants={riseItem}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(lineup.id)}
                      className={cn(
                        'relative w-full border-b border-line px-5 py-4 text-left transition-colors duration-150 last:border-b-0',
                        active ? 'bg-surface-raised' : 'hover:bg-surface-raised/60',
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="lineup-active"
                          className="absolute inset-y-0 left-0 w-0.5 bg-gold"
                          aria-hidden
                        />
                      )}
                      <p className={cn('truncate text-[13px]', active ? 'text-ink' : 'text-ink-muted')}>
                        {related ? matchLabel(related) : 'Partida removida'}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-2xs text-ink-faint">
                        {related ? formatDateShort(related.date) : '—'}
                        <span className="text-ink-ghost">·</span>
                        {lineup.formation}
                      </p>
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          </motion.aside>

          {/* Match sheet */}
          {current && (
            <motion.section
              key={current.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: EASE }}
              className="overflow-hidden rounded-lg border border-line bg-graphite"
            >
              <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-6 py-5">
                <div className="min-w-0">
                  <p className="eyebrow mb-2">{match ? competitionName(match.competitionId) : 'Ficha de partida'}</p>
                  <h3 className="font-heading text-xl font-medium tracking-editorial text-ink">
                    {match ? matchLabel(match) : 'Partida removida'}
                  </h3>
                  {match && (
                    <p className="mt-1.5 text-[13px] text-ink-muted">
                      {formatDateLong(match.date)} · {match.time} · {match.location}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="gold">{current.formation}</Badge>
                  {match && <StatusBadge status={match.status} />}
                </div>
              </header>

              <div className="grid grid-cols-1 items-start gap-6 p-6 lg:grid-cols-[1fr_260px]">
                <Pitch lineup={current} />

                <div className="flex flex-col gap-6">
                  <div>
                    <p className="eyebrow mb-3">Titulares · {starters.length}</p>
                    <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
                      {starters.map((entry) => {
                        const player = playerById(entry.playerId);
                        return (
                          <li key={entry.playerId} className="flex items-center gap-3 px-3 py-2">
                            <span className="tabular w-6 shrink-0 text-2xs text-gold">{entry.shirtNumber ?? '—'}</span>
                            <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{player?.name ?? '—'}</span>
                            <span className="shrink-0 text-2xs text-ink-ghost">{entry.position.slice(0, 3)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div>
                    <p className="eyebrow mb-3">Reservas · {reserves.length}</p>
                    <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
                      {reserves.map((entry) => {
                        const player = playerById(entry.playerId);
                        return (
                          <li key={entry.playerId} className="flex items-center gap-3 px-3 py-2">
                            <span className="tabular w-6 shrink-0 text-2xs text-ink-faint">{entry.shirtNumber ?? '—'}</span>
                            <span className="min-w-0 flex-1 truncate text-[13px] text-ink-muted">{player?.name ?? '—'}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div>
                    <p className="eyebrow mb-3">Comissão</p>
                    <ul className="flex flex-col gap-1.5">
                      {current.staffIds.map((staffId) => (
                        <li key={staffId} className="text-[13px] text-ink-muted">
                          {staffName(staffId)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {current.notes && (
                <footer className="border-t border-line px-6 py-4">
                  <p className="eyebrow mb-2">Observações</p>
                  <p className="text-[13px] leading-relaxed text-ink-muted">{current.notes}</p>
                </footer>
              )}
            </motion.section>
          )}
        </div>
      )}
    </PageTransition>
  );
}
