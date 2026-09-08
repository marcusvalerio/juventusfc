import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Plus } from 'lucide-react';
import { PageTransition } from '@/components/motion/PageTransition';
import { PageHeader } from '@/layouts/PageHeader';
import { DataTable, type Column } from '@/components/data/DataTable';
import { FilterBar } from '@/components/data/FilterBar';
import { DetailList, DetailSection } from '@/components/data/DetailList';
import { FormModal, FormSection } from '@/components/data/FormModal';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Tabs } from '@/components/ui/Tabs';
import { DatePicker, Field, Input, Select, Textarea } from '@/components/ui/Field';
import { riseItem, staggerContainer } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { useAsync } from '@/hooks/useAsync';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useTableState } from '@/hooks/useTableState';
import { matchesRepo } from '@/services';
import { competitionName, matchLabel, matchResult } from '@/services/analytics';
import { competitions } from '@/data/football';
import { TODAY_ISO, formatDate, formatDateLong, formatDateShort } from '@/lib/dates';
import type { Match, SquadTeam } from '@/types/domain';

const TEAMS: SquadTeam[] = ['Profissional', 'Sub-20', 'Sub-17', 'Veteranos'];
const STATUSES = ['agendado', 'confirmado', 'encerrado', 'adiado', 'cancelado'];

const emptyForm = {
  date: '',
  time: '15:00',
  opponent: '',
  location: '',
  venue: 'mandante',
  competitionId: '',
  team: TEAMS[0] as string,
  status: 'agendado',
  notes: '',
};

const RESULT_TONE = { vitoria: 'text-success', empate: 'text-ink-muted', derrota: 'text-danger' } as const;

function Scoreline({ match }: { match: Match }) {
  const result = matchResult(match);
  if (!result) return <span className="text-2xs text-ink-ghost">—</span>;
  return (
    <span className={cn('tabular font-heading text-[15px]', RESULT_TONE[result])}>
      {match.goalsFor}
      <span className="mx-1 text-ink-ghost">×</span>
      {match.goalsAgainst}
    </span>
  );
}

