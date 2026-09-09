import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutGrid, List, Plus } from 'lucide-react';
import { PageTransition } from '@/components/motion/PageTransition';
import { PageHeader } from '@/layouts/PageHeader';
import { DataTable, type Column } from '@/components/data/DataTable';
import { FilterBar } from '@/components/data/FilterBar';
import { FormModal, FormSection } from '@/components/data/FormModal';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ShirtNumber } from '@/components/ui/Avatar';
import { SegmentedControl } from '@/components/ui/Tabs';
import { DatePicker, Field, Input, Select, Textarea } from '@/components/ui/Field';
import { EmptyState, Skeleton } from '@/components/ui/States';
import { riseItem, staggerContainer } from '@/lib/motion';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/components/ui/Toast';
import { runSubmit } from '@/lib/submit';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useTableState } from '@/hooks/useTableState';
import { playersRepo } from '@/services';
import { age } from '@/lib/dates';
import { currency } from '@/lib/format';
import type { Player, Position } from '@/types/domain';
import { useSession } from '@/app/SessionContext';

const POSITIONS: Position[] = ['Goleiro', 'Zagueiro', 'Lateral Direito', 'Lateral Esquerdo', 'Volante', 'Meia', 'Ponta', 'Atacante'];
const STATUSES = ['ativo', 'lesionado', 'suspenso', 'afastado', 'inativo'];

const emptyForm = {
  name: '',
  nickname: '',
  shirtNumber: '',
  position: POSITIONS[0] as string,
  secondaryPosition: '',
  teamId: '',
  birthDate: '',
  phone: '',
  joinedAt: '',
  monthlyFee: '180',
  dueDay: '10',
  status: 'ativo',
  notes: '',
};

