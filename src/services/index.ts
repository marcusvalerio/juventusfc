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

export * from './repository';
export * from './api';
