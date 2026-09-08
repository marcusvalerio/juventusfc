import type { Competition, Lineup, Match, Training } from '@/types/domain';
import { dayOffset, seasonYear, stamped } from './_util';

type CompetitionSeed = Omit<Competition, 'createdAt' | 'updatedAt'>;

const competitionSeeds: CompetitionSeed[] = [
  { id: 'cmp-001', name: 'Campeonato Paulista Amador — Série A', season: seasonYear, organizer: 'Federação Paulista de Futebol Amador', team: 'Profissional', status: 'em andamento', format: 'Grupos + mata-mata', notes: 'Principal competição da temporada. Classificação direta para o estadual do ano seguinte.' },
  { id: 'cmp-002', name: 'Copa Javari', season: seasonYear, organizer: 'Liga da Mooca', team: 'Profissional', status: 'em andamento', format: 'Pontos corridos, turno único' },
  { id: 'cmp-003', name: 'Taça Cidade de São Paulo Sub-20', season: seasonYear, organizer: 'Liga Metropolitana', team: 'Sub-20', status: 'em andamento', format: 'Grupos + semifinal' },
  { id: 'cmp-004', name: 'Torneio de Base da Zona Leste', season: seasonYear, organizer: 'Liga Zona Leste', team: 'Sub-17', status: 'planejado', format: 'Eliminatória simples', notes: 'Inscrições confirmadas, tabela ainda não divulgada.' },
  { id: 'cmp-005', name: 'Copa Bandeirantes', season: String(Number(seasonYear) - 1), organizer: 'Liga da Mooca', team: 'Profissional', status: 'encerrado', format: 'Mata-mata', notes: 'Vice-campeão na temporada passada.' },
];

export const competitions = stamped(competitionSeeds) as Competition[];

type MatchSeed = Omit<Match, 'createdAt' | 'updatedAt'>;