function PlayerCard({ player }: { player: Player }) {
  return (
    <motion.div variants={riseItem}>
      <Link
        to={`/app/jogadores/${player.id}`}
        className="group flex h-full flex-col rounded-lg border border-line bg-graphite p-5 transition-colors duration-200 hover:border-line-strong hover:bg-surface-raised"
      >
        <div className="flex items-start justify-between gap-3">
          <ShirtNumber value={player.shirtNumber} />
          <StatusBadge status={player.status} />
        </div>

        <p className="mt-4 font-heading text-[15px] font-medium tracking-editorial text-ink">
          {player.nickname ?? player.name}
        </p>
        {player.nickname && <p className="mt-0.5 truncate text-2xs text-ink-faint">{player.name}</p>}

        <p className="mt-3 text-[13px] text-ink-muted">{player.position}</p>
        {player.secondaryPosition && (
          <p className="mt-0.5 text-2xs text-ink-ghost">Também atua como {player.secondaryPosition.toLowerCase()}</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <Badge tone={player.team === 'Profissional' ? 'gold' : 'neutral'}>{player.team}</Badge>
          <span className="tabular text-2xs text-ink-faint">
            {age(player.birthDate) ? `${age(player.birthDate)} anos` : '—'}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

export default function PlayersPage() {
  const navigate = useNavigate();
  const { teams } = useSession();
  const { data, status, reload } = useAsync(() => playersRepo.list(), []);
  const [view, setView] = useState<'tabela' | 'cards'>('tabela');
  const form = useDisclosure();
  const toast = useToast();
  const [values, setValues] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const table = useTableState<Player>(data, ['name', 'nickname', 'position', 'team'], {
    pageSize: view === 'cards' ? 12 : 10,
    initialSort: { key: 'shirtNumber', direction: 'asc' },
  });

  const columns: Column<Player>[] = [
    {
      key: 'shirtNumber',
      header: '#',
      sortable: true,
      width: '72px',
      render: (player) => <ShirtNumber value={player.shirtNumber} />,
    },
    {
      key: 'name',
      header: 'Jogador',
      sortable: true,
      render: (player) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] text-ink">{player.name}</p>
          {player.nickname && <p className="truncate text-2xs text-ink-faint">“{player.nickname}”</p>}
        </div>
      ),
    },
    {
      key: 'position',
      header: 'Posição',
      sortable: true,
      render: (player) => (
        <div className="min-w-0">
          <p className="truncate text-ink-muted">{player.position}</p>
          {player.secondaryPosition && (
            <p className="truncate text-2xs text-ink-ghost">{player.secondaryPosition}</p>
          )}
        </div>
      ),
    },
    {
      key: 'team',
      header: 'Equipe',
      sortable: true,
      secondary: true,
      render: (player) => <Badge tone={player.team === 'Profissional' ? 'gold' : 'neutral'}>{player.team}</Badge>,
    },
    {
      key: 'birthDate',
      header: 'Idade',
      align: 'right',
      secondary: true,
      render: (player) => <span className="tabular">{age(player.birthDate) ?? '—'}</span>,
    },
    {
      key: 'monthlyFee',
      header: 'Mensalidade',
      align: 'right',
      sortable: true,
      secondary: true,
      render: (player) => (
        <span className="tabular text-ink">
          {currency(player.monthlyFee)}
          <span className="ml-1.5 text-2xs text-ink-ghost">dia {player.dueDay}</span>
        </span>
      ),
    },
    { key: 'status', header: 'Situação', align: 'right', render: (player) => <StatusBadge status={player.status} /> },
  ];

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!values.name.trim()) nextErrors.name = 'Informe o nome do jogador.';
    if (!values.joinedAt) nextErrors.joinedAt = 'Informe a data de entrada.';
    const day = Number(values.dueDay);
    if (!day || day < 1 || day > 31) nextErrors.dueDay = 'Use um dia entre 1 e 31.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return false;

    const ok = await runSubmit(
      async () => {
        // The API creates the person when only a name is given, so the squad
        // record always points at a row in the central register.
        await playersRepo.create({
          fullName: values.name,
          nickname: values.nickname,
          birthDate: values.birthDate,
          phone: values.phone,
          shirtNumber: values.shirtNumber === '' ? null : values.shirtNumber,
          position: values.position,
          secondaryPosition: values.secondaryPosition,
          teamId: values.teamId || null,
          joinedAt: values.joinedAt,
          monthlyFee: values.monthlyFee,
          dueDay: values.dueDay,
          status: values.status,
          notes: values.notes,
        });
        reload();
      },
      setErrors,
      toast,
    );
    if (ok) setValues(emptyForm);
    return ok;
  };

  const filterBar = (
    <FilterBar
      search={table.search}
      onSearch={table.setSearch}
      searchPlaceholder="Buscar jogador…"
      filters={[
        { key: 'team', label: 'Equipe', options: teams.map((team) => ({ value: team.name, label: team.name })) },
        { key: 'position', label: 'Posição', options: POSITIONS.map((position) => ({ value: position, label: position })) },
        {
          key: 'status',
          label: 'Situação',
          options: STATUSES.map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) })),
        },
      ]}
      values={table.filters}
      onFilter={table.setFilter}
      onReset={table.resetFilters}
      activeCount={table.activeFilterCount}
      trailing={
        <SegmentedControl
          value={view}
          onChange={(value) => setView(value as 'tabela' | 'cards')}
          items={[
            { value: 'tabela', label: 'Tabela', icon: <List /> },
            { value: 'cards', label: 'Cards', icon: <LayoutGrid /> },
          ]}
        />
      }
    />
  );

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Clube"
        title="Jogadores"
        description="Elenco completo por equipe, posição e situação, com os dados de mensalidade que alimentam o financeiro."
        meta={
          <p className="text-2xs text-ink-faint">
            <span className="tabular text-ink-muted">{(data ?? []).filter((p) => p.status === 'ativo').length}</span>{' '}
            ativos · <span className="tabular text-ink-muted">{(data ?? []).length}</span> no total
          </p>
        }
        actions={
          <Button variant="primary" icon={<Plus />} onClick={form.open}>
            Novo jogador
          </Button>
        }
      />

      {view === 'tabela' ? (
        <DataTable
          columns={columns}
          rows={table.rows}
          status={status}
          sort={table.sort}
          onSort={table.toggleSort}
          onRetry={reload}
          getRowId={(player) => player.id}
          onRowClick={(player) => navigate(`/app/jogadores/${player.id}`)}
          toolbar={filterBar}
          pagination={{
            page: table.page,
            pageCount: table.pageCount,
            total: table.total,
            pageSize: table.pageSize,
            onChange: table.setPage,
          }}
          empty={{ title: 'Nenhum jogador encontrado', description: 'Ajuste os filtros para ver outros atletas do elenco.' }}
        />
      ) : (
        <div className="rounded-lg border border-line bg-graphite">
          <div className="border-b border-line px-5 py-3">{filterBar}</div>
          {status === 'loading' ? (
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-[188px]" />
              ))}
            </div>
          ) : table.rows.length === 0 ? (
            <EmptyState compact title="Nenhum jogador encontrado" description="Ajuste a busca ou os filtros." />
          ) : (
            <motion.div
              variants={staggerContainer(0.04)}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {table.rows.map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </motion.div>
          )}
        </div>
      )}

      <FormModal
        open={form.isOpen}
        onClose={form.close}
        title="Novo jogador"
        description="Cadastro do atleta, vínculo com a equipe e condições de mensalidade."
        successMessage="Jogador cadastrado"
        onSubmit={submit}
      >
        <FormSection title="Identificação">
          <Field label="Nome" required error={errors.name} className="sm:col-span-2">
            {({ id, invalid }) => (
              <Input
                id={id}
                invalid={invalid}
                value={values.name}
                onChange={(event) => setValues({ ...values, name: event.target.value })}
                placeholder="Ex.: Diego Marchetti"
              />
            )}
          </Field>
          <Field label="Apelido">
            {({ id }) => (
              <Input id={id} value={values.nickname} onChange={(event) => setValues({ ...values, nickname: event.target.value })} />
            )}
          </Field>
          <Field label="Número da camisa">
            {({ id }) => (
              <Input
                id={id}
                type="number"
                min={1}
                max={99}
                value={values.shirtNumber}
                onChange={(event) => setValues({ ...values, shirtNumber: event.target.value })}
              />
            )}
          </Field>
          <Field label="Data de nascimento">
            {({ id }) => (
              <DatePicker id={id} value={values.birthDate} onChange={(event) => setValues({ ...values, birthDate: event.target.value })} />
            )}
          </Field>
          <Field label="Telefone">
            {({ id }) => (
              <Input id={id} value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} placeholder="(11) 90000-0000" />
            )}
          </Field>
        </FormSection>

        <FormSection title="Elenco">
          <Field label="Posição principal" required>
            {({ id }) => (
              <Select
                id={id}
                value={values.position}
                onChange={(event) => setValues({ ...values, position: event.target.value })}
                options={POSITIONS.map((position) => ({ value: position, label: position }))}
              />
            )}
          </Field>
          <Field label="Posição secundária">
            {({ id }) => (
              <Select
                id={id}
                value={values.secondaryPosition}
                placeholder="Nenhuma"
                onChange={(event) => setValues({ ...values, secondaryPosition: event.target.value })}
                options={POSITIONS.map((position) => ({ value: position, label: position }))}
              />
            )}
          </Field>
          <Field label="Equipe / categoria" required>
            {({ id }) => (
              <Select
                id={id}
                value={values.teamId}
                placeholder="Selecione a categoria"
                onChange={(event) => setValues({ ...values, teamId: event.target.value })}
                options={teams.map((team) => ({ value: team.id, label: team.name }))}
              />
            )}
          </Field>
          <Field label="Situação no elenco">
            {({ id }) => (
              <Select
                id={id}
                value={values.status}
                onChange={(event) => setValues({ ...values, status: event.target.value })}
                options={STATUSES.map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }))}
              />
            )}
          </Field>
          <Field label="Data de entrada" required error={errors.joinedAt}>
            {({ id, invalid }) => (
              <DatePicker
                id={id}
                invalid={invalid}
                value={values.joinedAt}
                onChange={(event) => setValues({ ...values, joinedAt: event.target.value })}
              />
            )}
          </Field>
        </FormSection>

        <FormSection title="Mensalidade" description="Alimenta automaticamente o módulo financeiro.">
          <Field label="Valor mensal" hint="Em reais">
            {({ id }) => (
              <Input
                id={id}
                type="number"
                min={0}
                step="10"
                value={values.monthlyFee}
                onChange={(event) => setValues({ ...values, monthlyFee: event.target.value })}
              />
            )}
          </Field>
          <Field label="Dia do vencimento" required error={errors.dueDay}>
            {({ id, invalid }) => (
              <Input
                id={id}
                type="number"
                min={1}
                max={31}
                invalid={invalid}
                value={values.dueDay}
                onChange={(event) => setValues({ ...values, dueDay: event.target.value })}
              />
            )}
          </Field>
          <Field label="Observações" className="sm:col-span-2">
            {({ id }) => (
              <Textarea id={id} value={values.notes} onChange={(event) => setValues({ ...values, notes: event.target.value })} />
            )}
          </Field>
        </FormSection>
      </FormModal>

      {status === 'success' && table.rows.length > 0 && view === 'cards' && (
        <p className="mt-4 text-2xs text-ink-ghost">
          Exibindo {table.rows.length} de {table.total} jogadores
        </p>
      )}
    </PageTransition>
  );
}
