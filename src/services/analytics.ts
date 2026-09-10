import { apiFetch } from './api';
import type { InventoryItem, Match, Training } from '@/types/domain';

/**
 * Read models served by the API.
 *
 * Aggregation happens in SQL, not in the browser: the dashboard asks for the
 * numbers it shows and receives exactly those, so a club with no data reports
 * genuine zeros instead of anything synthesised on the client.
 */

export interface DuesOverview {
  ref: string;
  expected: number;
  received: number;
  open: number;
  openCount: number;
  overdueCount: number;
  collectionRate: number;
}

export interface DashboardSummary {
  activePlayers: number;
  totalPlayers: number;
  totalPeople: number;
  upcomingMatchCount: number;
  upcomingTrainingCount: number;
  monthIncome: number;
  monthExpense: number;
  balance: number;
  lowStockCount: number;
  dues: DuesOverview;
}

export interface CashFlowPoint {
  ref: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  balance: number;
}

export interface CategorySlice {
  label: string;
  value: number;
  share: number;
}

export interface OpenDue {
  id: string;
  person: string;
  personId: string;
  amount: number;
  dueDate: string;
  status: string;
}

export interface ActivityRecord {
  id: string;
  kind: string;
  title: string;
  detail: string;
  at: string;
  actor: string;
}

export interface DashboardOverview {
  upcomingMatches: Match[];
  upcomingTrainings: Training[];
  lastResults: Match[];
  activity: ActivityRecord[];
  lowStock: InventoryItem[];
  openDues: OpenDue[];
  cashFlow: CashFlowPoint[];
  duesByStatus: Record<string, number>;
}

export const getDashboardSummary = () => apiFetch<DashboardSummary>('/dashboard/summary');

export const getDashboardOverview = () => apiFetch<DashboardOverview>('/dashboard/overview');

export const getCashFlow = (months = 6) =>
  apiFetch<{ points: CashFlowPoint[]; breakdown: CategorySlice[] }>(
    `/finance/cash-flow?months=${months}`,
  );

/* ------------------------------------------------------- pure helpers */

/**
 * The club's own short name, used to render a fixture as "Casa × Visitante".
 * Set once by the session provider when the club loads, so match labels read
 * correctly for whatever organisation the instance belongs to.
 */
let clubShortName = 'Nosso time';
export const setClubShortName = (name: string) => {
  clubShortName = name || 'Nosso time';
};
export const getClubShortName = () => clubShortName;

export const matchLabel = (match: Pick<Match, 'venue' | 'opponent'>) =>
  match.venue === 'mandante'
    ? `${clubShortName} × ${match.opponent}`
    : `${match.opponent} × ${clubShortName}`;

export const matchResult = (
  match: Pick<Match, 'status' | 'goalsFor' | 'goalsAgainst'>,
): 'vitoria' | 'empate' | 'derrota' | null => {
  if (match.status !== 'encerrado' || match.goalsFor == null || match.goalsAgainst == null) return null;
  if (match.goalsFor > match.goalsAgainst) return 'vitoria';
  if (match.goalsFor === match.goalsAgainst) return 'empate';
  return 'derrota';
};

export const currentMonthRef = () => new Date().toISOString().slice(0, 7);

/** Merged calendar feed, built from lists the caller already loaded. */
export interface AgendaEvent {
  id: string;
  date: string;
  time: string;
  kind: 'jogo' | 'treino';
  title: string;
  subtitle: string;
  status: string;
}

export function buildAgenda(matches: Match[], trainings: Training[]): AgendaEvent[] {
  const fromMatches: AgendaEvent[] = matches.map((match) => ({
    id: match.id,
    date: match.date,
    time: match.time,
    kind: 'jogo',
    title: matchLabel(match),
    subtitle: `${match.competitionName ?? 'Amistoso'} · ${match.team}`,
    status: match.status,
  }));

  const fromTrainings: AgendaEvent[] = trainings.map((training) => ({
    id: training.id,
    date: training.date,
    time: training.time,
    kind: 'treino',
    title: `Treino ${training.type.toLowerCase()}`,
    subtitle: `${training.team} · ${training.location || 'Local a definir'}`,
    status: training.status,
  }));

  return [...fromMatches, ...fromTrainings].sort(
    (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
  );
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export const upcomingFrom = <T extends { date: string; time: string; status: string }>(
  items: T[],
  excluded: string[] = ['cancelado', 'encerrado'],
  limit?: number,
) => {
  const today = todayIso();
  const list = items
    .filter((item) => item.date >= today && !excluded.includes(item.status))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return limit ? list.slice(0, limit) : list;
};
