import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, Dumbbell, Plus, TrendingUp, Users, Wallet } from 'lucide-react';
import { PageTransition } from '@/components/motion/PageTransition';
import { PageHeader } from '@/layouts/PageHeader';
import { Stagger } from '@/components/motion/Reveal';
import { StatCard } from '@/components/data/StatCard';
import { ChartCard } from '@/components/data/ChartCard';
import { CardHeader } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { AreaChart } from '@/components/charts/AreaChart';
import { UpcomingMatches } from './dashboard/UpcomingMatches';
import { ActivityFeed } from './dashboard/ActivityFeed';
import { DuesPanel } from './dashboard/DuesPanel';
import { ResultsStrip } from './dashboard/ResultsStrip';
import { StockAlerts } from './dashboard/StockAlerts';
import { useAsync } from '@/hooks/useAsync';
import {
  getCashFlow,
  getDashboardSummary,
  getDuesSummary,
  getRecentActivity,
  currentMonthRef,
  playerName,
  upcomingMatches,
  upcomingTrainings,
} from '@/services/analytics';
import { duesRepo, inventoryRepo } from '@/services';
import { currency, currencyCompact } from '@/lib/format';
import { formatDateShort, MONTHS_LONG, TODAY } from '@/lib/dates';
import { clubProfile, viewer } from '@/data/club';
import { firstName } from '@/lib/format';
import { EmptyState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';

const greeting = () => {
  const hour = TODAY.getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

export default function DashboardPage() {
  const summary = useAsync(getDashboardSummary, []);
  const cashFlow = useAsync(() => getCashFlow(6), []);
  const dues = useAsync(() => getDuesSummary(), []);
  const activity = useAsync(() => getRecentActivity(6), []);
  const openDues = useAsync(async () => {
    const list = await duesRepo.list();
    return list
      .filter((due) => due.referenceMonth === currentMonthRef && due.status !== 'pago')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 4)
      .map((due) => ({
        id: due.id,
        player: playerName(due.playerId),
        amount: due.expectedAmount - due.paidAmount,
        dueDate: due.dueDate,
        status: due.status,
      }));
  }, []);
  const lowStock = useAsync(
    async () => (await inventoryRepo.list()).filter((item) => item.status !== 'disponivel').slice(0, 4),
    [],
  );

  const loading = summary.status === 'loading';
  const data = summary.data;
  const nextMatches = upcomingMatches(4);
  const nextTrainings = upcomingTrainings(4);
  const balanceSeries = cashFlow.data?.map((point) => point.balance) ?? [];

  return (
    <PageTransition>
      <PageHeader
        eyebrow={`${MONTHS_LONG[TODAY.getMonth()][0].toUpperCase()}${MONTHS_LONG[TODAY.getMonth()].slice(1)} de ${TODAY.getFullYear()}`}
        title={`${greeting()}, ${firstName(viewer.name)}.`}
        description={`Panorama do ${clubProfile.shortName} — elenco, agenda, finanças e patrimônio em um só lugar.`}
        actions={
          <>
            <LinkButton to="/app/calendario" variant="secondary" icon={<CalendarDays />}>
              Calendário
            </LinkButton>
            <LinkButton to="/app/entradas" variant="gold" icon={<Plus />}>
              Novo lançamento
            </LinkButton>
          </>
        }
      />

      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Jogadores ativos"
          value={data?.activePlayers ?? 0}
          hint={`${data?.totalPeople ?? 0} pessoas cadastradas`}
          loading={loading}
          icon={<Users />}
        />
        <StatCard
          label="Próximos jogos"
          value={data?.upcomingMatchCount ?? 0}
          hint={nextMatches[0] ? `Próximo em ${formatDateShort(nextMatches[0].date)}` : 'Nenhum agendado'}
          loading={loading}
          icon={<CalendarDays />}
        />
        <StatCard
          label="Treinos agendados"
          value={data?.upcomingTrainingCount ?? 0}
          hint={nextTrainings[0] ? `Próximo em ${formatDateShort(nextTrainings[0].date)}` : 'Nenhum agendado'}
          loading={loading}
          icon={<Dumbbell />}
        />
        <StatCard
          accent
          label="Saldo em caixa"
          value={data?.balance ?? 0}
          format={currency}
          hint={`+${currency(data?.monthIncome ?? 0)} no mês`}
          spark={balanceSeries}
          loading={loading || cashFlow.status === 'loading'}
          icon={<Wallet />}
        />
      </Stagger>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Fluxo de caixa"
          description="Saldo consolidado nos últimos seis meses"
          loading={cashFlow.status === 'loading'}
          action={
            <Link
              to="/app/fluxo-de-caixa"
              className="text-2xs text-ink-faint transition-colors duration-150 hover:text-gold"
            >
              Detalhar →
            </Link>
          }
          footer={
            cashFlow.data && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-2xs">
                <span className="flex items-center gap-1.5 text-ink-muted">
                  <TrendingUp className="h-3 w-3 text-success" aria-hidden />
                  Entradas no mês
                  <span className="tabular text-ink">{currency(data?.monthIncome ?? 0)}</span>
                </span>
                <span className="flex items-center gap-1.5 text-ink-muted">
                  Saídas no mês
                  <span className="tabular text-ink">{currency(data?.monthExpense ?? 0)}</span>
                </span>
                <span className="ml-auto flex items-center gap-1.5 text-ink-muted">
                  Resultado
                  <span className="tabular text-gold">
                    {currency((data?.monthIncome ?? 0) - (data?.monthExpense ?? 0))}
                  </span>
                </span>
              </div>
            )
          }
        >
          <AreaChart
            data={(cashFlow.data ?? []).map((point) => ({ label: point.label, value: point.balance }))}
            height={262}
            formatValue={currency}
          />
        </ChartCard>

        <section className="overflow-hidden rounded-lg border border-line bg-graphite">
          <div className="px-5 pt-5">
            <CardHeader
              title="Mensalidades do mês"
              description={`${data?.pendingDuesCount ?? 0} em aberto · ${currency(data?.pendingDuesAmount ?? 0)}`}
              action={
                (data?.overdueDuesCount ?? 0) > 0 ? (
                  <Badge tone="danger">{data?.overdueDuesCount} em atraso</Badge>
                ) : undefined
              }
            />
          </div>
          <DuesPanel
            summary={dues.data}
            open={openDues.data}
            loading={dues.status === 'loading' || openDues.status === 'loading'}
          />
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="overflow-hidden rounded-lg border border-line bg-graphite xl:col-span-2">
          <div className="px-5 pb-4 pt-5">
            <CardHeader
              title="Próximos jogos"
              description="Partidas confirmadas e agendadas"
              action={
                <Link
                  to="/app/jogos"
                  className="text-2xs text-ink-faint transition-colors duration-150 hover:text-gold"
                >
                  Ver todos →
                </Link>
              }
            />
          </div>
          <UpcomingMatches matches={nextMatches} loading={loading} />
        </section>

        <section className="overflow-hidden rounded-lg border border-line bg-graphite">
          <div className="px-5 pb-1 pt-5">
            <CardHeader title="Atividade recente" description="O que mudou nos últimos dias" />
          </div>
          <ActivityFeed records={activity.data ?? []} loading={activity.status === 'loading'} />
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="overflow-hidden rounded-lg border border-line bg-graphite xl:col-span-2">
          <div className="px-5 pb-1 pt-5">
            <CardHeader
              title="Últimos resultados"
              description="Desempenho recente do elenco profissional"
            />
          </div>
          <ResultsStrip matches={data?.lastResults ?? []} loading={loading} />
        </section>

        <section className="overflow-hidden rounded-lg border border-line bg-graphite">
          <div className="px-5 pb-2 pt-5">
            <CardHeader
              title="Alertas de estoque"
              description={`${data?.lowStockCount ?? 0} itens exigem atenção`}
            />
          </div>
          <StockAlerts items={lowStock.data ?? []} loading={lowStock.status === 'loading'} />
        </section>
      </div>

      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-4 overflow-hidden rounded-lg border border-line bg-graphite"
      >
        <div className="px-5 pb-1 pt-5">
          <CardHeader
            title="Próximos treinamentos"
            description="Sessões programadas para os próximos dias"
            action={
              <Link
                to="/app/treinamentos"
                className="text-2xs text-ink-faint transition-colors duration-150 hover:text-gold"
              >
                Ver agenda →
              </Link>
            }
          />
        </div>
        {nextTrainings.length === 0 ? (
          <EmptyState compact title="Sem treinos agendados" description="Nenhuma sessão nos próximos dias." />
        ) : (
          <ul className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            {nextTrainings.map((training) => (
              <li key={training.id} className="bg-graphite px-5 py-4 transition-colors duration-150 hover:bg-surface-raised">
                <p className="eyebrow">{formatDateShort(training.date)} · {training.time}</p>
                <p className="mt-2 text-[13px] text-ink">Treino {training.type.toLowerCase()}</p>
                <p className="mt-1 truncate text-2xs text-ink-muted">{training.team} · {training.location}</p>
              </li>
            ))}
          </ul>
        )}
      </motion.section>

      <p className="mt-6 text-2xs text-ink-ghost">
        Dados de demonstração · {currencyCompact(data?.balance ?? 0)} em caixa consolidado
      </p>
    </PageTransition>
  );
}
