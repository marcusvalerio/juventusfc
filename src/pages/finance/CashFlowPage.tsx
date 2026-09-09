import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Download } from 'lucide-react';
import { PageTransition } from '@/components/motion/PageTransition';
import { PageHeader } from '@/layouts/PageHeader';
import { Stagger } from '@/components/motion/Reveal';
import { StatCard } from '@/components/data/StatCard';
import { ChartCard } from '@/components/data/ChartCard';
import { AreaChart } from '@/components/charts/AreaChart';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { DataTable, type Column } from '@/components/data/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { useAsync } from '@/hooks/useAsync';
import { getCashFlow } from '@/services/analytics';
import { expenseRepo, incomeRepo } from '@/services';
import { currency } from '@/lib/format';
import { formatDateShort, formatMonthRef } from '@/lib/dates';
import { cn } from '@/lib/cn';

interface Movement {
  id: string;
  date: string;
  description: string;
  category: string;
  counterparty: string;
  amount: number;
  kind: 'entrada' | 'saida';
}

const PERIODS = [
  { value: '3', label: '3 meses' },
  { value: '6', label: '6 meses' },
  { value: '12', label: '12 meses' },
];

export default function CashFlowPage() {
  const [period, setPeriod] = useState('6');
  const toast = useToast();
  const months = Number(period);

  const cashFlow = useAsync(() => getCashFlow(months), [months]);
  const movements = useAsync(async () => {
    const [income, expenses] = await Promise.all([incomeRepo.list(), expenseRepo.list()]);
    const rows: Movement[] = [
      ...income.map((entry) => ({
        id: entry.id,
        date: entry.date,
        description: entry.description,
        category: entry.category,
        counterparty: entry.source,
        amount: entry.amount,
        kind: 'entrada' as const,
      })),
      ...expenses.map((entry) => ({
        id: entry.id,
        date: entry.date,
        description: entry.description,
        category: entry.category,
        counterparty: entry.supplier,
        amount: entry.amount,
        kind: 'saida' as const,
      })),
    ];
    return rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 24);
  }, []);

  const points = cashFlow.data?.points ?? [];
  const breakdown = cashFlow.data?.breakdown ?? [];
  const latest = points[points.length - 1];
  const previous = points[points.length - 2];

  const totals = useMemo(
    () => ({
      income: points.reduce((sum, point) => sum + point.income, 0),
      expense: points.reduce((sum, point) => sum + point.expense, 0),
    }),
    [points],
  );

  const trend =
    previous && previous.balance !== 0
      ? ((latest.balance - previous.balance) / Math.abs(previous.balance)) * 100
      : 0;

  const columns: Column<Movement>[] = [
    { key: 'date', header: 'Data', width: '110px', render: (row) => formatDateShort(row.date) },
    {
      key: 'description',
      header: 'Movimentação',
      render: (row) => (
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded border',
              row.kind === 'entrada'
                ? 'border-[rgba(53,183,121,0.28)] bg-success-wash text-success'
                : 'border-[rgba(224,82,82,0.28)] bg-danger-wash text-danger',
            )}
          >
            {row.kind === 'entrada' ? (
              <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] text-ink">{row.description}</p>
            <p className="truncate text-2xs text-ink-faint">{row.counterparty}</p>
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Categoria', secondary: true, render: (row) => <Badge tone="neutral">{row.category}</Badge> },
    {
      key: 'amount',
      header: 'Valor',
      align: 'right',
      render: (row) => (
        <span className={cn('tabular font-medium', row.kind === 'entrada' ? 'text-success' : 'text-danger')}>
          {row.kind === 'entrada' ? '+' : '−'} {currency(row.amount)}
        </span>
      ),
    },
  ];

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Financeiro"
        title="Fluxo de Caixa"
        description="Saldo consolidado, entradas e saídas por competência, com as movimentações mais recentes."
        actions={
          <>
            <SegmentedControl value={period} onChange={setPeriod} items={PERIODS} />
            <Button
              variant="secondary"
              icon={<Download />}
              onClick={() => toast.notify({ tone: 'info', title: 'Exportação disponível na próxima etapa', description: 'A geração de arquivos será habilitada com a integração de dados reais.' })}
            >
              Exportar
            </Button>
          </>
        }
      />

      <Stagger className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          accent
          label="Saldo atual"
          value={latest?.balance ?? 0}
          format={currency}
          trend={previous ? { value: trend, label: 'vs. mês anterior' } : undefined}
          spark={points.map((point) => point.balance)}
          loading={cashFlow.status === 'loading'}
        />
        <StatCard
          label={`Entradas · ${months} meses`}
          value={totals.income}
          format={currency}
          sparkTone="success"
          spark={points.map((point) => point.income)}
          loading={cashFlow.status === 'loading'}
        />
        <StatCard
          label={`Saídas · ${months} meses`}
          value={totals.expense}
          format={currency}
          sparkTone="danger"
          spark={points.map((point) => point.expense)}
          loading={cashFlow.status === 'loading'}
        />
        <StatCard
          label="Resultado do período"
          value={totals.income - totals.expense}
          format={currency}
          hint={latest ? `Fechamento de ${formatMonthRef(latest.ref).toLowerCase()}` : undefined}
          loading={cashFlow.status === 'loading'}
        />
      </Stagger>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Evolução do saldo"
          description="Saldo acumulado ao fim de cada mês"
          loading={cashFlow.status === 'loading'}
        >
          <AreaChart
            data={points.map((point) => ({ label: point.label, value: point.balance }))}
            height={230}
            formatValue={currency}
          />
        </ChartCard>

        <ChartCard
          title="Entradas e saídas"
          description="Comparativo mensal"
          loading={cashFlow.status === 'loading'}
        >
          <BarChart
            data={points.map((point) => ({ label: point.label, income: point.income, expense: point.expense }))}
            height={230}
            formatValue={currency}
          />
        </ChartCard>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title="Onde o dinheiro sai"
          description="Categorias de despesa nos últimos três meses"
          loading={cashFlow.status === 'loading'}
          height={168}
        >
          <DonutChart data={breakdown} formatValue={currency} />
        </ChartCard>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-lg border border-line bg-graphite xl:col-span-2"
        >
          <div className="border-b border-line px-5 py-4">
            <p className="eyebrow">Resumo por mês</p>
          </div>
          <ul className="divide-y divide-line">
            {[...points].reverse().map((point) => (
              <li key={point.ref} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="text-[13px] text-ink first-letter:uppercase">{formatMonthRef(point.ref)}</span>
                <span className="flex items-center gap-5 text-2xs">
                  <span className="tabular text-success">+{currency(point.income)}</span>
                  <span className="tabular text-danger">−{currency(point.expense)}</span>
                  <span className={cn('tabular w-24 text-right font-medium', point.net >= 0 ? 'text-ink' : 'text-danger')}>
                    {currency(point.net)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </motion.section>
      </div>

      <DataTable
        columns={columns}
        rows={movements.data ?? []}
        status={movements.status}
        onRetry={movements.reload}
        getRowId={(row) => row.id}
        empty={{ title: 'Nenhuma movimentação', description: 'Registre entradas e saídas para acompanhar o caixa.' }}
      />
    </PageTransition>
  );
}
