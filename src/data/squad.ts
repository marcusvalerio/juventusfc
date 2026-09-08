import type { BoardMember, Player, StaffMember } from '@/types/domain';
import { dayOffset, stamped } from './_util';

type PlayerSeed = Omit<Player, 'createdAt' | 'updatedAt'>;

const playerSeeds: PlayerSeed[] = [
  { id: 'ply-001', personId: 'per-012', name: 'Rafael Corsini', shirtNumber: 1, position: 'Goleiro', team: 'Profissional', birthDate: '1996-09-13', phone: '(11) 98722-3318', joinedAt: '2022-01-17', monthlyFee: 180, dueDay: 10, status: 'ativo' },
  { id: 'ply-002', personId: 'per-019', name: 'André Kuroda', shirtNumber: 2, position: 'Lateral Direito', secondaryPosition: 'Zagueiro', team: 'Profissional', birthDate: '1995-05-02', phone: '(11) 99887-3341', joinedAt: '2021-03-02', monthlyFee: 180, dueDay: 10, status: 'ativo' },
  { id: 'ply-003', personId: 'per-017', name: 'Leonardo Bastos', shirtNumber: 3, position: 'Zagueiro', team: 'Profissional', birthDate: '1994-03-28', phone: '(11) 99771-8802', joinedAt: '2020-08-11', monthlyFee: 180, dueDay: 10, status: 'ativo', notes: 'Capitão do elenco profissional.' },
  { id: 'ply-004', personId: 'per-024', name: 'Bruno Sartori', shirtNumber: 4, position: 'Zagueiro', team: 'Profissional', birthDate: '1996-01-14', phone: '(11) 98812-0034', joinedAt: '2023-02-06', monthlyFee: 180, dueDay: 10, status: 'ativo' },
  { id: 'ply-005', personId: 'per-021', name: 'Fernando Quirino', nickname: 'Nando', shirtNumber: 6, position: 'Lateral Esquerdo', team: 'Profissional', birthDate: '1993-12-19', phone: '(11) 99640-7789', joinedAt: '2019-05-20', monthlyFee: 180, dueDay: 5, status: 'lesionado', notes: 'Lesão muscular na coxa direita. Reavaliação em duas semanas.' },
  { id: 'ply-006', personId: 'per-013', name: 'Émerson Caldeira', nickname: 'Cacá', shirtNumber: 5, position: 'Volante', team: 'Profissional', birthDate: '1999-01-30', phone: '(11) 99904-7712', joinedAt: '2022-07-04', monthlyFee: 180, dueDay: 10, status: 'ativo' },
  { id: 'ply-007', personId: 'per-011', name: 'Thiago Mancuso', nickname: 'Thiaguinho', shirtNumber: 8, position: 'Meia', secondaryPosition: 'Ponta', team: 'Profissional', birthDate: '1998-04-21', phone: '(11) 99120-5540', joinedAt: '2021-01-11', monthlyFee: 180, dueDay: 10, status: 'ativo' },
  { id: 'ply-008', personId: 'per-028', name: 'Diego Marchetti', shirtNumber: 10, position: 'Meia', team: 'Profissional', birthDate: '1998-07-19', phone: '(11) 98515-2288', joinedAt: '2023-06-19', monthlyFee: 200, dueDay: 15, status: 'ativo', notes: 'Principal articulador do meio-campo.' },
  { id: 'ply-009', personId: 'per-015', name: 'Vinícius Abreu', nickname: 'Vini', shirtNumber: 7, position: 'Ponta', team: 'Profissional', birthDate: '2000-02-17', phone: '(11) 99333-1247', joinedAt: '2022-02-28', monthlyFee: 180, dueDay: 10, status: 'ativo' },
  { id: 'ply-010', personId: 'per-018', name: 'Gustavo Peçanha', nickname: 'Guto', shirtNumber: 9, position: 'Atacante', team: 'Profissional', birthDate: '1997-11-11', phone: '(11) 98244-6650', joinedAt: '2021-09-08', monthlyFee: 200, dueDay: 10, status: 'ativo', notes: 'Artilheiro da temporada.' },
  { id: 'ply-011', personId: 'per-027', name: 'Sidnei Palhares', shirtNumber: 11, position: 'Ponta', secondaryPosition: 'Atacante', team: 'Profissional', birthDate: '1992-10-16', phone: '(11) 99001-4432', joinedAt: '2018-11-30', monthlyFee: 180, dueDay: 5, status: 'ativo' },
  { id: 'ply-012', personId: 'per-023', name: 'Caio Vasconcelos', shirtNumber: 14, position: 'Volante', team: 'Profissional', birthDate: '1999-09-01', phone: '(11) 99450-9987', joinedAt: '2023-01-23', monthlyFee: 180, dueDay: 15, status: 'suspenso', notes: 'Cumpre suspensão automática por cartões.' },
  { id: 'ply-013', personId: 'per-029', name: 'Alan Ribeiro Pinto', shirtNumber: 16, position: 'Meia', team: 'Profissional', birthDate: '2000-11-23', phone: '(11) 99772-0091', joinedAt: '2024-02-12', monthlyFee: 180, dueDay: 10, status: 'ativo' },
  { id: 'ply-014', personId: 'per-014', name: 'Nícolas Ferraz', shirtNumber: 12, position: 'Goleiro', team: 'Sub-20', birthDate: '2001-10-05', phone: '(11) 98115-9903', joinedAt: '2023-03-14', monthlyFee: 140, dueDay: 10, status: 'ativo' },
  { id: 'ply-015', personId: 'per-020', name: 'Murilo Sampaio', shirtNumber: 15, position: 'Zagueiro', team: 'Sub-20', birthDate: '2002-08-24', phone: '(11) 98002-1176', joinedAt: '2023-04-01', monthlyFee: 140, dueDay: 10, status: 'ativo' },
  { id: 'ply-016', personId: 'per-025', name: 'Otávio Lemgruber', shirtNumber: 18, position: 'Meia', secondaryPosition: 'Volante', team: 'Sub-20', birthDate: '2001-04-03', phone: '(11) 99228-7714', joinedAt: '2022-09-05', monthlyFee: 140, dueDay: 10, status: 'ativo' },
  { id: 'ply-017', personId: 'per-022', name: 'Iago Bertoldo', shirtNumber: 19, position: 'Atacante', team: 'Sub-20', birthDate: '2003-06-06', phone: '(11) 98338-4420', joinedAt: '2024-01-15', monthlyFee: 140, dueDay: 15, status: 'ativo' },
  { id: 'ply-018', personId: 'per-016', name: 'Kauã Belmiro', shirtNumber: 21, position: 'Ponta', team: 'Sub-17', birthDate: '2004-07-09', phone: '(11) 98650-2214', joinedAt: '2024-07-22', monthlyFee: 120, dueDay: 10, status: 'ativo', notes: 'Promovido do Sub-17 para treinos com o Sub-20.' },
  { id: 'ply-019', personId: 'per-026', name: 'Ruan Diniz', shirtNumber: 23, position: 'Lateral Direito', team: 'Sub-17', birthDate: '2005-02-26', phone: '(11) 98770-5512', joinedAt: '2025-02-03', monthlyFee: 120, dueDay: 10, status: 'ativo' },
  { id: 'ply-020', personId: 'per-030', name: 'Juliano Vasquez', shirtNumber: 17, position: 'Atacante', team: 'Profissional', birthDate: '1997-03-07', phone: '(11) 98221-6674', joinedAt: '2020-02-10', monthlyFee: 180, dueDay: 10, status: 'afastado', notes: 'Afastado a pedido desde julho.' },
];

