import { apiFetch } from './api';
import { createResource } from './repository';
import type {
  BoardMember,
  Lineup,
  Competition,
  ExpenseEntry,
  IncomeEntry,
  InventoryItem,
  InventoryMovement,
  Match,
  MonthlyDue,
  Person,
  Player,
  PlayerHistory,
  StaffMember,
  Training,
} from '@/types/domain';

/**
 * Single registry of data access. Screens import from here and never talk to
 * `fetch` directly, so authentication, error handling and endpoint layout stay
 * in one place.
 */
export const peopleRepo = createResource<Person>('/people');
export const playersRepo = createResource<Player>('/squad/players');
export const boardRepo = createResource<BoardMember>('/squad/board');
export const staffRepo = createResource<StaffMember>('/squad/staff');
export const competitionsRepo = createResource<Competition>('/football/competitions');
export const matchesRepo = createResource<Match>('/football/matches');
export const trainingsRepo = createResource<Training>('/football/trainings');
export const lineupsRepo = createResource<Lineup>('/football/lineups');
export const duesRepo = createResource<MonthlyDue>('/finance/dues');
export const incomeRepo = createResource<IncomeEntry>('/finance/income');
export const expenseRepo = createResource<ExpenseEntry>('/finance/expenses');
export const inventoryRepo = createResource<InventoryItem>('/inventory/items');
export const movementsRepo = createResource<InventoryMovement>('/inventory/movements');

export interface PlayerRemoval {
  ok: true;
  /** `inativado` when the player carried history that had to be preserved. */
  mode: 'inativado' | 'removido';
  history: PlayerHistory;
}

/**
 * Leaving the squad. The server decides between deleting the record and
 * retiring it, because only it can see what depends on the player — the caller
 * learns which happened from `mode`.
 */
export const removePlayer = (id: string) =>
  apiFetch<PlayerRemoval>(`/squad/players/${id}`, { method: 'DELETE' });

export * from './repository';
export * from './api';
