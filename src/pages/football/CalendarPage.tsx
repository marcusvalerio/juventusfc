import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Dumbbell, Swords } from 'lucide-react';
import { PageTransition } from '@/components/motion/PageTransition';
import { PageHeader } from '@/layouts/PageHeader';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/Tabs';
import { Drawer } from '@/components/ui/Drawer';
import { DetailList } from '@/components/data/DetailList';
import { EmptyState, Skeleton } from '@/components/ui/States';
import { cn } from '@/lib/cn';
import { DUR, EASE, riseItem, staggerContainer } from '@/lib/motion';
import { useAsync } from '@/hooks/useAsync';
import { buildAgenda, type AgendaEvent } from '@/services/analytics';
import { matchesRepo, trainingsRepo } from '@/services';
import {
  MONTHS_LONG,
  TODAY,
  TODAY_ISO,
  WEEKDAYS_SHORT,
  formatDateLong,
  monthGrid,
  toISODate,
} from '@/lib/dates';

const KIND_STYLE = {
  jogo: { dot: 'bg-gold', chip: 'border-line-gold bg-gold-wash text-gold-light', icon: <Swords /> },
  treino: { dot: 'bg-info', chip: 'border-[rgba(91,141,239,0.28)] bg-info-wash text-info', icon: <Dumbbell /> },
} as const;

