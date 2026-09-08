import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Plus } from 'lucide-react';
import { PageTransition } from '@/components/motion/PageTransition';
import { PageHeader } from '@/layouts/PageHeader';
import { DataTable, type Column } from '@/components/data/DataTable';
import { FilterBar } from '@/components/data/FilterBar';
import { FormModal, FormSection } from '@/components/data/FormModal';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DatePicker, Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/States';
import { riseItem, staggerContainer } from '@/lib/motion';
import { useAsync } from '@/hooks/useAsync';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useTableState } from '@/hooks/useTableState';
import { trainingsRepo } from '@/services';
import { staffName, upcomingTrainings } from '@/services/analytics';
import { staffMembers } from '@/data/squad';
import { formatDate, formatDateShort, weekdayOf } from '@/lib/dates';
import type { SquadTeam, Training, TrainingType } from '@/types/domain';

const TYPES: TrainingType[] = ['Técnico', 'Tático', 'Físico', 'Recreativo', 'Coletivo'];
const TEAMS: SquadTeam[] = ['Profissional', 'Sub-20', 'Sub-17', 'Veteranos'];
const STATUSES = ['agendado', 'realizado', 'cancelado'];

const emptyForm = {
  date: '',
  time: '19:30',
  location: 'CT Rua Javari — Campo 1',
  team: TEAMS[0] as string,
  responsibleId: '',
  type: TYPES[0] as string,
  status: 'agendado',
  notes: '',
};

export default function TrainingsPage() {
  const { data, status, reload } = useAsync(() => trainingsRepo.list(), []);
  const form = useDisclosure();
  const [values, setValues] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const table = useTableState<Training>(data, ['location', 'team', 'type'], {
    pageSize: 10,
    initialSort: { key: 'date', direction: 'desc' },
  });

  const next = upcomingTrainings(3);

  const columns: Column<Training>[] = [
    {
      key: 'date',
      header: 'Data',
      sortable: true,
      width: '130px',
      render: (training) => (
        <div>
          <p className="text-[13px] text-ink">{formatDateShort(training.date)}</p>
          <p className="text-2xs text-ink-faint">
            {weekdayOf(training.date)} · <span className="tabular">{training.time}</span>
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      sortable: true,
      render: (training) => <Badge tone={training.type === 'Coletivo' ? 'gold' : 'neutral'}>{training.type}</Badge>,
    },
    { key: 'team', header: 'Equipe', sortable: true, render: (training) => training.team },
    { key: 'location', header: 'Local', secondary: true, render: (training) => training.location },
    { key: 'responsibleId', header: 'Responsável', secondary: true, render: (training) => staffName(training.responsibleId) },
    { key: 'status', header: 'Status', align: 'right', render: (training) => <StatusBadge status={training.status} /> },
  ];

  const submit = () => {
    const nextErrors: Record<string, string> = {};
    if (!values.date) nextErrors.date = 'Informe a data do treino.';
    if (!values.location.trim()) nextErrors.location = 'Informe o local.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return false;
    setValues(emptyForm);
    return true;
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Futebol"
        title="Treinamentos"
        description="Sessões programadas por equipe, com tipo de trabalho e responsável técnico."
        actions={
          <Button variant="primary" icon={<Plus />} onClick={form.open}>
            Novo treino
          </Button>
        }
      />

      {status === 'loading' ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-[124px] rounded-lg" />
          ))}
        </div>
      ) : (
        next.length > 0 && (
          <motion.ul
            variants={staggerContainer(0.06)}
            initial="initial"
            animate="animate"
            className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            {next.map((training, index) => (
              <motion.li
                key={training.id}
                variants={riseItem}
                className="relative overflow-hidden rounded-lg border border-line bg-graphite p-5"
              >
                {index === 0 && (
                  <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-gold/50 to-transparent" />
                )}
                <p className="eyebrow">{index === 0 ? 'Próximo treino' : formatDateShort(training.date)}</p>
                <p className="mt-3 font-heading text-[15px] font-medium tracking-editorial text-ink">
                  Treino {training.type.toLowerCase()}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-2xs text-ink-muted">
                  <Clock className="h-3 w-3" aria-hidden />
                  {weekdayOf(training.date)}, {formatDateShort(training.date)} às {training.time}
                </p>
                <p className="mt-1 flex items-center gap-1.5 truncate text-2xs text-ink-faint">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                  {training.location}
                </p>
              </motion.li>
            ))}
          </motion.ul>
        )
      )}

      <DataTable
        columns={columns}
        rows={table.rows}
        status={status}
        sort={table.sort}
        onSort={table.toggleSort}
        onRetry={reload}
        getRowId={(training) => training.id}
        toolbar={
          <FilterBar
            search={table.search}
            onSearch={table.setSearch}
            searchPlaceholder="Buscar treino…"
            filters={[
              { key: 'team', label: 'Equipe', options: TEAMS.map((team) => ({ value: team, label: team })) },
              { key: 'type', label: 'Tipo', options: TYPES.map((type) => ({ value: type, label: type })) },
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
        empty={{ title: 'Nenhum treino encontrado', description: 'Ajuste os filtros ou agende uma nova sessão.' }}
      />

      <FormModal
        open={form.isOpen}
        onClose={form.close}
        title="Novo treinamento"
        description="Agende a sessão e defina o responsável técnico."
        successMessage="Treino agendado"
        onSubmit={submit}
      >
        <FormSection title="Sessão">
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
          <Field label="Local" required error={errors.location} className="sm:col-span-2">
            {({ id, invalid }) => (
              <Input id={id} invalid={invalid} value={values.location} onChange={(e) => setValues({ ...values, location: e.target.value })} />
            )}
          </Field>
        </FormSection>

        <FormSection title="Organização">
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
          <Field label="Tipo de treino">
            {({ id }) => (
              <Select
                id={id}
                value={values.type}
                onChange={(e) => setValues({ ...values, type: e.target.value })}
                options={TYPES.map((type) => ({ value: type, label: type }))}
              />
            )}
          </Field>
          <Field label="Responsável">
            {({ id }) => (
              <Select
                id={id}
                value={values.responsibleId}
                placeholder="Selecione o profissional"
                onChange={(e) => setValues({ ...values, responsibleId: e.target.value })}
                options={staffMembers.map((member) => ({ value: member.id, label: `${member.name} · ${member.role}` }))}
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
          {data.filter((training) => training.status === 'realizado').length} sessões realizadas · última em{' '}
          {formatDate([...data].filter((t) => t.status === 'realizado').sort((a, b) => b.date.localeCompare(a.date))[0]?.date)}
        </p>
      )}
    </PageTransition>
  );
}
