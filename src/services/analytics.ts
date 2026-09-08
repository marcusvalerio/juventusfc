import { activityRecords } from '@/data/activity';
import { expenseEntries, incomeEntries, monthlyDues, openingBalance } from '@/data/finance';
import { competitions, matches, trainings } from '@/data/football';
import { inventoryItems } from '@/data/inventory';
import { people } from '@/data/people';
import { boardMembers, players, staffMembers } from '@/data/squad';
import { MONTHS_SHORT, TODAY, TODAY_ISO, monthRefOf, parseDate } from '@/lib/dates';
import type { ActivityRecord, ID, Match, MonthlyDue, Player, Training } from '@/types/domain';

/**
 * Read models composed from several entities. In the next phase these become
 * server-side aggregations; the shape returned here is the contract.
 */

const settle = <T>(value: T, ms = 260): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

const inMonth = (date: string, ref: string) => date.startsWith(ref);
const currentRef = monthRefOf(TODAY);

export interface DashboardSummary {
  activePlayers: number;
  totalPeople: number;
  upcomingMatchCount: number;
  upcomingTrainingCount: number;
  monthIncome: number;
  monthExpense: number;
  balance: number;
  pendingDuesAmount: number;
  pendingDuesCount: number;
  overdueDuesCount: number;
  lowStockCount: number;
  duesCollectionRate: number;
  lastResults: Match[];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const monthIncome = incomeEntries
    .filter((entry) => inMonth(entry.date, currentRef))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const monthExpense = expenseEntries
    .filter((entry) => inMonth(entry.date, currentRef))
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalIncome = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalExpense = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);

  const currentDues = monthlyDues.filter((due) => due.referenceMonth === currentRef);
  const open = currentDues.filter((due) => due.status !== 'pago');
  const expected = currentDues.reduce((sum, due) => sum + due.expectedAmount, 0);
  const received = currentDues.reduce((sum, due) => sum + due.paidAmount, 0);

  return settle({
    activePlayers: players.filter((player) => player.status === 'ativo').length,
    totalPeople: people.length,
    upcomingMatchCount: upcomingMatches().length,
    upcomingTrainingCount: upcomingTrainings().length,
    monthIncome,
    monthExpense,
    balance: openingBalance + totalIncome - totalExpense,
    pendingDuesAmount: open.reduce((sum, due) => sum + (due.expectedAmount - due.paidAmount), 0),
    pendingDuesCount: open.length,
    overdueDuesCount: currentDues.filter((due) => due.status === 'atrasado').length,
    lowStockCount: inventoryItems.filter((item) => item.status !== 'disponivel').length,
    duesCollectionRate: expected === 0 ? 0 : Math.round((received / expected) * 100),
    lastResults: matches
      .filter((match) => match.status === 'encerrado')
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5),
  });
}

export const upcomingMatches = (limit?: number) => {
  const list = matches
    .filter((match) => match.date >= TODAY_ISO && match.status !== 'cancelado')
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return limit ? list.slice(0, limit) : list;
};

export const upcomingTrainings = (limit?: number) => {
  const list = trainings
    .filter((training) => training.date >= TODAY_ISO && training.status === 'agendado')
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return limit ? list.slice(0, limit) : list;
};

export interface CashFlowPoint {
  ref: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  balance: number;
}

/** Rolling monthly cash flow, oldest first, with the running balance. */
export async function getCashFlow(months = 6): Promise<CashFlowPoint[]> {
  const refs: string[] = [];
  for (let back = months - 1; back >= 0; back -= 1) {
    const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - back, 1);
    refs.push(monthRefOf(d));
  }

  const earliest = refs[0];
  let running =
    openingBalance +
    incomeEntries.filter((e) => e.date < `${earliest}-01`).reduce((s, e) => s + e.amount, 0) -
    expenseEntries.filter((e) => e.date < `${earliest}-01`).reduce((s, e) => s + e.amount, 0);

  const points = refs.map((ref) => {
    const income = incomeEntries.filter((e) => inMonth(e.date, ref)).reduce((s, e) => s + e.amount, 0);
    const expense = expenseEntries.filter((e) => inMonth(e.date, ref)).reduce((s, e) => s + e.amount, 0);
    running += income - expense;
    const monthIndex = Number(ref.split('-')[1]) - 1;
    return { ref, label: MONTHS_SHORT[monthIndex], income, expense, net: income - expense, balance: running };
  });

  return settle(points);
}

export interface CategorySlice {
  label: string;
  value: number;
  share: number;
}

