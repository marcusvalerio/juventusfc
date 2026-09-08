import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageTransition } from '@/components/motion/PageTransition';
import { PageHeader } from '@/layouts/PageHeader';
import { Stagger } from '@/components/motion/Reveal';
import { StatCard } from '@/components/data/StatCard';
import { DataTable, type Column } from '@/components/data/DataTable';
import { FilterBar } from '@/components/data/FilterBar';
import { FormModal, FormSection } from '@/components/data/FormModal';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DatePicker, Field, Input, Select, Textarea } from '@/components/ui/Field';
import { useAsync } from '@/hooks/useAsync';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useTableState } from '@/hooks/useTableState';
import { duesRepo } from '@/services';
import { currentMonthRef, playerName } from '@/services/analytics';
import { players } from '@/data/squad';
import { formatDate, formatMonthRef } from '@/lib/dates';
import { currency } from '@/lib/format';
import type { MonthlyDue, PaymentMethod } from '@/types/domain';

const STATUSES = ['pago', 'pendente', 'parcial', 'atrasado'];
const METHODS: PaymentMethod[] = ['Pix', 'Dinheiro', 'Transferência', 'Cartão', 'Boleto'];

const emptyForm = {
  playerId: '',
  referenceMonth: currentMonthRef,
  dueDate: '',
  expectedAmount: '180',
  paidAmount: '',
  paidAt: '',
  method: 'Pix',
  notes: '',
};

