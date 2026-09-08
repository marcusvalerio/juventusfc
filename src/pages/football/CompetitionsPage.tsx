import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trophy } from 'lucide-react';
import { PageTransition } from '@/components/motion/PageTransition';
import { PageHeader } from '@/layouts/PageHeader';
import { FilterBar } from '@/components/data/FilterBar';
import { FormModal, FormSection } from '@/components/data/FormModal';
import { DetailList, DetailSection } from '@/components/data/DetailList';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { EmptyState, Skeleton } from '@/components/ui/States';
import { riseItem, staggerContainer } from '@/lib/motion';
import { useAsync } from '@/hooks/useAsync';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useTableState } from '@/hooks/useTableState';
import { competitionsRepo, matchesRepo } from '@/services';
import { matchLabel, matchResult } from '@/services/analytics';
import { formatDateShort } from '@/lib/dates';
import { cn } from '@/lib/cn';
import type { Competition, SquadTeam } from '@/types/domain';

const TEAMS: SquadTeam[] = ['Profissional', 'Sub-20', 'Sub-17', 'Veteranos'];
const STATUSES = ['planejado', 'em andamento', 'encerrado'];

const emptyForm = { name: '', season: String(new Date().getFullYear()), organizer: '', team: TEAMS[0] as string, status: 'planejado', format: '', notes: '' };