export default function MatchesPage() {
  const { data, status, reload } = useAsync(() => matchesRepo.list(), []);
  const [tab, setTab] = useState('proximos');
  const [selected, setSelected] = useState<Match | null>(null);
  const form = useDisclosure();
  const [values, setValues] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const scoped = (data ?? []).filter((match) =>
    tab === 'proximos' ? match.date >= TODAY_ISO : tab === 'realizados' ? match.status === 'encerrado' : true,
  );

  const table = useTableState<Match>(scoped, ['opponent', 'location', 'team'], {
    pageSize: 10,
    initialSort: { key: 'date', direction: tab === 'proximos' ? 'asc' : 'desc' },
  });

  const columns: Column<Match>[] = [
    {
      key: 'date',
      header: 'Data',
      sortable: true,
      width: '120px',
      render: (match) => (
        <div>
          <p className="text-[13px] text-ink">{formatDateShort(match.date)}</p>
          <p className="tabular text-2xs text-ink-faint">{match.time}</p>
        </div>
      ),
    },
    {
      key: 'opponent',
      header: 'Confronto',
      sortable: true,
      render: (match) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] text-ink">{matchLabel(match)}</p>
          <p className="truncate text-2xs text-ink-faint">{competitionName(match.competitionId)}</p>
        </div>
      ),
    },
    {
      key: 'venue',
      header: 'Local',
      secondary: true,
      render: (match) => (
        <div className="min-w-0">
          <Badge tone={match.venue === 'mandante' ? 'gold' : 'muted'}>
            {match.venue === 'mandante' ? 'Casa' : 'Fora'}
          </Badge>
          <p className="mt-1 truncate text-2xs text-ink-faint">{match.location}</p>
        </div>
      ),
    },
    { key: 'team', header: 'Equipe', secondary: true, render: (match) => match.team },
    { key: 'score', header: 'Placar', align: 'center', render: (match) => <Scoreline match={match} /> },
    { key: 'status', header: 'Status', align: 'right', render: (match) => <StatusBadge status={match.status} /> },
  ];

  const submit = () => {
    const nextErrors: Record<string, string> = {};
    if (!values.date) nextErrors.date = 'Informe a data da partida.';
    if (!values.opponent.trim()) nextErrors.opponent = 'Informe o adversário.';
    if (!values.location.trim()) nextErrors.location = 'Informe o local.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return false;
    setValues(emptyForm);
    return true;
  };

  const next = (data ?? [])
    .filter((match) => match.date >= TODAY_ISO && match.status !== 'cancelado')
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Futebol"
        title="Jogos"
        description="Agenda de partidas, resultados e histórico por competição e categoria."
        actions={
          <Button variant="primary" icon={<Plus />} onClick={form.open}>
            Nova partida
          </Button>
        }
      />

      {next && (
        <motion.section
          variants={staggerContainer(0.06)}
          initial="initial"
          animate="animate"
          className="mb-6 overflow-hidden rounded-lg border border-line bg-graphite"
        >
          <span aria-hidden className="block h-px w-full bg-gradient-to-r from-gold/50 via-gold/10 to-transparent" />
          <div className="flex flex-wrap items-center justify-between gap-6 p-6">
            <motion.div variants={riseItem} className="min-w-0">
              <p className="eyebrow mb-2">Próxima partida</p>
              <h3 className="font-heading text-xl font-medium tracking-editorial text-ink sm:text-2xl">
                {matchLabel(next)}
              </h3>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted">
                <span>{formatDateLong(next.date)}</span>
                <span className="text-ink-ghost">·</span>
                <span className="tabular">{next.time}</span>
                <span className="text-ink-ghost">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {next.location}
                </span>
              </p>
            </motion.div>
            <motion.div variants={riseItem} className="flex items-center gap-2">
              <Badge tone="gold">{competitionName(next.competitionId)}</Badge>
              <StatusBadge status={next.status} />
            </motion.div>
          </div>
        </motion.section>
      )}

      <Tabs
        className="mb-5"
        value={tab}
        onChange={(value) => {
          setTab(value);
          table.setPage(1);
        }}
        items={[
          { value: 'proximos', label: 'Próximos', count: data?.filter((m) => m.date >= TODAY_ISO).length },
          { value: 'realizados', label: 'Realizados', count: data?.filter((m) => m.status === 'encerrado').length },
          { value: 'todos', label: 'Todos', count: data?.length },
        ]}
      />

      <DataTable
        columns={columns}
        rows={table.rows}
        status={status}
        sort={table.sort}
        onSort={table.toggleSort}
        onRetry={reload}
        getRowId={(match) => match.id}
        onRowClick={setSelected}
        toolbar={
          <FilterBar
            search={table.search}
            onSearch={table.setSearch}
            searchPlaceholder="Buscar adversário…"
            filters={[
              { key: 'team', label: 'Equipe', options: TEAMS.map((team) => ({ value: team, label: team })) },
              {
                key: 'competitionId',
                label: 'Campeonato',
                options: competitions.map((competition) => ({ value: competition.id, label: competition.name })),
              },
              { key: 'status', label: 'Status', options: STATUSES.map((value) => ({ value, label: value })) },
            ]}
            values={table.filters}
            onFilter={table.setFilter}
            onReset={table.resetFilters}
            activeCount={table.activeFilterCount}
          />
        }
        pagination={{
          page: table.page,
          pageCount: table.pageCount,
          total: table.total,
          pageSize: table.pageSize,
          onChange: table.setPage,
        }}
        empty={{ title: 'Nenhuma partida encontrada', description: 'Ajuste os filtros ou registre uma nova partida.' }}
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? matchLabel(selected) : ''}
        subtitle={selected ? competitionName(selected.competitionId) : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Fechar
            </Button>
            <Button variant="secondary">Editar partida</Button>
          </>
        }
      >
        {selected && (
          <div className="divide-y divide-line">
            <DetailSection title="Partida">
              <DetailList
                items={[
                  { label: 'Data', value: formatDateLong(selected.date) },
                  { label: 'Horário', value: selected.time },
                  { label: 'Local', value: selected.location },
                  { label: 'Mando', value: selected.venue === 'mandante' ? 'Mandante' : 'Visitante' },
                  { label: 'Equipe', value: selected.team },
                  { label: 'Status', value: <StatusBadge status={selected.status} /> },
                ]}
              />
            </DetailSection>
            <DetailSection title="Resultado">
              {selected.status === 'encerrado' ? (
                <div className="flex items-baseline gap-4">
                  <Scoreline match={selected} />
                  <span className="text-[13px] text-ink-muted">
                    {matchResult(selected) === 'vitoria'
                      ? 'Vitória'
                      : matchResult(selected) === 'empate'
                        ? 'Empate'
                        : 'Derrota'}
                  </span>
                </div>
              ) : (
                <p className="text-[13px] text-ink-faint">Partida ainda não realizada.</p>
              )}
              {selected.notes && (
                <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">{selected.notes}</p>
              )}
            </DetailSection>
          </div>
        )}
      </Drawer>

      <FormModal
        open={form.isOpen}
        onClose={form.close}
        title="Nova partida"
        description="Registre o confronto, o local e a competição correspondente."
        successMessage="Partida registrada"
        onSubmit={submit}
      >
        <FormSection title="Confronto">
          <Field label="Data" required error={errors.date}>
            {({ id, invalid }) => (
              <DatePicker id={id} invalid={invalid} value={values.date} onChange={(e) => setValues({ ...values, date: e.target.value })} />
            )}
          </Field>
          <Field label="Horário" required>
            {({ id }) => (
              <Input id={id} type="time" value={values.time} onChange={(e) => setValues({ ...values, time: e.target.value })} />
            )}
          </Field>
          <Field label="Adversário" required error={errors.opponent}>
            {({ id, invalid }) => (
              <Input
                id={id}
                invalid={invalid}
                value={values.opponent}
                onChange={(e) => setValues({ ...values, opponent: e.target.value })}
                placeholder="Ex.: Ferroviária do Brás"
              />
            )}
          </Field>
          <Field label="Mando de campo" required>
            {({ id }) => (
              <Select
                id={id}
                value={values.venue}
                onChange={(e) => setValues({ ...values, venue: e.target.value })}
                options={[
                  { value: 'mandante', label: 'Mandante' },
                  { value: 'visitante', label: 'Visitante' },
                ]}
              />
            )}
          </Field>
          <Field label="Local" required error={errors.location} className="sm:col-span-2">
            {({ id, invalid }) => (
              <Input
                id={id}
                invalid={invalid}
                value={values.location}
                onChange={(e) => setValues({ ...values, location: e.target.value })}
                placeholder="Ex.: Rua Javari"
              />
            )}
          </Field>
        </FormSection>

        <FormSection title="Contexto">
          <Field label="Campeonato" hint="Deixe vazio para amistosos.">
            {({ id }) => (
              <Select
                id={id}
                value={values.competitionId}
                placeholder="Amistoso"
                onChange={(e) => setValues({ ...values, competitionId: e.target.value })}
                options={competitions.map((competition) => ({ value: competition.id, label: competition.name }))}
              />
            )}
          </Field>
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
          <Field label="Observações" className="sm:col-span-2">
            {({ id }) => (
              <Textarea id={id} value={values.notes} onChange={(e) => setValues({ ...values, notes: e.target.value })} />
            )}
          </Field>
        </FormSection>
      </FormModal>

      {data && (
        <p className="mt-4 text-2xs text-ink-ghost">
          Última partida registrada em{' '}
          {formatDate([...data].filter((m) => m.status === 'encerrado').sort((a, b) => b.date.localeCompare(a.date))[0]?.date)}
        </p>
      )}
    </PageTransition>
  );
}
