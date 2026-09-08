import { createRepository } from './repository';
import { people } from '@/data/people';
import { boardMembers, players, staffMembers } from '@/data/squad';
import { competitions, lineups, matches, trainings } from '@/data/football';
import { expenseEntries, incomeEntries, monthlyDues } from '@/data/finance';
import { inventoryItems, inventoryMovements } from '@/data/inventory';
import { activityRecords } from '@/data/activity';
import type {
  BoardMember,
  Competition,
  ExpenseEntry,
  IncomeEntry,
  InventoryItem,
  InventoryMovement,
  Lineup,
  Match,
  MonthlyDue,
  Person,
  Player,
  StaffMember,
  Training,
} from '@/types/domain';

/**
 * Single registry of data access. Screens import from here and never from
 * `@/data`, so the mock seeds can be replaced by the API in one place.
 */
export const peopleRepo = createRepository<Person>(people, {
  searchable: ['fullName', 'nickname', 'email', 'phone', 'city', 'document'],
  idPrefix: 'per',
});

export const playersRepo = createRepository<Player>(players, {
  searchable: ['name', 'nickname', 'position', 'team'],
  idPrefix: 'ply',
});

export const boardRepo = createRepository<BoardMember>(boardMembers, {
  searchable: ['name', 'role', 'email', 'phone'],
  idPrefix: 'brd',
});

export const staffRepo = createRepository<StaffMember>(staffMembers, {
  searchable: ['name', 'role', 'team'],
  idPrefix: 'stf',
});

export const competitionsRepo = createRepository<Competition>(competitions, {
  searchable: ['name', 'organizer', 'season', 'team'],
  idPrefix: 'cmp',
});

export const matchesRepo = createRepository<Match>(matches, {
  searchable: ['opponent', 'location', 'team'],
  idPrefix: 'mtc',
});

export const trainingsRepo = createRepository<Training>(trainings, {
  searchable: ['location', 'team', 'type'],
  idPrefix: 'trn',
});

export const lineupsRepo = createRepository<Lineup>(lineups, {
  searchable: ['formation'],
  idPrefix: 'lnp',
});

export const duesRepo = createRepository<MonthlyDue>(monthlyDues, {
  searchable: ['referenceMonth', 'status'],
  idPrefix: 'due',
});

export const incomeRepo = createRepository<IncomeEntry>(incomeEntries, {
  searchable: ['description', 'category', 'source', 'responsible'],
  idPrefix: 'inc',
});

export const expenseRepo = createRepository<ExpenseEntry>(expenseEntries, {
  searchable: ['description', 'category', 'supplier', 'responsible'],
  idPrefix: 'exp',
});

export const inventoryRepo = createRepository<InventoryItem>(inventoryItems, {
  searchable: ['name', 'category', 'location'],
  idPrefix: 'inv',
});

export const movementsRepo = createRepository<InventoryMovement>(inventoryMovements, {
  searchable: ['reason', 'responsible'],
  idPrefix: 'mov',
});

export const activityRepo = createRepository(activityRecords, {
  searchable: ['title', 'detail', 'actor'],
  idPrefix: 'act',
});

export * from './repository';