const matchSeeds: MatchSeed[] = [
  { id: 'mtc-001', date: dayOffset(-88), time: '15:00', opponent: 'Grêmio da Mooca', location: 'Rua Javari', venue: 'mandante', competitionId: 'cmp-001', team: 'Profissional', status: 'encerrado', goalsFor: 3, goalsAgainst: 1 },
  { id: 'mtc-002', date: dayOffset(-74), time: '10:00', opponent: 'Nacional do Ipiranga', location: 'CT do Ipiranga', venue: 'visitante', competitionId: 'cmp-001', team: 'Profissional', status: 'encerrado', goalsFor: 1, goalsAgainst: 1 },
  { id: 'mtc-003', date: dayOffset(-61), time: '15:00', opponent: 'Atlético Tatuapé', location: 'Rua Javari', venue: 'mandante', competitionId: 'cmp-001', team: 'Profissional', status: 'encerrado', goalsFor: 2, goalsAgainst: 0, notes: 'Dois gols do Guto no segundo tempo.' },
  { id: 'mtc-004', date: dayOffset(-47), time: '16:00', opponent: 'União Vila Formosa', location: 'Campo da Vila Formosa', venue: 'visitante', competitionId: 'cmp-002', team: 'Profissional', status: 'encerrado', goalsFor: 0, goalsAgainst: 2 },
  { id: 'mtc-005', date: dayOffset(-33), time: '15:00', opponent: 'Sport Club Penha', location: 'Rua Javari', venue: 'mandante', competitionId: 'cmp-001', team: 'Profissional', status: 'encerrado', goalsFor: 4, goalsAgainst: 2 },
  { id: 'mtc-006', date: dayOffset(-26), time: '09:30', opponent: 'Portuguesa Santista Sub-20', location: 'CT de Santos', venue: 'visitante', competitionId: 'cmp-003', team: 'Sub-20', status: 'encerrado', goalsFor: 2, goalsAgainst: 2 },
  { id: 'mtc-007', date: dayOffset(-19), time: '15:00', opponent: 'Juventude da Casa Verde', location: 'Rua Javari', venue: 'mandante', competitionId: 'cmp-002', team: 'Profissional', status: 'encerrado', goalsFor: 1, goalsAgainst: 0 },
  { id: 'mtc-008', date: dayOffset(-12), time: '11:00', opponent: 'Comercial da Lapa', location: 'Campo da Lapa', venue: 'visitante', competitionId: 'cmp-001', team: 'Profissional', status: 'encerrado', goalsFor: 2, goalsAgainst: 3, notes: 'Derrota com dois gols sofridos nos minutos finais.' },
  { id: 'mtc-009', date: dayOffset(-5), time: '15:00', opponent: 'Estrela do Belém', location: 'Rua Javari', venue: 'mandante', competitionId: 'cmp-001', team: 'Profissional', status: 'encerrado', goalsFor: 2, goalsAgainst: 1 },
  { id: 'mtc-010', date: dayOffset(2), time: '15:00', opponent: 'Ferroviária do Brás', location: 'Rua Javari', venue: 'mandante', competitionId: 'cmp-001', team: 'Profissional', status: 'confirmado', notes: 'Jogo decisivo pela liderança do grupo.' },
  { id: 'mtc-011', date: dayOffset(4), time: '09:30', opponent: 'São Bernardo Sub-20', location: 'CT São Bernardo', venue: 'visitante', competitionId: 'cmp-003', team: 'Sub-20', status: 'confirmado' },
  { id: 'mtc-012', date: dayOffset(9), time: '16:00', opponent: 'Vila Maria A.C.', location: 'Campo da Vila Maria', venue: 'visitante', competitionId: 'cmp-002', team: 'Profissional', status: 'agendado' },
  { id: 'mtc-013', date: dayOffset(16), time: '15:00', opponent: 'Atlético Tatuapé', location: 'Rua Javari', venue: 'mandante', competitionId: 'cmp-001', team: 'Profissional', status: 'agendado', notes: 'Returno do primeiro turno.' },
  { id: 'mtc-014', date: dayOffset(23), time: '10:00', opponent: 'Guarani do Cambuci', location: 'Campo do Cambuci', venue: 'visitante', competitionId: 'cmp-002', team: 'Profissional', status: 'agendado' },
  { id: 'mtc-015', date: dayOffset(30), time: '09:00', opponent: 'Corinthians da Penha Sub-17', location: 'Rua Javari', venue: 'mandante', competitionId: 'cmp-004', team: 'Sub-17', status: 'agendado' },
  { id: 'mtc-016', date: dayOffset(11), time: '14:00', opponent: 'Independente do Jaguaré', location: 'Campo do Jaguaré', venue: 'visitante', competitionId: 'cmp-002', team: 'Profissional', status: 'adiado', notes: 'Adiado por indisponibilidade do campo. Nova data em definição.' },
];

export const matches = stamped(matchSeeds) as Match[];

type TrainingSeed = Omit<Training, 'createdAt' | 'updatedAt'>;

