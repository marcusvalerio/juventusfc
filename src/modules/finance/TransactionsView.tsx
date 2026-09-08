import { useMemo, useState } from 'react';
import { PageTransition } from '@/components/motion/PageTransition';
import { PageHeader } from '@/layouts/PageHeader';
import { Stagger } from '@/components/motion/Reveal';
import { StatCard } from '@/components/data/StatCard';
import { DataTable, type Column } from '@/components/data/DataTable';
import { FilterBar } from '@/components/data/FilterBar';
import { FormModal, FormSection } from '@/components/data/FormModal';
import { DetailList } from '@/components/data/DetailList';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { DatePicker, Field, Input, Select, Textarea } from '@/components/ui/Field';
import { ChartCard } from '@/components/data/ChartCard';
import { DonutChart } from '@/components/charts/DonutChart';
import { Plus } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useTableState } from '@/hooks/useTableState';
import type { Repository } from '@/services/repository';
import { formatDate, formatDateShort, monthRefOf, TODAY } from '@/lib/dates';
import { currency } from '@/lib/format';
import type { PaymentMethod } from '@/types/domain';

const METHODS: PaymentMethod[] = ['Pix', 'Dinheiro', 'Transferência', 'Cartão', 'Boleto'];

/** Minimum shape shared by income and expense records. */
export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  method: PaymentMethod;
  responsible: string;
  notes?: string;
  /** Counterparty: `source` for income, `supplier` for expenses. */
  source?: string;
  supplier?: string;
}

export interface TransactionsViewProps<T extends Transaction> {
  kind: 'entrada' | 'saida';
  title: string;
  description: string;
  repo: Repository<T>;
  categories: readonly string[];
  counterpartyKey: 'source' | 'supplier';
  counterpartyLabel: string;
  counterpartyPlaceholder: string;
  responsibles: readonly string[];
}

/**
 * Entradas and Saídas are the same ledger read from opposite sides, so they
 * share one implementation and differ only by configuration.
 */
