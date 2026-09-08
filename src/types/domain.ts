/**
 * Domain model for Juventus F.C.
 *
 * Every entity carries a stable `id` and audit stamps so the mock repositories
 * can be swapped for a real database/API without touching the UI layer.
 * Relations are expressed as ids (never nested objects), mirroring how rows
 * will come back from SQL. Read models that join entities live in `services/`.
 */

export type ID = string;
export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string; // full ISO 8601

export interface Entity {
  id: ID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/* ------------------------------------------------------------------ people */

export type PersonStatus = 'ativo' | 'inativo';

/**
 * A person is the single source of truth for an individual in the club.
 * Roles (player, board member, coaching staff) are *links* to this record,
 * never copies of it — and a future access account will link here too.
 */
export interface Person extends Entity {
  fullName: string;
  nickname?: string;
  birthDate?: ISODate;
  phone?: string;
  email?: string;
  document?: string; // CPF/RG
  address?: string;
  city?: string;
  status: PersonStatus;
  notes?: string;
  /** Denormalized for fast filtering; derived from the membership tables. */
  roles: MembershipRole[];
}

export type MembershipRole = 'jogador' | 'diretoria' | 'comissao' | 'administrativo' | 'outro';

/* ------------------------------------------------------------------- squad */

export type Position =
  | 'Goleiro'
  | 'Zagueiro'
  | 'Lateral Direito'
  | 'Lateral Esquerdo'
  | 'Volante'
  | 'Meia'
  | 'Ponta'
  | 'Atacante';

export type SquadTeam = 'Profissional' | 'Sub-20' | 'Sub-17' | 'Veteranos';

export type SquadStatus = 'ativo' | 'lesionado' | 'suspenso' | 'afastado' | 'inativo';

export interface Player extends Entity {
  personId: ID;
  name: string;
  nickname?: string;
  shirtNumber?: number;
  position: Position;
  secondaryPosition?: Position;
  team: SquadTeam;
  birthDate?: ISODate;
  phone?: string;
  joinedAt: ISODate;
  monthlyFee: number;
  dueDay: number; // 1-31
  status: SquadStatus;
  notes?: string;
}

export type BoardStatus = 'ativo' | 'encerrado';

export interface BoardMember extends Entity {
  personId: ID;
  name: string;
  role: string; // Presidente, Vice-presidente, Diretor Financeiro...
  startDate: ISODate;
  endDate?: ISODate;
  status: BoardStatus;
  phone?: string;
  email?: string;
  notes?: string;
}

export type StaffRole = 'Treinador' | 'Auxiliar Técnico' | 'Preparador Físico' | 'Preparador de Goleiros' | 'Massagista' | 'Analista';

export interface StaffMember extends Entity {
  personId: ID;
  name: string;
  role: StaffRole;
  team: SquadTeam;
  startDate: ISODate;
  status: 'ativo' | 'inativo';
  notes?: string;
}

/* ---------------------------------------------------------------- football */

export type CompetitionStatus = 'planejado' | 'em andamento' | 'encerrado';

export interface Competition extends Entity {
  name: string;
  season: string; // "2026"
  organizer: string;
  team: SquadTeam;
  status: CompetitionStatus;
  format?: string;
  notes?: string;
}

export type MatchStatus = 'agendado' | 'confirmado' | 'encerrado' | 'adiado' | 'cancelado';
export type MatchVenue = 'mandante' | 'visitante';

export interface Match extends Entity {
  date: ISODate;
  time: string; // HH:mm
  opponent: string;
  location: string;
  venue: MatchVenue;
  competitionId?: ID;
  team: SquadTeam;
  status: MatchStatus;
  goalsFor?: number;
  goalsAgainst?: number;
  notes?: string;
}

export type TrainingType = 'Técnico' | 'Tático' | 'Físico' | 'Recreativo' | 'Coletivo';
export type TrainingStatus = 'agendado' | 'realizado' | 'cancelado';

export interface Training extends Entity {
  date: ISODate;
  time: string;
  location: string;
  team: SquadTeam;
  responsibleId?: ID; // StaffMember
  type: TrainingType;
  status: TrainingStatus;
  notes?: string;
}

export type LineupSlot = 'titular' | 'reserva';

export interface LineupEntry {
  playerId: ID;
  slot: LineupSlot;
  shirtNumber?: number;
  position: Position;
}

export interface Lineup extends Entity {
  matchId: ID;
  formation: string; // "4-3-3"
  entries: LineupEntry[];
  staffIds: ID[];
  notes?: string;
}

/* --------------------------------------------------------------- financial */

export type DueStatus = 'pago' | 'pendente' | 'parcial' | 'atrasado';
export type PaymentMethod = 'Pix' | 'Dinheiro' | 'Transferência' | 'Cartão' | 'Boleto';

export interface MonthlyDue extends Entity {
  playerId: ID;
  referenceMonth: string; // YYYY-MM
  dueDate: ISODate;
  expectedAmount: number;
  paidAmount: number;
  paidAt?: ISODate;
  method?: PaymentMethod;
  status: DueStatus;
  notes?: string;
}

export type IncomeCategory =
  | 'Mensalidades'
  | 'Patrocínio'
  | 'Eventos'
  | 'Doações'
  | 'Bilheteria'
  | 'Outros';

export interface IncomeEntry extends Entity {
  date: ISODate;
  description: string;
  category: IncomeCategory;
  source: string;
  amount: number;
  method: PaymentMethod;
  responsible: string;
  notes?: string;
}

export type ExpenseCategory =
  | 'Material Esportivo'
  | 'Arbitragem'
  | 'Transporte'
  | 'Estrutura'
  | 'Alimentação'
  | 'Inscrições'
  | 'Saúde'
  | 'Outros';

export interface ExpenseEntry extends Entity {
  date: ISODate;
  description: string;
  category: ExpenseCategory;
  supplier: string;
  amount: number;
  method: PaymentMethod;
  responsible: string;
  notes?: string;
}

/* --------------------------------------------------------------- inventory */

export type InventoryCategory =
  | 'Uniformes'
  | 'Bolas'
  | 'Treino'
  | 'Equipamentos'
  | 'Saúde'
  | 'Outros';

export type InventoryStatus = 'disponivel' | 'baixo' | 'esgotado';

export interface InventoryItem extends Entity {
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: string; // un, par, cx
  minQuantity: number;
  location: string;
  status: InventoryStatus;
  notes?: string;
}

export type MovementType = 'entrada' | 'saida' | 'ajuste';

export interface InventoryMovement extends Entity {
  itemId: ID;
  type: MovementType;
  quantity: number;
  date: ISODate;
  responsible: string;
  reason: string;
  notes?: string;
}

/* -------------------------------------------------------------- club/meta */

export interface ClubProfile {
  name: string;
  shortName: string;
  foundedAt: string;
  city: string;
  stadium: string;
  colors: string;
  president: string;
  email: string;
  phone: string;
}

export type ActivityKind = 'financeiro' | 'elenco' | 'futebol' | 'estoque' | 'sistema';

export interface ActivityRecord {
  id: ID;
  kind: ActivityKind;
  title: string;
  detail: string;
  at: ISODateTime;
  actor: string;
}

/** Placeholder identity — replaced by the real session user in the next phase. */
export interface ViewerProfile {
  name: string;
  role: string;
  initials: string;
}