const trainingSeeds: TrainingSeed[] = [
  { id: 'trn-001', date: dayOffset(-8), time: '19:30', location: 'CT Rua Javari — Campo 1', team: 'Profissional', responsibleId: 'stf-001', type: 'Tático', status: 'realizado' },
  { id: 'trn-002', date: dayOffset(-6), time: '19:30', location: 'CT Rua Javari — Campo 1', team: 'Profissional', responsibleId: 'stf-003', type: 'Físico', status: 'realizado', notes: 'Trabalho de resistência com o grupo completo.' },
  { id: 'trn-003', date: dayOffset(-4), time: '09:00', location: 'CT Rua Javari — Campo 2', team: 'Sub-20', responsibleId: 'stf-005', type: 'Técnico', status: 'realizado' },
  { id: 'trn-004', date: dayOffset(-3), time: '19:30', location: 'CT Rua Javari — Campo 1', team: 'Profissional', responsibleId: 'stf-001', type: 'Coletivo', status: 'realizado' },
  { id: 'trn-005', date: dayOffset(-1), time: '19:30', location: 'CT Rua Javari — Campo 1', team: 'Profissional', responsibleId: 'stf-002', type: 'Técnico', status: 'realizado' },
  { id: 'trn-006', date: dayOffset(0), time: '19:30', location: 'CT Rua Javari — Campo 1', team: 'Profissional', responsibleId: 'stf-001', type: 'Tático', status: 'agendado', notes: 'Preparação para a partida contra a Ferroviária do Brás.' },
  { id: 'trn-007', date: dayOffset(1), time: '19:30', location: 'CT Rua Javari — Campo 1', team: 'Profissional', responsibleId: 'stf-003', type: 'Físico', status: 'agendado' },
  { id: 'trn-008', date: dayOffset(1), time: '09:00', location: 'CT Rua Javari — Campo 2', team: 'Sub-20', responsibleId: 'stf-005', type: 'Coletivo', status: 'agendado' },
  { id: 'trn-009', date: dayOffset(3), time: '19:30', location: 'CT Rua Javari — Campo 1', team: 'Profissional', responsibleId: 'stf-001', type: 'Técnico', status: 'agendado' },
  { id: 'trn-010', date: dayOffset(5), time: '09:00', location: 'Ginásio da Mooca', team: 'Sub-17', responsibleId: 'stf-005', type: 'Recreativo', status: 'agendado' },
  { id: 'trn-011', date: dayOffset(6), time: '19:30', location: 'CT Rua Javari — Campo 1', team: 'Profissional', responsibleId: 'stf-002', type: 'Tático', status: 'agendado' },
  { id: 'trn-012', date: dayOffset(8), time: '19:30', location: 'CT Rua Javari — Campo 1', team: 'Profissional', responsibleId: 'stf-004', type: 'Técnico', status: 'agendado', notes: 'Trabalho específico com os goleiros no primeiro tempo da sessão.' },
  { id: 'trn-013', date: dayOffset(10), time: '09:00', location: 'CT Rua Javari — Campo 2', team: 'Sub-20', responsibleId: 'stf-005', type: 'Físico', status: 'agendado' },
  { id: 'trn-014', date: dayOffset(13), time: '19:30', location: 'CT Rua Javari — Campo 1', team: 'Profissional', responsibleId: 'stf-001', type: 'Coletivo', status: 'agendado' },
  { id: 'trn-015', date: dayOffset(-11), time: '19:30', location: 'CT Rua Javari — Campo 1', team: 'Profissional', responsibleId: 'stf-001', type: 'Coletivo', status: 'cancelado', notes: 'Cancelado por chuva forte.' },
];

export const trainings = stamped(trainingSeeds) as Training[];

type LineupSeed = Omit<Lineup, 'createdAt' | 'updatedAt'>;