export function TransactionsView<T extends Transaction>({
  kind,
  title,
  description,
  repo,
  categories,
  counterpartyKey,
  counterpartyLabel,
  counterpartyPlaceholder,
  responsibles,
}: TransactionsViewProps<T>) {
  const { data, status, reload } = useAsync(() => repo.list(), [repo]);
  const [selected, setSelected] = useState<T | null>(null);
  const form = useDisclosure();
  const emptyForm = {
    date: '',
    description: '',
    category: categories[0],
    counterparty: '',
    amount: '',
    method: 'Pix',
    responsible: responsibles[0],
    notes: '',
  };
  const [values, setValues] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const table = useTableState<T>(data, ['description', 'category', 'responsible', counterpartyKey] as (keyof T)[], {
    pageSize: 10,
    initialSort: { key: 'date', direction: 'desc' },
  });

  const currentRef = monthRefOf(TODAY);
  const monthTotal = (data ?? [])
    .filter((entry) => entry.date.startsWith(currentRef))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const total = (data ?? []).reduce((sum, entry) => sum + entry.amount, 0);
  const average = (data ?? []).length === 0 ? 0 : total / (data ?? []).length;

  const breakdown = useMemo(() => {
    const grouped = new Map<string, number>();
    (data ?? []).forEach((entry) => grouped.set(entry.category, (grouped.get(entry.category) ?? 0) + entry.amount));
    return [...grouped.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [data]);

  const columns: Column<T>[] = [
    { key: 'date', header: 'Data', sortable: true, width: '110px', render: (entry) => formatDateShort(entry.date) },
    {
      key: 'description',
      header: 'Descrição',
      sortable: true,
      render: (entry) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] text-ink">{entry.description}</p>
          <p className="truncate text-2xs text-ink-faint">{entry[counterpartyKey] as string}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoria',
      sortable: true,
      secondary: true,
      render: (entry) => <Badge tone="neutral">{entry.category}</Badge>,
    },
    { key: 'method', header: 'Forma', secondary: true, render: (entry) => entry.method },
    { key: 'responsible', header: 'Responsável', secondary: true, render: (entry) => entry.responsible },
    {
      key: 'amount',
      header: 'Valor',
      align: 'right',
      sortable: true,
      render: (entry) => (
        <span className={`tabular font-medium ${kind === 'entrada' ? 'text-success' : 'text-danger'}`}>
          {kind === 'entrada' ? '+' : '−'} {currency(entry.amount)}
        </span>
      ),
    },
  ];

  const submit = () => {
    const nextErrors: Record<string, string> = {};
    if (!values.date) nextErrors.date = 'Informe a data.';
    if (!values.description.trim()) nextErrors.description = 'Descreva o lançamento.';
    if (!values.counterparty.trim()) nextErrors.counterparty = `Informe ${counterpartyLabel.toLowerCase()}.`;
    if (!values.amount || Number(values.amount) <= 0) nextErrors.amount = 'Informe um valor maior que zero.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return false;
    setValues(emptyForm);
    return true;
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Financeiro"
        title={title}
        description={description}
        actions={
          <Button variant="primary" icon={<Plus />} onClick={form.open}>
            {kind === 'entrada' ? 'Nova entrada' : 'Nova saída'}
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:col-span-2">
          <StatCard
            accent
            label={`${kind === 'entrada' ? 'Entradas' : 'Saídas'} no mês`}
            value={monthTotal}
            format={currency}
            loading={status === 'loading'}
          />
          <StatCard label="Total acumulado" value={total} format={currency} loading={status === 'loading'} />
          <StatCard
            label="Ticket médio"
            value={average}
            format={currency}
            hint={`${(data ?? []).length} lançamentos`}
            loading={status === 'loading'}
          />
        </Stagger>

        <ChartCard
          title="Por categoria"
          description="Distribuição do período completo"
          loading={status === 'loading'}
          height={168}
        >
          <DonutChart data={breakdown} formatValue={currency} />
        </ChartCard>
      </div>

      <DataTable
        columns={columns}
        rows={table.rows}
        status={status}
        sort={table.sort}
        onSort={table.toggleSort}
        onRetry={reload}
        getRowId={(entry) => entry.id}
        onRowClick={setSelected}
        toolbar={
          <FilterBar
            search={table.search}
            onSearch={table.setSearch}
            searchPlaceholder="Buscar lançamento…"
            filters={[
              { key: 'category', label: 'Categoria', options: categories.map((value) => ({ value, label: value })) },
              { key: 'method', label: 'Forma', options: METHODS.map((value) => ({ value, label: value })) },
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
        empty={{ title: 'Nenhum lançamento encontrado', description: 'Ajuste a busca ou registre um novo lançamento.' }}
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.description ?? ''}
        subtitle={kind === 'entrada' ? 'Entrada' : 'Saída'}
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Fechar
            </Button>
            <Button variant="secondary">Editar lançamento</Button>
          </>
        }
      >
        {selected && (
          <>
            <p
              className={`mb-6 font-heading text-[30px] font-medium tracking-tightest ${
                kind === 'entrada' ? 'text-success' : 'text-danger'
              }`}
            >
              {kind === 'entrada' ? '+' : '−'} {currency(selected.amount)}
            </p>
            <DetailList
              items={[
                { label: 'Data', value: formatDate(selected.date) },
                { label: 'Categoria', value: selected.category },
                { label: counterpartyLabel, value: selected[counterpartyKey] as string },
                { label: 'Forma', value: selected.method },
                { label: 'Responsável', value: selected.responsible },
                { label: 'Observações', value: selected.notes, wide: true },
              ]}
            />
          </>
        )}
      </Drawer>

      <FormModal
        open={form.isOpen}
        onClose={form.close}
        title={kind === 'entrada' ? 'Nova entrada' : 'Nova saída'}
        description="O lançamento entra imediatamente no fluxo de caixa do período."
        successMessage={kind === 'entrada' ? 'Entrada registrada' : 'Saída registrada'}
        onSubmit={submit}
      >
        <FormSection title="Lançamento">
          <Field label="Data" required error={errors.date}>
            {({ id, invalid }) => (
              <DatePicker id={id} invalid={invalid} value={values.date} onChange={(e) => setValues({ ...values, date: e.target.value })} />
            )}
          </Field>
          <Field label="Valor" required error={errors.amount}>
            {({ id, invalid }) => (
              <Input
                id={id}
                type="number"
                min={0}
                step="0.01"
                invalid={invalid}
                value={values.amount}
                onChange={(e) => setValues({ ...values, amount: e.target.value })}
                placeholder="0,00"
              />
            )}
          </Field>
          <Field label="Descrição" required error={errors.description} className="sm:col-span-2">
            {({ id, invalid }) => (
              <Input
                id={id}
                invalid={invalid}
                value={values.description}
                onChange={(e) => setValues({ ...values, description: e.target.value })}
                placeholder={kind === 'entrada' ? 'Ex.: Patrocínio mensal' : 'Ex.: Arbitragem da rodada'}
              />
            )}
          </Field>
        </FormSection>

        <FormSection title="Classificação">
          <Field label="Categoria" required>
            {({ id }) => (
              <Select
                id={id}
                value={values.category}
                onChange={(e) => setValues({ ...values, category: e.target.value })}
                options={categories.map((value) => ({ value, label: value }))}
              />
            )}
          </Field>
          <Field label={counterpartyLabel} required error={errors.counterparty}>
            {({ id, invalid }) => (
              <Input
                id={id}
                invalid={invalid}
                value={values.counterparty}
                onChange={(e) => setValues({ ...values, counterparty: e.target.value })}
                placeholder={counterpartyPlaceholder}
              />
            )}
          </Field>
          <Field label={kind === 'entrada' ? 'Forma de recebimento' : 'Forma de pagamento'}>
            {({ id }) => (
              <Select
                id={id}
                value={values.method}
                onChange={(e) => setValues({ ...values, method: e.target.value })}
                options={METHODS.map((value) => ({ value, label: value }))}
              />
            )}
          </Field>
          <Field label="Responsável">
            {({ id }) => (
              <Select
                id={id}
                value={values.responsible}
                onChange={(e) => setValues({ ...values, responsible: e.target.value })}
                options={responsibles.map((value) => ({ value, label: value }))}
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