export const players = stamped(playerSeeds) as Player[];

type BoardSeed = Omit<BoardMember, 'createdAt' | 'updatedAt'>;

const boardSeeds: BoardSeed[] = [
  { id: 'brd-001', personId: 'per-001', name: 'Aurélio Mancini', role: 'Presidente', startDate: '2021-01-15', status: 'ativo', phone: '(11) 98812-4471', email: 'aurelio.mancini@juventusfc.com.br', notes: 'Mandato vigente até o fim da temporada seguinte.' },
  { id: 'brd-002', personId: 'per-005', name: 'Ivan Bertolucci', role: 'Vice-presidente', startDate: '2021-01-15', status: 'ativo', phone: '(11) 97744-1180', email: 'ivan.bertolucci@juventusfc.com.br' },
  { id: 'brd-003', personId: 'per-002', name: 'Beatriz Rangel', role: 'Diretora Financeira', startDate: '2022-03-01', status: 'ativo', phone: '(11) 99640-2280', email: 'beatriz.rangel@juventusfc.com.br', notes: 'Responsável pelo fechamento mensal e prestação de contas.' },
  { id: 'brd-004', personId: 'per-003', name: 'Henrique Salgado', role: 'Diretor de Futebol', startDate: '2023-01-09', status: 'ativo', phone: '(11) 98123-7719', email: 'henrique.salgado@juventusfc.com.br' },
  { id: 'brd-005', personId: 'per-004', name: 'Cláudia Perretti', role: 'Diretora Administrativa', startDate: '2024-02-05', status: 'ativo', phone: '(11) 99215-6603', email: 'claudia.perretti@juventusfc.com.br' },
  { id: 'brd-006', personId: 'per-033', name: 'Sônia Verdi', role: 'Diretora Social', startDate: '2019-01-20', endDate: '2023-12-31', status: 'encerrado', phone: '(11) 99118-2245', notes: 'Encerrou o mandato, segue como conselheira.' },
  { id: 'brd-007', personId: 'per-034', name: 'Marcelo Grimaldi', role: 'Diretor de Marketing', startDate: '2025-04-14', status: 'ativo', phone: '(11) 98004-7781', email: 'marcelo.grimaldi@gmail.com' },
];