const lineupSeeds: LineupSeed[] = [
  {
    id: 'lnp-001',
    matchId: 'mtc-010',
    formation: '4-3-3',
    staffIds: ['stf-001', 'stf-002', 'stf-003'],
    notes: 'Quirino segue no departamento médico; Kuroda assume a lateral direita.',
    entries: [
      { playerId: 'ply-001', slot: 'titular', shirtNumber: 1, position: 'Goleiro' },
      { playerId: 'ply-002', slot: 'titular', shirtNumber: 2, position: 'Lateral Direito' },
      { playerId: 'ply-003', slot: 'titular', shirtNumber: 3, position: 'Zagueiro' },
      { playerId: 'ply-004', slot: 'titular', shirtNumber: 4, position: 'Zagueiro' },
      { playerId: 'ply-011', slot: 'titular', shirtNumber: 11, position: 'Lateral Esquerdo' },
      { playerId: 'ply-006', slot: 'titular', shirtNumber: 5, position: 'Volante' },
      { playerId: 'ply-007', slot: 'titular', shirtNumber: 8, position: 'Meia' },
      { playerId: 'ply-008', slot: 'titular', shirtNumber: 10, position: 'Meia' },
      { playerId: 'ply-009', slot: 'titular', shirtNumber: 7, position: 'Ponta' },
      { playerId: 'ply-010', slot: 'titular', shirtNumber: 9, position: 'Atacante' },
      { playerId: 'ply-013', slot: 'titular', shirtNumber: 16, position: 'Ponta' },
      { playerId: 'ply-014', slot: 'reserva', shirtNumber: 12, position: 'Goleiro' },
      { playerId: 'ply-015', slot: 'reserva', shirtNumber: 15, position: 'Zagueiro' },
      { playerId: 'ply-016', slot: 'reserva', shirtNumber: 18, position: 'Meia' },
      { playerId: 'ply-017', slot: 'reserva', shirtNumber: 19, position: 'Atacante' },
      { playerId: 'ply-018', slot: 'reserva', shirtNumber: 21, position: 'Ponta' },
    ],
  },
  {
    id: 'lnp-002',
    matchId: 'mtc-009',
    formation: '4-4-2',
    staffIds: ['stf-001', 'stf-002'],
    notes: 'Escalação usada na vitória por 2 a 1 sobre o Estrela do Belém.',
    entries: [
      { playerId: 'ply-001', slot: 'titular', shirtNumber: 1, position: 'Goleiro' },
      { playerId: 'ply-002', slot: 'titular', shirtNumber: 2, position: 'Lateral Direito' },
      { playerId: 'ply-003', slot: 'titular', shirtNumber: 3, position: 'Zagueiro' },
      { playerId: 'ply-004', slot: 'titular', shirtNumber: 4, position: 'Zagueiro' },
      { playerId: 'ply-011', slot: 'titular', shirtNumber: 11, position: 'Lateral Esquerdo' },
      { playerId: 'ply-006', slot: 'titular', shirtNumber: 5, position: 'Volante' },
      { playerId: 'ply-012', slot: 'titular', shirtNumber: 14, position: 'Volante' },
      { playerId: 'ply-007', slot: 'titular', shirtNumber: 8, position: 'Meia' },
      { playerId: 'ply-009', slot: 'titular', shirtNumber: 7, position: 'Ponta' },
      { playerId: 'ply-010', slot: 'titular', shirtNumber: 9, position: 'Atacante' },
      { playerId: 'ply-008', slot: 'titular', shirtNumber: 10, position: 'Atacante' },
      { playerId: 'ply-014', slot: 'reserva', shirtNumber: 12, position: 'Goleiro' },
      { playerId: 'ply-013', slot: 'reserva', shirtNumber: 16, position: 'Meia' },
      { playerId: 'ply-016', slot: 'reserva', shirtNumber: 18, position: 'Meia' },
    ],
  },
  {
    id: 'lnp-003',
    matchId: 'mtc-011',
    formation: '4-2-3-1',
    staffIds: ['stf-005', 'stf-003'],
    entries: [
      { playerId: 'ply-014', slot: 'titular', shirtNumber: 12, position: 'Goleiro' },
      { playerId: 'ply-019', slot: 'titular', shirtNumber: 23, position: 'Lateral Direito' },
      { playerId: 'ply-015', slot: 'titular', shirtNumber: 15, position: 'Zagueiro' },
      { playerId: 'ply-016', slot: 'titular', shirtNumber: 18, position: 'Volante' },
      { playerId: 'ply-017', slot: 'titular', shirtNumber: 19, position: 'Atacante' },
      { playerId: 'ply-018', slot: 'titular', shirtNumber: 21, position: 'Ponta' },
      { playerId: 'ply-013', slot: 'reserva', shirtNumber: 16, position: 'Meia' },
    ],
  },
];

export const lineups = stamped(lineupSeeds) as Lineup[];