export default function DuesPage() {
  const { data, status, reload } = useAsync(() => duesRepo.list(), []);
  const form = useDisclosure();
  const [values, setValues] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const months = useMemo(() => {
    const refs = [...new Set((data ?? []).map((due) => due.referenceMonth))].sort().reverse();
    return refs.map((ref) => ({ value: ref, label: formatMonthRef(ref) }));
  }, [data]);

  const table = useTableState<MonthlyDue>(data, ['referenceMonth', 'status'], {
    pageSize: 12,
    initialSort: { key: 'dueDate', direction: 'desc' },
    initialFilters: { referenceMonth: currentMonthRef },
  });

  // Search matches the player's name, which lives outside the due record.
  const rows = useMemo(() => {
    const needle = table.search.trim().toLowerCase();
    if (!needle) return table.rows;
    return table.rows.filter((due) => playerName(due.playerId).toLowerCase().includes(needle));
  }, [table.rows, table.search]);

  const scoped = (data ?? []).filter(
    (due) => !table.filters.referenceMonth || table.filters.referenceMonth === 'todos' || due.referenceMonth === table.filters.referenceMonth,
  );
  const expected = scoped.reduce((sum, due) => sum + due.expectedAmount, 0);
  const received = scoped.reduce((sum, due) => sum + due.paidAmount, 0);
  const overdue = scoped.filter((due) => due.status === 'atrasado');

  const columns: Column<MonthlyDue>[] = [
    {
      key: 'playerId',
      header: 'Jogador',
      render: (due) => (
        <Link
          to={`/app/jogadores/${due.playerId}`}
          onClick={(event) => event.stopPropagation()}
          className="text-[13px] text-ink transition-colors duration-150 hover:text-gold"
        >
          {playerName(due.playerId)}
        </Link>
      ),
    },
    { key: 'referenceMonth', header: 'Referência', sortable: true, render: (due) => formatMonthRef(due.referenceMonth) },
    { key: 'dueDate', header: 'Vencimento', sortable: true, secondary: true, render: (due) => formatDate(due.dueDate) },
    {
      key: 'expectedAmount',
      header: 'Previsto',
      align: 'right',
      sortable: true,
      render: (due) => <span className="tabular text-ink-muted">{currency(due.expectedAmount)}</span>,
    },
    {
      key: 'paidAmount',
      header: 'Pago',
      align: 'right',
      sortable: true,
      render: (due) => (
        <span className={`tabular ${due.paidAmount >= due.expectedAmount ? 'text-ink' : 'text-warn'}`}>
          {currency(due.paidAmount)}
        </span>
      ),
    },
    { key: 'method', header: 'Forma', secondary: true, render: (due) => due.method ?? '—' },
    { key: 'paidAt', header: 'Pagamento', secondary: true, render: (due) => formatDate(due.paidAt) },
    { key: 'status', header: 'Status', align: 'right', render: (due) => <StatusBadge status={due.status} /> },
  ];

  const submit = () => {
    const nextErrors: Record<string, string> = {};
    if (!values.playerId) nextErrors.playerId = 'Selecione o jogador.';
    if (!values.dueDate) nextErrors.dueDate = 'Informe o vencimento.';
    if (Number(values.expectedAmount) <= 0) nextErrors.expectedAmount = 'Informe um valor válido.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return false;
    setValues(emptyForm);
    return true;
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Financeiro"
        title="Mensalidades"
        description="Controle das contribuições do elenco por competência, com situação de cada cobrança."
        actions={
          <Button variant="primary" icon={<Plus />} onClick={form.open}>
            Registrar mensalidade
          </Button>
        }
      />

      <Stagger className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Previsto no período" value={expected} format={currency} loading={status === 'loading'} />
        <StatCard
          accent
          label="Recebido"
          value={received}
          format={currency}
          hint={expected > 0 ? `${Math.round((received / expected) * 100)}% do previsto` : undefined}
          loading={status === 'loading'}
        />
        <StatCard
          label="Em aberto"
          value={expected - received}
          format={currency}
          hint={`${scoped.filter((due) => due.status !== 'pago').length} cobranças`}
          loading={status === 'loading'}
        />
        <StatCard
          label="Em atraso"
          value={overdue.length}
          hint={overdue.length > 0 ? currency(overdue.reduce((sum, due) => sum + (due.expectedAmount - due.paidAmount), 0)) : 'Nenhuma pendência vencida'}
          loading={status === 'loading'}
        />
      </Stagger>

      <DataTable
        columns={columns}
        rows={rows}
        status={status}
        sort={table.sort}
        onSort={table.toggleSort}
        onRetry={reload}
        getRowId={(due) => due.id}
        toolbar={
          <FilterBar
            search={table.search}
            onSearch={table.setSearch}
            searchPlaceholder="Buscar por jogador…"
            filters={[
              { key: 'referenceMonth', label: 'Período', options: months },
              { key: 'status', label: 'Status', options: STATUSES.map((value) => ({ value, label: value })) },
              { key: 'playerId', label: 'Jogador', options: players.map((player) => ({ value: player.id, label: player.name })) },
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
        empty={{ title: 'Nenhuma mensalidade encontrada', description: 'Ajuste o período ou os filtros aplicados.' }}
      />

      <FormModal
        open={form.isOpen}
        onClose={form.close}
        title="Registrar mensalidade"
        description="Lance a cobrança e, se já houver pagamento, informe o valor recebido."
        successMessage="Mensalidade registrada"
        onSubmit={submit}
      >
        <FormSection title="Cobrança">
          <Field label="Jogador" required error={errors.playerId}>
            {({ id, invalid }) => (
              <Select
                id={id}
                invalid={invalid}
                value={values.playerId}
                placeholder="Selecione o jogador"
                onChange={(e) => {
                  const player = players.find((item) => item.id === e.target.value);
                  setValues({
                    ...values,
                    playerId: e.target.value,
                    expectedAmount: player ? String(player.monthlyFee) : values.expectedAmount,
                  });
                }}
                options={players.map((player) => ({ value: player.id, label: player.name }))}
              />
            )}
          </Field>
          <Field label="Mês de referência" required>
            {({ id }) => (
              <Input
                id={id}
                type="month"
                value={values.referenceMonth}
                onChange={(e) => setValues({ ...values, referenceMonth: e.target.value })}
              />
            )}
          </Field>
          <Field label="Vencimento" required error={errors.dueDate}>
            {({ id, invalid }) => (
              <DatePicker id={id} invalid={invalid} value={values.dueDate} onChange={(e) => setValues({ ...values, dueDate: e.target.value })} />
            )}
          </Field>
          <Field label="Valor previsto" required error={errors.expectedAmount}>
            {({ id, invalid }) => (
              <Input
                id={id}
                type="number"
                min={0}
                step="10"
                invalid={invalid}
                value={values.expectedAmount}
                onChange={(e) => setValues({ ...values, expectedAmount: e.target.value })}
              />
            )}
          </Field>
        </FormSection>

        <FormSection title="Pagamento" description="Preencha apenas se a cobrança já foi quitada, total ou parcialmente.">
          <Field label="Valor pago">
            {({ id }) => (
              <Input
                id={id}
                type="number"
                min={0}
                step="10"
                value={values.paidAmount}
                onChange={(e) => setValues({ ...values, paidAmount: e.target.value })}
                placeholder="0,00"
              />
            )}
          </Field>
          <Field label="Data do pagamento">
            {({ id }) => (
              <DatePicker id={id} value={values.paidAt} onChange={(e) => setValues({ ...values, paidAt: e.target.value })} />
            )}
          </Field>
          <Field label="Forma de pagamento">
            {({ id }) => (
              <Select
                id={id}
                value={values.method}
                onChange={(e) => setValues({ ...values, method: e.target.value })}
                options={METHODS.map((method) => ({ value: method, label: method }))}
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
    </PageTransition>
  );
}
