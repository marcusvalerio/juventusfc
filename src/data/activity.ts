import type { ActivityRecord } from '@/types/domain';
import { hourOffset } from './_util';

/** Recent operational trail shown on the dashboard. */
export const activityRecords: ActivityRecord[] = [
  { id: 'act-001', kind: 'financeiro', title: 'Mensalidade registrada', detail: 'Diego Marchetti — R$ 200,00 via Pix', at: hourOffset(2), actor: 'Beatriz Rangel' },
  { id: 'act-002', kind: 'futebol', title: 'Escalação publicada', detail: 'Ferroviária do Brás — 4-3-3 confirmado', at: hourOffset(5), actor: 'Rogério Tavares' },
  { id: 'act-003', kind: 'estoque', title: 'Saída de material', detail: '13 pares de meião para o jogo em casa', at: hourOffset(9), actor: 'Jorge Antunes' },
  { id: 'act-004', kind: 'elenco', title: 'Status atualizado', detail: 'Fernando Quirino marcado como lesionado', at: hourOffset(26), actor: 'Marina Duarte' },
  { id: 'act-005', kind: 'financeiro', title: 'Saída lançada', detail: 'Arbitragem da rodada — R$ 520,00', at: hourOffset(30), actor: 'Beatriz Rangel' },
  { id: 'act-006', kind: 'futebol', title: 'Treino agendado', detail: 'Coletivo do profissional, quinta às 19:30', at: hourOffset(48), actor: 'Wesley Fontenele' },
  { id: 'act-007', kind: 'elenco', title: 'Cadastro criado', detail: 'Ruan Diniz vinculado ao Sub-17', at: hourOffset(72), actor: 'Renata Colombo' },
  { id: 'act-008', kind: 'financeiro', title: 'Patrocínio recebido', detail: 'Grimaldi Materiais — parcela 9/12', at: hourOffset(96), actor: 'Marcelo Grimaldi' },
  { id: 'act-009', kind: 'sistema', title: 'Relatório gerado', detail: 'Fluxo de caixa do mês anterior', at: hourOffset(120), actor: 'Cláudia Perretti' },
  { id: 'act-010', kind: 'futebol', title: 'Partida adiada', detail: 'Independente do Jaguaré — campo indisponível', at: hourOffset(150), actor: 'Henrique Salgado' },
];
