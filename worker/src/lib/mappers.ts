/**
 * Row → DTO mappers.
 *
 * The API answers in exactly the shapes the SPA already consumes
 * (`src/types/domain.ts`), including denormalised display names such as
 * `personName` on a due. That keeps table renderers synchronous: the client
 * never has to resolve a foreign key to draw a row.
 */

const nullable = <T>(value: T | null | undefined) => (value === null ? undefined : value);

export interface Row {
  [key: string]: unknown;
}

const str = (row: Row, key: string) => (row[key] == null ? undefined : String(row[key]));
const num = (row: Row, key: string) => (row[key] == null ? undefined : Number(row[key]));

const base = (row: Row) => ({
  id: String(row.id),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export const mapPerson = (row: Row) => ({
  ...base(row),
  fullName: String(row.full_name),
  nickname: str(row, 'nickname'),
  birthDate: str(row, 'birth_date'),
  phone: str(row, 'phone'),
  email: str(row, 'email'),
  document: str(row, 'document'),
  address: str(row, 'address'),
  city: str(row, 'city'),
  status: String(row.status),
  notes: str(row, 'notes'),
  // Billing lives on the person: a member is charged once, whatever links they hold.
  monthlyFeeEnabled: Boolean(row.monthly_fee_enabled),
  monthlyFee: Number(row.monthly_fee ?? 0),
  dueDay: Number(row.due_day ?? 10),
  roles: [
    row.is_player ? 'jogador' : null,
    row.is_board ? 'diretoria' : null,
    row.is_staff ? 'comissao' : null,
  ].filter(Boolean) as string[],
  hasAccount: Boolean(row.has_account),
});

export const mapPlayer = (row: Row) => ({
  ...base(row),
  personId: String(row.person_id),
  name: String(row.full_name),
  nickname: str(row, 'nickname'),
  shirtNumber: num(row, 'shirt_number'),
  position: String(row.position),
  secondaryPosition: str(row, 'secondary_position'),
  teamId: str(row, 'team_id'),
  team: str(row, 'team_name') ?? 'Sem categoria',
  birthDate: str(row, 'birth_date'),
  phone: str(row, 'phone'),
  joinedAt: str(row, 'joined_at') ?? '',
  // Aliased from `people` by PLAYER_SELECT — the squad row no longer owns these.
  monthlyFee: Number(row.person_monthly_fee ?? 0),
  dueDay: Number(row.person_due_day ?? 10),
  monthlyFeeEnabled: Boolean(row.person_fee_enabled),
  status: String(row.status),
  notes: str(row, 'notes'),
});

export const mapBoardMember = (row: Row) => ({
  ...base(row),
  personId: String(row.person_id),
  name: String(row.full_name),
  role: String(row.role),
  startDate: str(row, 'start_date') ?? '',
  endDate: str(row, 'end_date'),
  status: String(row.status),
  phone: str(row, 'phone'),
  email: str(row, 'email'),
  notes: str(row, 'notes'),
});

export const mapStaffMember = (row: Row) => ({
  ...base(row),
  personId: String(row.person_id),
  name: String(row.full_name),
  role: String(row.role),
  specialty: str(row, 'specialty'),
  teamId: str(row, 'team_id'),
  team: str(row, 'team_name') ?? 'Sem categoria',
  startDate: str(row, 'start_date') ?? '',
  status: String(row.status),
  notes: str(row, 'notes'),
});

export const mapCompetition = (row: Row) => ({
  ...base(row),
  name: String(row.name),
  season: str(row, 'season') ?? '',
  organizer: str(row, 'organizer') ?? '',
  teamId: str(row, 'team_id'),
  team: str(row, 'team_name') ?? 'Sem categoria',
  status: String(row.status),
  format: str(row, 'format'),
  notes: str(row, 'notes'),
});

export const mapMatch = (row: Row) => ({
  ...base(row),
  date: String(row.match_date),
  time: String(row.match_time),
  opponent: String(row.opponent),
  location: str(row, 'location') ?? '',
  venue: String(row.venue),
  competitionId: str(row, 'competition_id'),
  competitionName: str(row, 'competition_name') ?? 'Amistoso',
  teamId: str(row, 'team_id'),
  team: str(row, 'team_name') ?? 'Sem categoria',
  status: String(row.status),
  goalsFor: num(row, 'goals_for'),
  goalsAgainst: num(row, 'goals_against'),
  notes: str(row, 'notes'),
});

export const mapTraining = (row: Row) => ({
  ...base(row),
  date: String(row.training_date),
  time: String(row.training_time),
  location: str(row, 'location') ?? '',
  teamId: str(row, 'team_id'),
  team: str(row, 'team_name') ?? 'Sem categoria',
  responsibleId: str(row, 'responsible_id'),
  responsibleName: str(row, 'responsible_name') ?? '—',
  type: String(row.type),
  status: String(row.status),
  notes: str(row, 'notes'),
});

export const mapDue = (row: Row) => ({
  ...base(row),
  personId: String(row.person_id),
  personName: str(row, 'person_name') ?? '—',
  personNickname: str(row, 'person_nickname'),
  // Links are shown beside the name so the charge reads as belonging to the
  // person, not to whichever role happens to be listed first.
  personRoles: [
    row.is_player ? 'jogador' : null,
    row.is_board ? 'diretoria' : null,
    row.is_staff ? 'comissao' : null,
  ].filter(Boolean) as string[],
  referenceMonth: String(row.reference_month),
  dueDate: String(row.due_date),
  expectedAmount: Number(row.expected_amount ?? 0),
  paidAmount: Number(row.paid_amount ?? 0),
  paidAt: str(row, 'paid_at'),
  method: str(row, 'method'),
  status: String(row.status),
  notes: str(row, 'notes'),
});

export const mapIncome = (row: Row) => ({
  ...base(row),
  date: String(row.entry_date),
  description: String(row.description),
  category: String(row.category),
  source: str(row, 'source') ?? '',
  amount: Number(row.amount ?? 0),
  method: str(row, 'method') ?? '',
  responsible: str(row, 'responsible') ?? '',
  notes: str(row, 'notes'),
});

export const mapExpense = (row: Row) => ({
  ...base(row),
  date: String(row.entry_date),
  description: String(row.description),
  category: String(row.category),
  supplier: str(row, 'supplier') ?? '',
  amount: Number(row.amount ?? 0),
  method: str(row, 'method') ?? '',
  responsible: str(row, 'responsible') ?? '',
  notes: str(row, 'notes'),
});

/** Stock status is derived, never stored, so it can never drift from quantity. */
export const inventoryStatus = (quantity: number, minQuantity: number) =>
  quantity <= 0 ? 'esgotado' : quantity < minQuantity ? 'baixo' : 'disponivel';

export const mapInventoryItem = (row: Row) => {
  const quantity = Number(row.quantity ?? 0);
  const minQuantity = Number(row.min_quantity ?? 0);
  return {
    ...base(row),
    name: String(row.name),
    category: String(row.category),
    quantity,
    unit: String(row.unit),
    minQuantity,
    location: str(row, 'location') ?? '',
    status: inventoryStatus(quantity, minQuantity),
    notes: str(row, 'notes'),
  };
};

export const mapMovement = (row: Row) => ({
  ...base(row),
  itemId: String(row.item_id),
  itemName: str(row, 'item_name') ?? '—',
  type: String(row.type),
  quantity: Number(row.quantity ?? 0),
  date: String(row.movement_date),
  responsible: str(row, 'responsible') ?? '',
  reason: str(row, 'reason') ?? '',
  notes: str(row, 'notes'),
});

export const mapClub = (row: Row) => ({
  id: String(row.id),
  officialName: String(row.official_name),
  shortName: String(row.short_name),
  city: str(row, 'city') ?? '',
  state: str(row, 'state') ?? '',
  country: str(row, 'country') ?? 'Brasil',
  foundedYear: str(row, 'founded_year') ?? '',
  venue: str(row, 'venue') ?? '',
  address: str(row, 'address') ?? '',
  phone: str(row, 'phone') ?? '',
  email: str(row, 'email') ?? '',
  website: str(row, 'website') ?? '',
  social: str(row, 'social') ?? '',
  crestKey: str(row, 'crest_key'),
  primaryColor: str(row, 'primary_color') ?? '',
  secondaryColor: str(row, 'secondary_color') ?? '',
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export const mapSettings = (row: Row) => ({
  defaultMonthlyFee: Number(row.default_monthly_fee ?? 0),
  defaultDueDay: Number(row.default_due_day ?? 10),
  paymentMethods: JSON.parse(String(row.payment_methods ?? '[]')) as string[],
  currency: String(row.currency ?? 'BRL'),
  season: str(row, 'season') ?? '',
  lowStockAlerts: Boolean(row.low_stock_alerts),
  dueReminders: Boolean(row.due_reminders),
});

export const mapTeam = (row: Row) => ({
  id: String(row.id),
  name: String(row.name),
  sortOrder: Number(row.sort_order ?? 0),
});

export const mapActivity = (row: Row) => ({
  id: String(row.id),
  kind: String(row.kind),
  title: String(row.title),
  detail: str(row, 'detail') ?? '',
  at: String(row.created_at),
  actor: String(row.actor_name),
});

export { nullable };