export const boardMembers = stamped(boardSeeds) as BoardMember[];

type StaffSeed = Omit<StaffMember, 'createdAt' | 'updatedAt'>;

const staffSeeds: StaffSeed[] = [
  { id: 'stf-001', personId: 'per-006', name: 'Rogério Tavares', role: 'Treinador', team: 'Profissional', startDate: '2023-01-10', status: 'ativo', notes: 'Comanda os treinos de terça, quinta e sábado.' },
  { id: 'stf-002', personId: 'per-007', name: 'Wesley Fontenele', role: 'Auxiliar Técnico', team: 'Profissional', startDate: '2023-01-10', status: 'ativo' },
  { id: 'stf-003', personId: 'per-009', name: 'Marina Duarte', role: 'Preparador Físico', team: 'Profissional', startDate: '2022-06-01', status: 'ativo', notes: 'Também acompanha a preparação do Sub-20.' },
  { id: 'stf-004', personId: 'per-010', name: 'Paulo Sérgio Vasques', role: 'Preparador de Goleiros', team: 'Profissional', startDate: '2021-08-16', status: 'ativo' },
  { id: 'stf-005', personId: 'per-008', name: 'Danilo Aoki', role: 'Treinador', team: 'Sub-20', startDate: '2024-01-08', status: 'ativo' },
  { id: 'stf-006', personId: 'per-032', name: 'Jorge Antunes', role: 'Massagista', team: 'Profissional', startDate: '2018-02-01', status: 'ativo', notes: 'Atende também o Sub-17 nos jogos de fim de semana.' },
];

export const staffMembers = stamped(staffSeeds) as StaffMember[];

/** Recent squad arrival, used by the dashboard activity strip. */
export const lastSignedAt = dayOffset(-26);
