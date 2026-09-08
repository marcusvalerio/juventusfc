import type { InventoryItem, InventoryMovement } from '@/types/domain';
import { dayOffset, stamped } from './_util';

type ItemSeed = Omit<InventoryItem, 'createdAt' | 'updatedAt' | 'status'>;

const itemSeeds: ItemSeed[] = [
  { id: 'inv-001', name: 'Camisa oficial I — listrada', category: 'Uniformes', quantity: 26, unit: 'un', minQuantity: 20, location: 'Almoxarifado — Prateleira A1', notes: 'Numeração de 1 a 30, faltam as camisas 5 e 17.' },
  { id: 'inv-002', name: 'Camisa oficial II — dourada', category: 'Uniformes', quantity: 18, unit: 'un', minQuantity: 20, location: 'Almoxarifado — Prateleira A2' },
  { id: 'inv-003', name: 'Calção preto', category: 'Uniformes', quantity: 34, unit: 'un', minQuantity: 24, location: 'Almoxarifado — Prateleira A3' },
  { id: 'inv-004', name: 'Meião preto e dourado', category: 'Uniformes', quantity: 11, unit: 'par', minQuantity: 24, location: 'Almoxarifado — Gaveta B1', notes: 'Reposição solicitada ao fornecedor.' },
  { id: 'inv-005', name: 'Uniforme de goleiro', category: 'Uniformes', quantity: 4, unit: 'un', minQuantity: 3, location: 'Almoxarifado — Prateleira A2' },
  { id: 'inv-006', name: 'Bola de campo oficial', category: 'Bolas', quantity: 14, unit: 'un', minQuantity: 10, location: 'Depósito do vestiário' },
  { id: 'inv-007', name: 'Bola de treino', category: 'Bolas', quantity: 8, unit: 'un', minQuantity: 12, location: 'Depósito do vestiário' },
  { id: 'inv-008', name: 'Colete de treino', category: 'Treino', quantity: 22, unit: 'un', minQuantity: 20, location: 'Depósito do vestiário' },
  { id: 'inv-009', name: 'Cone de marcação', category: 'Treino', quantity: 40, unit: 'un', minQuantity: 30, location: 'Depósito do vestiário' },
  { id: 'inv-010', name: 'Escada de agilidade', category: 'Treino', quantity: 3, unit: 'un', minQuantity: 2, location: 'Sala da preparação física' },
  { id: 'inv-011', name: 'Barreira de salto', category: 'Treino', quantity: 0, unit: 'un', minQuantity: 6, location: 'Sala da preparação física', notes: 'Emprestadas ao Sub-17 e não devolvidas.' },
  { id: 'inv-012', name: 'Luva de goleiro', category: 'Equipamentos', quantity: 6, unit: 'par', minQuantity: 4, location: 'Almoxarifado — Gaveta B2' },
  { id: 'inv-013', name: 'Rede de gol', category: 'Equipamentos', quantity: 2, unit: 'un', minQuantity: 2, location: 'Campo 1 — depósito lateral' },
  { id: 'inv-014', name: 'Bomba de ar', category: 'Equipamentos', quantity: 2, unit: 'un', minQuantity: 1, location: 'Depósito do vestiário' },
  { id: 'inv-015', name: 'Kit de primeiros socorros', category: 'Saúde', quantity: 1, unit: 'cx', minQuantity: 2, location: 'Vestiário principal', notes: 'Repor gelo instantâneo e ataduras.' },
  { id: 'inv-016', name: 'Gelo instantâneo', category: 'Saúde', quantity: 9, unit: 'un', minQuantity: 8, location: 'Vestiário principal' },
  { id: 'inv-017', name: 'Garrafa térmica de água', category: 'Outros', quantity: 5, unit: 'un', minQuantity: 4, location: 'Depósito do vestiário' },
];

const withStatus = itemSeeds.map((item) => ({
  ...item,
  status: (item.quantity === 0 ? 'esgotado' : item.quantity < item.minQuantity ? 'baixo' : 'disponivel') as InventoryItem['status'],
}));

export const inventoryItems = stamped(withStatus) as InventoryItem[];

type MovementSeed = Omit<InventoryMovement, 'createdAt' | 'updatedAt'>;

const movementSeeds: MovementSeed[] = [
  { id: 'mov-001', itemId: 'inv-001', type: 'saida', quantity: 4, date: dayOffset(-1), responsible: 'Renata Colombo', reason: 'Entrega ao elenco', notes: 'Camisas para os reforços do returno.' },
  { id: 'mov-002', itemId: 'inv-004', type: 'saida', quantity: 13, date: dayOffset(-3), responsible: 'Jorge Antunes', reason: 'Jogo contra o Estrela do Belém' },
  { id: 'mov-003', itemId: 'inv-007', type: 'saida', quantity: 4, date: dayOffset(-5), responsible: 'Wesley Fontenele', reason: 'Bolas danificadas no treino' },
  { id: 'mov-004', itemId: 'inv-006', type: 'entrada', quantity: 6, date: dayOffset(-8), responsible: 'Cláudia Perretti', reason: 'Compra — Esportes Marchetti' },
  { id: 'mov-005', itemId: 'inv-011', type: 'saida', quantity: 6, date: dayOffset(-11), responsible: 'Danilo Aoki', reason: 'Empréstimo ao Sub-17' },
  { id: 'mov-006', itemId: 'inv-015', type: 'saida', quantity: 1, date: dayOffset(-14), responsible: 'Marina Duarte', reason: 'Atendimento em jogo' },
  { id: 'mov-007', itemId: 'inv-002', type: 'entrada', quantity: 18, date: dayOffset(-19), responsible: 'Cláudia Perretti', reason: 'Compra — jogo de camisas modelo II' },
  { id: 'mov-008', itemId: 'inv-009', type: 'ajuste', quantity: -5, date: dayOffset(-23), responsible: 'Jorge Antunes', reason: 'Inventário trimestral', notes: 'Cones quebrados descartados.' },
  { id: 'mov-009', itemId: 'inv-008', type: 'entrada', quantity: 10, date: dayOffset(-28), responsible: 'Wesley Fontenele', reason: 'Compra — Sport Zona Leste' },
  { id: 'mov-010', itemId: 'inv-012', type: 'entrada', quantity: 2, date: dayOffset(-34), responsible: 'Paulo Sérgio Vasques', reason: 'Reposição de luvas' },
  { id: 'mov-011', itemId: 'inv-003', type: 'saida', quantity: 8, date: dayOffset(-39), responsible: 'Renata Colombo', reason: 'Entrega ao Sub-20' },
  { id: 'mov-012', itemId: 'inv-016', type: 'entrada', quantity: 12, date: dayOffset(-45), responsible: 'Marina Duarte', reason: 'Compra — farmácia parceira' },
];

export const inventoryMovements = stamped(movementSeeds) as InventoryMovement[];