export async function getExpenseBreakdown(months = 3): Promise<CategorySlice[]> {
  const from = new Date(TODAY.getFullYear(), TODAY.getMonth() - (months - 1), 1);
  const entries = expenseEntries.filter((entry) => parseDate(entry.date) >= from);
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const grouped = new Map<string, number>();
  entries.forEach((entry) => grouped.set(entry.category, (grouped.get(entry.category) ?? 0) + entry.amount));

  return settle(
    [...grouped.entries()]
      .map(([label, value]) => ({ label, value, share: total === 0 ? 0 : (value / total) * 100 }))
      .sort((a, b) => b.value - a.value),
  );
}

export interface DuesSummary {
  ref: string;
  expected: number;
  received: number;
  open: number;
  byStatus: Record<MonthlyDue['status'], number>;
}

export async function getDuesSummary(ref = currentRef): Promise<DuesSummary> {
  const list = monthlyDues.filter((due) => due.referenceMonth === ref);
  const byStatus = { pago: 0, pendente: 0, parcial: 0, atrasado: 0 } as Record<MonthlyDue['status'], number>;
  list.forEach((due) => {
    byStatus[due.status] += 1;
  });
  const expected = list.reduce((sum, due) => sum + due.expectedAmount, 0);
  const received = list.reduce((sum, due) => sum + due.paidAmount, 0);
  return settle({ ref, expected, received, open: expected - received, byStatus });
}

export const currentMonthRef = currentRef;

/* ------------------------------------------------------- relational lookups */

export const playerById = (id: ID): Player | undefined => players.find((p) => p.id === id);
export const playerName = (id: ID) => playerById(id)?.name ?? 'Jogador removido';
export const competitionName = (id?: ID) =>
  id ? (competitions.find((c) => c.id === id)?.name ?? '—') : 'Amistoso';
export const staffName = (id?: ID) =>
  id ? (staffMembers.find((s) => s.id === id)?.name ?? '—') : '—';
export const personName = (id: ID) => people.find((p) => p.id === id)?.fullName ?? '—';

export const matchLabel = (match: Match) =>
  match.venue === 'mandante' ? `Juventus × ${match.opponent}` : `${match.opponent} × Juventus`;

export const matchResult = (match: Match): 'vitoria' | 'empate' | 'derrota' | null => {
  if (match.status !== 'encerrado' || match.goalsFor == null || match.goalsAgainst == null) return null;
  if (match.goalsFor > match.goalsAgainst) return 'vitoria';
  if (match.goalsFor === match.goalsAgainst) return 'empate';
  return 'derrota';
};

export async function getRecentActivity(limit = 6): Promise<ActivityRecord[]> {
  return settle(activityRecords.slice(0, limit));
}

/* --------------------------------------------------------------- club stats */

export interface SquadDistribution {
  byPosition: { label: string; value: number }[];
  byTeam: { label: string; value: number }[];
}

export async function getSquadDistribution(): Promise<SquadDistribution> {
  const group = <K extends keyof Player>(key: K) => {
    const map = new Map<string, number>();
    players.forEach((player) => {
      const value = String(player[key]);
      map.set(value, (map.get(value) ?? 0) + 1);
    });
    return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  };
  return settle({ byPosition: group('position'), byTeam: group('team') });
}

export interface AgendaEvent {
  id: string;
  date: string;
  time: string;
  kind: 'jogo' | 'treino';
  title: string;
  subtitle: string;
  status: string;
}

/** Calendar feed merging matches and trainings into one ordered stream. */
export async function getAgenda(): Promise<AgendaEvent[]> {
  const fromMatches: AgendaEvent[] = matches.map((match) => ({
    id: match.id,
    date: match.date,
    time: match.time,
    kind: 'jogo',
    title: matchLabel(match),
    subtitle: `${competitionName(match.competitionId)} · ${match.team}`,
    status: match.status,
  }));

  const fromTrainings: AgendaEvent[] = trainings.map((training: Training) => ({
    id: training.id,
    date: training.date,
    time: training.time,
    kind: 'treino',
    title: `Treino ${training.type.toLowerCase()}`,
    subtitle: `${training.team} · ${training.location}`,
    status: training.status,
  }));

  return settle(
    [...fromMatches, ...fromTrainings].sort(
      (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
    ),
  );
}

export const boardActiveCount = boardMembers.filter((member) => member.status === 'ativo').length;
export const staffActiveCount = staffMembers.filter((member) => member.status === 'ativo').length;
