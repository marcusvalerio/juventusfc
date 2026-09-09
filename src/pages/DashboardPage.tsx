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
import { SetupChecklist } from './dashboard/SetupChecklist';
import { useAsync } from '@/hooks/useAsync';
import { getDashboardOverview, getDashboardSummary } from '@/services/analytics';
import { useSession } from '@/app/SessionContext';
import { currency, firstName } from '@/lib/format';
import { formatDateShort, MONTHS_LONG } from '@/lib/dates';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

/**
 * Club-wide overview. Every figure is a live aggregate: with an empty database
 * the cards read zero and the checklist takes over, instead of the layout being
 * padded with numbers nobody entered.
 */
export default function DashboardPage() {
  const { account, club, can } = useSession();
  const summary = useAsync(getDashboardSummary, []);
  const overview = useAsync(getDashboardOverview, []);

  const loading = summary.status === 'loading';
  const data = summary.data;
  const detail = overview.data;
  const today = new Date();

  if (summary.status === 'error') {
    return (
      <PageTransition>
        <PageHeader eyebrow="Início" title="Dashboard" />
        <ErrorState onRetry={summary.reload} message={summary.error?.message} />
      </PageTransition>
    );
  }

  const balanceSeries = detail?.cashFlow.map((point) => point.balance) ?? [];
  const isEmpty =
    summary.status === 'success' &&
    (data?.totalPeople ?? 0) <= 1 &&
    (data?.totalPlayers ?? 0) === 0 &&
    (data?.balance ?? 0) === 0;

  return (
    <PageTransition>
      <PageHeader
        eyebrow={`${MONTHS_LONG[today.getMonth()][0].toUpperCase()}${MONTHS_LONG[today.getMonth()].slice(1)} de ${today.getFullYear()}`}
        title={`${greeting()}, ${firstName(account?.displayName ?? '')}.`}
        description={`Panorama do ${club?.shortName ?? 'clube'} — elenco, agenda, finanças e patrimônio em um só lugar.`}
        actions={
          <>
            {can('football.view') && (
              <LinkButton to="/app/calendario" variant="secondary" icon={<CalendarDays />}>
                Calendário
              </LinkButton>
            )}
            {can('finance.create') && (
              <LinkButton to="/app/entradas" variant="gold" icon={<Plus />}>
                Novo lançamento
              </LinkButton>
            )}
          </>
        }
      />

      {isEmpty && <SetupChecklist summary={data} className="mb-6" />}

      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Jogadores ativos"
          value={data?.activePlayers ?? 0}
          hint={`${data?.totalPeople ?? 0} ${(data?.totalPeople ?? 0) === 1 ? 'pessoa cadastrada' : 'pessoas cadastradas'}`}
          loading={loading}
          icon={<Users />}
        />
        <StatCard
          label="Próximos jogos"
          value={data?.upcomingMatchCount ?? 0}
          hint={
            detail?.upcomingMatches[0]
              ? `Próximo em ${formatDateShort(detail.upcomingMatches[0].date)}`
              : 'Nenhum agendado'
          }
          loading={loading}
          icon={<CalendarDays />}
        />
        <StatCard
          label="Treinos agendados"
          value={data?.upcomingTrainingCount ?? 0}
          hint={
            detail?.upcomingTrainings[0]
              ? `Próximo em ${formatDateShort(detail.upcomingTrainings[0].date)}`
              : 'Nenhum agendado'
          }
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
          loading={loading || overview.status === 'loading'}
          icon={<Wallet />}
        />
      </Stagger>

      {can('finance.view') && (
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <ChartCard
            className="xl:col-span-2"
            title="Fluxo de caixa"
            description="Saldo consolidado nos últimos seis meses"
            loading={overview.status === 'loading'}
            action={
              <Link
                to="/app/fluxo-de-caixa"
                className="text-2xs text-ink-faint transition-colors duration-150 hover:text-gold"
              >
                Detalhar →
              </Link>
            }
            footer={
              detail && (
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
              data={(detail?.cashFlow ?? []).map((point) => ({ label: point.label, value: point.balance }))}
              height={262}
              formatValue={currency}
            />
          </ChartCard>

          <section className="overflow-hidden rounded-lg border border-line bg-graphite">
            <div className="px-5 pt-5">
              <CardHeader
                title="Mensalidades do mês"
                description={
                  (data?.dues.openCount ?? 0) > 0
                    ? `${data?.dues.openCount} em aberto · ${currency(data?.dues.open ?? 0)}`
                    : 'Nenhuma cobrança em aberto'
                }
                action={
                  (data?.dues.overdueCount ?? 0) > 0 ? (
                    <Badge tone="danger">{data?.dues.overdueCount} em atraso</Badge>
                  ) : undefined
                }
              />
            </div>
            {data && data.dues.expected === 0 && summary.status === 'success' ? (
              <EmptyState
                compact
                title="Nenhuma mensalidade no mês"
                description="Gere as cobranças do período na tela de mensalidades."
              />
            ) : (
              <DuesPanel
                summary={data?.dues}
                open={detail?.openDues}
                byStatus={detail?.duesByStatus}
                loading={loading || overview.status === 'loading'}
              />
            )}
          </section>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        {can('football.view') && (
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
            <UpcomingMatches
              matches={detail?.upcomingMatches ?? []}
              loading={overview.status === 'loading'}
            />
          </section>
        )}

        <section className="overflow-hidden rounded-lg border border-line bg-graphite">
          <div className="px-5 pb-1 pt-5">
            <CardHeader title="Atividade recente" description="O que mudou nos últimos dias" />
          </div>
          {overview.status === 'success' && (detail?.activity.length ?? 0) === 0 ? (
            <EmptyState
              compact
              title="Nada registrado ainda"
              description="As ações feitas no sistema aparecem aqui."
            />
          ) : (
            <ActivityFeed records={detail?.activity ?? []} loading={overview.status === 'loading'} />
          )}
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        {can('football.view') && (
          <section className="overflow-hidden rounded-lg border border-line bg-graphite xl:col-span-2">
            <div className="px-5 pb-1 pt-5">
              <CardHeader title="Últimos resultados" description="Desempenho recente do elenco" />
            </div>
            {overview.status === 'success' && (detail?.lastResults.length ?? 0) === 0 ? (
              <EmptyState
                compact
                title="Nenhuma partida encerrada"
                description="Registre o placar de um jogo para acompanhar o desempenho."
              />
            ) : (
              <ResultsStrip matches={detail?.lastResults ?? []} loading={overview.status === 'loading'} />
            )}
          </section>
        )}

        {can('inventory.view') && (
          <section className="overflow-hidden rounded-lg border border-line bg-graphite">
            <div className="px-5 pb-2 pt-5">
              <CardHeader
                title="Alertas de estoque"
                description={
                  (data?.lowStockCount ?? 0) > 0
                    ? `${data?.lowStockCount} itens exigem atenção`
                    : 'Nenhum item abaixo do mínimo'
                }
              />
            </div>
            <StockAlerts items={detail?.lowStock ?? []} loading={overview.status === 'loading'} />
          </section>
        )}
      </div>

      {can('football.view') && (detail?.upcomingTrainings.length ?? 0) > 0 && (
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
          <ul className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            {(detail?.upcomingTrainings ?? []).map((training) => (
              <li
                key={training.id}
                className="bg-graphite px-5 py-4 transition-colors duration-150 hover:bg-surface-raised"
              >
                <p className="eyebrow">
                  {formatDateShort(training.date)} · {training.time}
                </p>
                <p className="mt-2 text-[13px] text-ink">Treino {training.type.toLowerCase()}</p>
                <p className="mt-1 truncate text-2xs text-ink-muted">
                  {[training.team, training.location].filter(Boolean).join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </motion.section>
      )}
    </PageTransition>
  );
}
