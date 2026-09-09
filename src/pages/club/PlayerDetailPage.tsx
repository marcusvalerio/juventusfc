import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageTransition } from '@/components/motion/PageTransition';
import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import { DetailList } from '@/components/data/DetailList';
import { DataTable, type Column } from '@/components/data/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { ShirtNumber } from '@/components/ui/Avatar';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState, LoadingState } from '@/components/ui/States';
import { ProgressBar } from '@/components/ui/Progress';
import { useAsync } from '@/hooks/useAsync';
import { playersRepo, duesRepo, lineupsRepo, matchesRepo } from '@/services';
import { matchLabel } from '@/services/analytics';
import { age, formatDate, formatMonthRef } from '@/lib/dates';
import { currency } from '@/lib/format';
import type { MonthlyDue } from '@/types/domain';

const TABS = [
  { value: 'ficha', label: 'Ficha' },
  { value: 'mensalidades', label: 'Mensalidades' },
  { value: 'jogos', label: 'Jogos' },
];

export default function PlayerDetailPage() {
  const { playerId = '' } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('ficha');

  const player = useAsync(() => playersRepo.get(playerId), [playerId]);
  const dues = useAsync(
    async () =>
      (await duesRepo.list()).filter((due) => due.playerId === playerId).sort((a, b) => b.referenceMonth.localeCompare(a.referenceMonth)),
    [playerId],
  );
  const appearances = useAsync(async () => {
    const [lineups, matches] = await Promise.all([lineupsRepo.list(), matchesRepo.list()]);
    return lineups
      .filter((lineup) => lineup.entries.some((entry) => entry.playerId === playerId))
      .map((lineup) => ({
        lineup,
        match: matches.find((match) => match.id === lineup.matchId),
        slot: lineup.entries.find((entry) => entry.playerId === playerId)?.slot ?? 'reserva',
      }))
      .filter((row) => row.match);
  }, [playerId]);

  if (player.status === 'loading') return <LoadingState label="Carregando ficha do jogador" />;

  const data = player.data;
  if (!data) {
    return (
      <EmptyState
        title="Jogador não encontrado"
        description="O registro pode ter sido removido do elenco."
        action={
          <Button variant="secondary" icon={<ArrowLeft />} onClick={() => navigate('/app/jogadores')}>
            Voltar para o elenco
          </Button>
        }
      />
    );
  }

  const paidCount = (dues.data ?? []).filter((due) => due.status === 'pago').length;
  const totalDues = (dues.data ?? []).length;
  const openAmount = (dues.data ?? []).reduce((sum, due) => sum + (due.expectedAmount - due.paidAmount), 0);

  const dueColumns: Column<MonthlyDue>[] = [
    { key: 'referenceMonth', header: 'Referência', render: (due) => formatMonthRef(due.referenceMonth) },
    { key: 'dueDate', header: 'Vencimento', render: (due) => formatDate(due.dueDate) },
    { key: 'expectedAmount', header: 'Previsto', align: 'right', render: (due) => <span className="tabular">{currency(due.expectedAmount)}</span> },
    {
      key: 'paidAmount',
      header: 'Pago',
      align: 'right',
      render: (due) => (
        <span className={`tabular ${due.paidAmount >= due.expectedAmount ? 'text-ink' : 'text-ink-muted'}`}>
          {currency(due.paidAmount)}
        </span>
      ),
    },
    { key: 'method', header: 'Forma', secondary: true, render: (due) => due.method ?? '—' },
    { key: 'status', header: 'Status', align: 'right', render: (due) => <StatusBadge status={due.status} /> },
  ];

  return (
    <PageTransition>
      <Link
        to="/app/jogadores"
        className="mb-6 inline-flex items-center gap-1.5 text-2xs text-ink-faint transition-colors duration-150 hover:text-ink"
      >
        <ArrowLeft className="h-3 w-3" aria-hidden />
        Elenco
      </Link>

      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-7 flex flex-wrap items-start justify-between gap-6"
      >
        <div className="flex items-start gap-5">
          <ShirtNumber value={data.shirtNumber} size="lg" />
          <div className="min-w-0">
            <p className="eyebrow mb-2">{data.team} · {data.position}</p>
            <h2 className="font-heading text-[30px] font-medium leading-tight tracking-tightest text-ink">
              {data.nickname ?? data.name}
            </h2>
            {data.nickname && <p className="mt-1 text-[13px] text-ink-muted">{data.name}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={data.status} />
              {data.secondaryPosition && <Badge tone="muted">Também {data.secondaryPosition.toLowerCase()}</Badge>}
              <Badge tone="neutral">{age(data.birthDate) ?? '—'} anos</Badge>
            </div>
          </div>
        </div>

        <LinkButton to="/app/jogadores" variant="secondary" icon={<Pencil />}>
          Editar no elenco
        </LinkButton>
      </motion.header>

      <Stagger className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StaggerItem className="rounded-lg border border-line bg-graphite p-5">
          <p className="eyebrow">Mensalidade</p>
          <p className="tabular mt-3 font-heading text-xl text-ink">{currency(data.monthlyFee)}</p>
          <p className="mt-1 text-2xs text-ink-faint">vence todo dia {data.dueDay}</p>
        </StaggerItem>
        <StaggerItem className="rounded-lg border border-line bg-graphite p-5">
          <p className="eyebrow">Adimplência</p>
          <p className="tabular mt-3 font-heading text-xl text-ink">
            {totalDues === 0 ? '—' : `${Math.round((paidCount / totalDues) * 100)}%`}
          </p>
          <ProgressBar className="mt-3" value={totalDues === 0 ? 0 : (paidCount / totalDues) * 100} />
        </StaggerItem>
        <StaggerItem className="rounded-lg border border-line bg-graphite p-5">
          <p className="eyebrow">Em aberto</p>
          <p className={`tabular mt-3 font-heading text-xl ${openAmount > 0 ? 'text-danger' : 'text-success'}`}>
            {currency(openAmount)}
          </p>
          <p className="mt-1 text-2xs text-ink-faint">nos últimos {totalDues} meses</p>
        </StaggerItem>
        <StaggerItem className="rounded-lg border border-line bg-graphite p-5">
          <p className="eyebrow">No clube desde</p>
          <p className="mt-3 font-heading text-xl text-ink">{formatDate(data.joinedAt)}</p>
          <p className="mt-1 text-2xs text-ink-faint">{data.team}</p>
        </StaggerItem>
      </Stagger>

      <Tabs items={TABS} value={tab} onChange={setTab} className="mb-5" />

      {tab === 'ficha' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-line bg-graphite p-6"
        >
          <DetailList
            items={[
              { label: 'Nome completo', value: data.name },
              { label: 'Apelido', value: data.nickname },
              { label: 'Número da camisa', value: data.shirtNumber },
              { label: 'Posição principal', value: data.position },
              { label: 'Posição secundária', value: data.secondaryPosition },
              { label: 'Equipe / categoria', value: data.team },
              { label: 'Data de nascimento', value: formatDate(data.birthDate) },
              { label: 'Telefone', value: data.phone },
              { label: 'Data de entrada', value: formatDate(data.joinedAt) },
              { label: 'Situação', value: <StatusBadge status={data.status} /> },
              { label: 'Observações', value: data.notes, wide: true },
            ]}
          />
        </motion.div>
      )}

      {tab === 'mensalidades' && (
        <DataTable
          columns={dueColumns}
          rows={dues.data ?? []}
          status={dues.status}
          getRowId={(due) => due.id}
          onRetry={dues.reload}
          empty={{ title: 'Sem mensalidades registradas', description: 'Nenhuma cobrança foi gerada para este atleta.' }}
        />
      )}

      {tab === 'jogos' && (
        <div className="rounded-lg border border-line bg-graphite">
          {appearances.status === 'loading' ? (
            <LoadingState label="Carregando participações" />
          ) : (appearances.data ?? []).length === 0 ? (
            <EmptyState
              compact
              title="Sem escalações registradas"
              description="Este jogador ainda não foi relacionado em nenhuma ficha de partida."
            />
          ) : (
            <ul className="divide-y divide-line">
              {(appearances.data ?? []).map(({ lineup, match, slot }) => (
                <li key={lineup.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-ink">{match ? matchLabel(match) : '—'}</p>
                    <p className="mt-0.5 text-2xs text-ink-faint">
                      {match ? formatDate(match.date) : ''} · formação {lineup.formation}
                    </p>
                  </div>
                  <Badge tone={slot === 'titular' ? 'gold' : 'neutral'}>
                    {slot === 'titular' ? 'Titular' : 'Reserva'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </PageTransition>
  );
}