export default function CalendarPage() {
  const { data, status } = useAsync(async () => {
    const [matches, trainings] = await Promise.all([matchesRepo.list(), trainingsRepo.list()]);
    return buildAgenda(matches, trainings);
  }, []);
  const [cursor, setCursor] = useState(() => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [view, setView] = useState<'mes' | 'semana'>('mes');
  const [selected, setSelected] = useState<AgendaEvent | null>(null);
  const [kindFilter, setKindFilter] = useState<'todos' | 'jogo' | 'treino'>('todos');

  const events = useMemo(() => {
    const list = data ?? [];
    return kindFilter === 'todos' ? list : list.filter((event) => event.kind === kindFilter);
  }, [data, kindFilter]);

  const byDate = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    events.forEach((event) => {
      const bucket = map.get(event.date) ?? [];
      bucket.push(event);
      map.set(event.date, bucket);
    });
    return map;
  }, [events]);

  const days = useMemo(() => {
    if (view === 'mes') return monthGrid(cursor.getFullYear(), cursor.getMonth());
    const start = new Date(cursor);
    start.setDate(cursor.getDate() - cursor.getDay());
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [cursor, view]);

  const shift = (direction: -1 | 1) => {
    setCursor((current) => {
      const next = new Date(current);
      if (view === 'mes') next.setMonth(current.getMonth() + direction);
      else next.setDate(current.getDate() + direction * 7);
      return next;
    });
  };

  const periodLabel =
    view === 'mes'
      ? `${MONTHS_LONG[cursor.getMonth()]} de ${cursor.getFullYear()}`
      : `Semana de ${formatDateLong(toISODate(days[0]))}`;

  const monthEvents = events.filter((event) => {
    const eventDate = new Date(`${event.date}T00:00:00`);
    return view === 'mes'
      ? eventDate.getMonth() === cursor.getMonth() && eventDate.getFullYear() === cursor.getFullYear()
      : days.some((day) => toISODate(day) === event.date);
  });

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Futebol"
        title="Calendário"
        description="Jogos, treinamentos e compromissos do clube em uma única visão."
        actions={
          <>
            <SegmentedControl
              value={kindFilter}
              onChange={(value) => setKindFilter(value as typeof kindFilter)}
              items={[
                { value: 'todos', label: 'Tudo' },
                { value: 'jogo', label: 'Jogos' },
                { value: 'treino', label: 'Treinos' },
              ]}
            />
            <SegmentedControl
              value={view}
              onChange={(value) => setView(value as 'mes' | 'semana')}
              items={[
                { value: 'mes', label: 'Mês' },
                { value: 'semana', label: 'Semana' },
              ]}
            />
          </>
        }
      />

      <div className="overflow-hidden rounded-lg border border-line bg-graphite">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div className="flex items-center gap-2">
            <IconButton label="Período anterior" onClick={() => shift(-1)} className="h-7 w-7">
              <ChevronLeft />
            </IconButton>
            <AnimatePresence mode="wait">
              <motion.p
                key={periodLabel}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: DUR.fast, ease: EASE }}
                className="min-w-[190px] text-center font-heading text-[13px] font-medium tracking-editorial text-ink first-letter:uppercase"
              >
                {periodLabel}
              </motion.p>
            </AnimatePresence>
            <IconButton label="Próximo período" onClick={() => shift(1)} className="h-7 w-7">
              <ChevronRight />
            </IconButton>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-2xs text-ink-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden /> Jogos
            </span>
            <span className="flex items-center gap-1.5 text-2xs text-ink-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-info" aria-hidden /> Treinos
            </span>
            <Button variant="ghost" size="sm" onClick={() => setCursor(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))}>
              Hoje
            </Button>
          </div>
        </div>

        {status === 'loading' ? (
          <div className="grid grid-cols-7 gap-px bg-line p-px">
            {Array.from({ length: view === 'mes' ? 42 : 7 }).map((_, index) => (
              <Skeleton key={index} className="h-[104px] rounded-none" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 border-b border-line">
              {WEEKDAYS_SHORT.map((weekday) => (
                <div key={weekday} className="px-2 py-2 text-center text-2xs uppercase tracking-label text-ink-ghost">
                  {weekday}
                </div>
              ))}
            </div>

            <motion.div
              key={`${cursor.toISOString()}-${view}`}
              variants={staggerContainer(0.008)}
              initial="initial"
              animate="animate"
              className="grid grid-cols-7 gap-px bg-line"
            >
              {days.map((day) => {
                const iso = toISODate(day);
                const dayEvents = byDate.get(iso) ?? [];
                const isCurrentMonth = view === 'semana' || day.getMonth() === cursor.getMonth();
                const isToday = iso === TODAY_ISO;

                return (
                  <motion.div
                    variants={riseItem}
                    key={iso}
                    className={cn(
                      'min-h-[104px] bg-graphite p-2 transition-colors duration-150',
                      !isCurrentMonth && 'bg-surface-sunken/60',
                      view === 'semana' && 'min-h-[220px]',
                    )}
                  >
                    <span
                      className={cn(
                        'tabular inline-flex h-5 min-w-5 items-center justify-center rounded text-2xs',
                        isToday ? 'bg-gold text-onyx' : isCurrentMonth ? 'text-ink-muted' : 'text-ink-ghost',
                      )}
                    >
                      {day.getDate()}
                    </span>

                    <div className="mt-1.5 flex flex-col gap-1">
                      {dayEvents.slice(0, view === 'semana' ? 8 : 3).map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => setSelected(event)}
                          className={cn(
                            'flex w-full items-center gap-1.5 rounded border px-1.5 py-1 text-left text-[11px] leading-tight transition-colors duration-150 hover:brightness-125',
                            KIND_STYLE[event.kind].chip,
                          )}
                        >
                          <span className="tabular shrink-0 opacity-70">{event.time}</span>
                          <span className="truncate">{event.title}</span>
                        </button>
                      ))}
                      {dayEvents.length > (view === 'semana' ? 8 : 3) && (
                        <span className="px-1.5 text-2xs text-ink-ghost">
                          +{dayEvents.length - (view === 'semana' ? 8 : 3)} evento(s)
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </>
        )}

        <div className="border-t border-line px-5 py-3">
          <p className="text-2xs text-ink-faint">
            <span className="tabular text-ink-muted">{monthEvents.length}</span> compromissos no período
          </p>
        </div>
      </div>

      {status === 'success' && monthEvents.length === 0 && (
        <div className="mt-4 rounded-lg border border-line bg-graphite">
          <EmptyState
            compact
            title="Nenhum compromisso neste período"
            description="Navegue para outro mês ou cadastre jogos e treinamentos."
          />
        </div>
      )}

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ''}
        subtitle={selected?.kind === 'jogo' ? 'Partida' : 'Treinamento'}
        width="sm"
      >
        {selected && (
          <div>
            <div className="mb-6 flex items-center gap-2">
              <Badge tone={selected.kind === 'jogo' ? 'gold' : 'info'}>
                {selected.kind === 'jogo' ? 'Jogo' : 'Treino'}
              </Badge>
              <StatusBadge status={selected.status} />
            </div>
            <DetailList
              columns={1}
              items={[
                { label: 'Data', value: formatDateLong(selected.date) },
                { label: 'Horário', value: selected.time },
                { label: 'Detalhes', value: selected.subtitle },
              ]}
            />
          </div>
        )}
      </Drawer>
    </PageTransition>
  );
}