export default function CompetitionsPage() {
  const { data, status } = useAsync(() => competitionsRepo.list(), []);
  const matches = useAsync(() => matchesRepo.list(), []);
  const [selected, setSelected] = useState<Competition | null>(null);
  const form = useDisclosure();
  const [values, setValues] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const table = useTableState<Competition>(data, ['name', 'organizer', 'season'], { pageSize: 12 });

  const relatedMatches = (competitionId: string) =>
    (matches.data ?? [])
      .filter((match) => match.competitionId === competitionId)
      .sort((a, b) => a.date.localeCompare(b.date));

  const submit = () => {
    const nextErrors: Record<string, string> = {};
    if (!values.name.trim()) nextErrors.name = 'Informe o nome do campeonato.';
    if (!values.organizer.trim()) nextErrors.organizer = 'Informe a organização responsável.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return false;
    setValues(emptyForm);
    return true;
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Futebol"
        title="Campeonatos"
        description="Competições em disputa, temporadas anteriores e as partidas vinculadas a cada uma."
        actions={
          <Button variant="primary" icon={<Plus />} onClick={form.open}>
            Novo campeonato
          </Button>
        }
      />

      <div className="mb-5">
        <FilterBar
          search={table.search}
          onSearch={table.setSearch}
          searchPlaceholder="Buscar campeonato…"
          filters={[
            { key: 'status', label: 'Status', options: STATUSES.map((value) => ({ value, label: value })) },
            { key: 'team', label: 'Equipe', options: TEAMS.map((team) => ({ value: team, label: team })) },
          ]}
          values={table.filters}
          onFilter={table.setFilter}
          onReset={table.resetFilters}
          activeCount={table.activeFilterCount}
        />
      </div>

      {status === 'loading' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-[176px] rounded-lg" />
          ))}
        </div>
      ) : table.rows.length === 0 ? (
        <div className="rounded-lg border border-line bg-graphite">
          <EmptyState compact title="Nenhum campeonato encontrado" description="Ajuste os filtros ou cadastre uma nova competição." />
        </div>
      ) : (
        <motion.ul
          variants={staggerContainer(0.05)}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {table.rows.map((competition) => {
            const related = relatedMatches(competition.id);
            const wins = related.filter((match) => matchResult(match) === 'vitoria').length;
            const played = related.filter((match) => match.status === 'encerrado').length;

            return (
              <motion.li key={competition.id} variants={riseItem}>
                <button
                  type="button"
                  onClick={() => setSelected(competition)}
                  className={cn(
                    'flex h-full w-full flex-col rounded-lg border border-line bg-graphite p-5 text-left',
                    'transition-colors duration-200 hover:border-line-strong hover:bg-surface-raised',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface-sunken text-gold">
                      <Trophy className="h-4 w-4" aria-hidden />
                    </span>
                    <StatusBadge status={competition.status} />
                  </div>

                  <p className="mt-4 font-heading text-[15px] font-medium leading-snug tracking-editorial text-ink">
                    {competition.name}
                  </p>
                  <p className="mt-1.5 text-2xs text-ink-faint">{competition.organizer}</p>

                  <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                    <Badge tone={competition.team === 'Profissional' ? 'gold' : 'neutral'}>{competition.team}</Badge>
                    <span className="tabular text-2xs text-ink-faint">
                      {played > 0 ? `${wins}/${played} vitórias` : `Temporada ${competition.season}`}
                    </span>
                  </div>
                </button>
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
        subtitle={`Temporada ${selected?.season ?? ''}`}
      >
        {selected && (
          <div className="divide-y divide-line">
            <DetailSection title="Competição">
              <DetailList
                items={[
                  { label: 'Organização', value: selected.organizer },
                  { label: 'Equipe', value: selected.team },
                  { label: 'Formato', value: selected.format },
                  { label: 'Status', value: <StatusBadge status={selected.status} /> },
                  { label: 'Observações', value: selected.notes, wide: true },
                ]}
              />
            </DetailSection>

            <DetailSection title="Partidas vinculadas">
              {relatedMatches(selected.id).length === 0 ? (
                <p className="text-[13px] text-ink-faint">Nenhuma partida vinculada a esta competição.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
                  {relatedMatches(selected.id).map((match) => (
                    <li key={match.id} className="flex items-center justify-between gap-3 px-3.5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] text-ink">{matchLabel(match)}</p>
                        <p className="text-2xs text-ink-faint">{formatDateShort(match.date)} · {match.time}</p>
                      </div>
                      {match.status === 'encerrado' ? (
                        <span className="tabular text-[13px] text-ink">
                          {match.goalsFor}
                          <span className="mx-1 text-ink-ghost">×</span>
                          {match.goalsAgainst}
                        </span>
                      ) : (
                        <StatusBadge status={match.status} />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </DetailSection>
          </div>
        )}
      </Drawer>

      <FormModal
        open={form.isOpen}
        onClose={form.close}
        title="Novo campeonato"
        description="Cadastre a competição para vincular partidas e acompanhar o desempenho."
        successMessage="Campeonato cadastrado"
        onSubmit={submit}
      >
        <FormSection title="Identificação">
          <Field label="Nome" required error={errors.name} className="sm:col-span-2">
            {({ id, invalid }) => (
              <Input
                id={id}
                invalid={invalid}
                value={values.name}
                onChange={(e) => setValues({ ...values, name: e.target.value })}
                placeholder="Ex.: Campeonato Paulista Amador — Série A"
              />
            )}
          </Field>
          <Field label="Temporada" required>
            {({ id }) => (
              <Input id={id} value={values.season} onChange={(e) => setValues({ ...values, season: e.target.value })} />
            )}
          </Field>
          <Field label="Organização" required error={errors.organizer}>
            {({ id, invalid }) => (
              <Input
                id={id}
                invalid={invalid}
                value={values.organizer}
                onChange={(e) => setValues({ ...values, organizer: e.target.value })}
                placeholder="Ex.: Liga da Mooca"
              />
            )}
          </Field>
        </FormSection>

        <FormSection title="Detalhes">
          <Field label="Equipe">
            {({ id }) => (
              <Select
                id={id}
                value={values.team}
                onChange={(e) => setValues({ ...values, team: e.target.value })}
                options={TEAMS.map((team) => ({ value: team, label: team }))}
              />
            )}
          </Field>
          <Field label="Status">
            {({ id }) => (
              <Select
                id={id}
                value={values.status}
                onChange={(e) => setValues({ ...values, status: e.target.value })}
                options={STATUSES.map((value) => ({ value, label: value }))}
              />
            )}
          </Field>
          <Field label="Formato" hint="Ex.: grupos + mata-mata" className="sm:col-span-2">
            {({ id }) => (
              <Input id={id} value={values.format} onChange={(e) => setValues({ ...values, format: e.target.value })} />
            )}
          </Field>
          <Field label="Observações" className="sm:col-span-2">
            {({ id }) => (
              <Textarea id={id} value={values.notes} onChange={(e) => setValues({ ...values, notes: e.target.value })} />
            )}
          </Field>
        </FormSection>
      </FormModal>
    </PageTransition>
  );
}
