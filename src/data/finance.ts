import type { ExpenseEntry, IncomeEntry, MonthlyDue, PaymentMethod } from '@/types/domain';
import { TODAY, parseDate, toISODate } from '@/lib/dates';
import { dayOffset, monthOffset, stamped } from './_util';
import { players } from './squad';

/* -------------------------------------------------------------- mensalidades */

/** Deterministic 0..1 — keeps the demo identical on every reload. */
const hash = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
};

const METHODS: PaymentMethod[] = ['Pix', 'Pix', 'Pix', 'Transferência', 'Dinheiro', 'Cartão'];

/**
 * Six months of dues for every player under contract. Older months settle almost
 * completely; the current month still carries the open balance the club chases.
 */
function buildDues(): MonthlyDue[] {
  const out: MonthlyDue[] = [];
  const billable = players.filter((p) => p.status !== 'inativo');

  for (let back = 5; back >= 0; back -= 1) {
    const ref = monthOffset(-back);
    const [year, month] = ref.split('-').map(Number);

    for (const player of billable) {
      const day = Math.min(player.dueDay, 28);
      const dueDate = toISODate(new Date(year, month - 1, day));
      const roll = hash(`${player.id}-${ref}`);
      const isCurrent = back === 0;
      const overdue = parseDate(dueDate).getTime() < TODAY.getTime();

      let status: MonthlyDue['status'] = 'pago';
      if (isCurrent) {
        if (roll > 0.72) status = overdue ? 'atrasado' : 'pendente';
        else if (roll > 0.62) status = 'parcial';
      } else if (back === 1 && roll > 0.88) {
        status = 'atrasado';
      } else if (back === 2 && roll > 0.94) {
        status = 'parcial';
      }
      if (player.status === 'afastado' && back < 2) status = 'pendente';

      const expected = player.monthlyFee;
      const paid =
        status === 'pago' ? expected : status === 'parcial' ? Math.round(expected * 0.5) : 0;
      const paidAt =
        paid > 0
          ? toISODate(new Date(year, month - 1, Math.min(day + Math.round(roll * 6) - 2, 28)))
          : undefined;

      out.push({
        id: `due-${player.id.slice(4)}-${ref}`,
        createdAt: `${ref}-01T09:00:00.000Z`,
        updatedAt: `${ref}-01T09:00:00.000Z`,
        playerId: player.id,
        referenceMonth: ref,
        dueDate,
        expectedAmount: expected,
        paidAmount: paid,
        paidAt,
        method: paid > 0 ? METHODS[Math.floor(roll * METHODS.length)] : undefined,
        status,
        notes:
          status === 'parcial'
            ? 'Pagamento parcial acordado com a diretoria financeira.'
            : status === 'atrasado'
              ? 'Cobrança enviada por mensagem.'
              : undefined,
      });
    }
  }
  return out;
}

export const monthlyDues = buildDues();

/* ------------------------------------------------------------------ entradas */

type IncomeSeed = Omit<IncomeEntry, 'createdAt' | 'updatedAt'>;

const incomeSeeds: IncomeSeed[] = [
  { id: 'inc-001', date: dayOffset(-2), description: 'Mensalidades — repasse do mês', category: 'Mensalidades', source: 'Elenco profissional', amount: 2340, method: 'Pix', responsible: 'Beatriz Rangel' },
  { id: 'inc-002', date: dayOffset(-5), description: 'Bilheteria — Estrela do Belém', category: 'Bilheteria', source: 'Portaria Rua Javari', amount: 1180, method: 'Dinheiro', responsible: 'Cláudia Perretti', notes: 'Público estimado de 310 pessoas.' },
  { id: 'inc-003', date: dayOffset(-9), description: 'Patrocínio Grimaldi Materiais — parcela 9/12', category: 'Patrocínio', source: 'Grimaldi Materiais de Construção', amount: 3500, method: 'Transferência', responsible: 'Marcelo Grimaldi' },
  { id: 'inc-004', date: dayOffset(-14), description: 'Feijoada beneficente da torcida', category: 'Eventos', source: 'Sede social', amount: 2760, method: 'Pix', responsible: 'Sônia Verdi', notes: 'Arrecadação líquida após custos de cozinha.' },
  { id: 'inc-005', date: dayOffset(-18), description: 'Venda de camisas oficiais', category: 'Outros', source: 'Loja do clube', amount: 940, method: 'Cartão', responsible: 'Renata Colombo' },
  { id: 'inc-006', date: dayOffset(-22), description: 'Mensalidades — categorias de base', category: 'Mensalidades', source: 'Sub-20 e Sub-17', amount: 1120, method: 'Pix', responsible: 'Beatriz Rangel' },
  { id: 'inc-007', date: dayOffset(-27), description: 'Doação de sócio-benemérito', category: 'Doações', source: 'Sônia Verdi', amount: 1500, method: 'Transferência', responsible: 'Aurélio Mancini' },
  { id: 'inc-008', date: dayOffset(-33), description: 'Bilheteria — Sport Club Penha', category: 'Bilheteria', source: 'Portaria Rua Javari', amount: 1420, method: 'Dinheiro', responsible: 'Cláudia Perretti' },
  { id: 'inc-009', date: dayOffset(-38), description: 'Patrocínio Grimaldi Materiais — parcela 8/12', category: 'Patrocínio', source: 'Grimaldi Materiais de Construção', amount: 3500, method: 'Transferência', responsible: 'Marcelo Grimaldi' },
  { id: 'inc-010', date: dayOffset(-41), description: 'Aluguel do campo para liga amadora', category: 'Outros', source: 'Liga da Mooca', amount: 800, method: 'Pix', responsible: 'Jorge Antunes' },
  { id: 'inc-011', date: dayOffset(-46), description: 'Mensalidades — repasse do mês', category: 'Mensalidades', source: 'Elenco profissional', amount: 2520, method: 'Pix', responsible: 'Beatriz Rangel' },
  { id: 'inc-012', date: dayOffset(-53), description: 'Rifa do uniforme autografado', category: 'Eventos', source: 'Torcida organizada', amount: 640, method: 'Dinheiro', responsible: 'Renata Colombo' },
  { id: 'inc-013', date: dayOffset(-61), description: 'Apoio da Prefeitura — programa de base', category: 'Doações', source: 'Secretaria de Esportes', amount: 2200, method: 'Transferência', responsible: 'Aurélio Mancini', notes: 'Verba destinada exclusivamente às categorias de base.' },
  { id: 'inc-014', date: dayOffset(-68), description: 'Patrocínio Grimaldi Materiais — parcela 7/12', category: 'Patrocínio', source: 'Grimaldi Materiais de Construção', amount: 3500, method: 'Transferência', responsible: 'Marcelo Grimaldi' },
  { id: 'inc-015', date: dayOffset(-75), description: 'Mensalidades — repasse do mês', category: 'Mensalidades', source: 'Elenco profissional', amount: 2400, method: 'Pix', responsible: 'Beatriz Rangel' },
  { id: 'inc-016', date: dayOffset(-84), description: 'Churrasco de confraternização', category: 'Eventos', source: 'Sede social', amount: 1860, method: 'Pix', responsible: 'Sônia Verdi' },
  { id: 'inc-017', date: dayOffset(-92), description: 'Patrocínio Grimaldi Materiais — parcela 6/12', category: 'Patrocínio', source: 'Grimaldi Materiais de Construção', amount: 3500, method: 'Transferência', responsible: 'Marcelo Grimaldi' },
  { id: 'inc-018', date: dayOffset(-97), description: 'Mensalidades — repasse do mês', category: 'Mensalidades', source: 'Elenco profissional', amount: 2280, method: 'Pix', responsible: 'Beatriz Rangel' },
  { id: 'inc-019', date: dayOffset(-104), description: 'Bilheteria — Grêmio da Mooca', category: 'Bilheteria', source: 'Portaria Rua Javari', amount: 1260, method: 'Dinheiro', responsible: 'Cláudia Perretti' },
  { id: 'inc-020', date: dayOffset(-112), description: 'Torneio beneficente de futebol society', category: 'Eventos', source: 'Campo da Mooca', amount: 1980, method: 'Pix', responsible: 'Sônia Verdi' },
  { id: 'inc-021', date: dayOffset(-121), description: 'Patrocínio Grimaldi Materiais — parcela 5/12', category: 'Patrocínio', source: 'Grimaldi Materiais de Construção', amount: 3500, method: 'Transferência', responsible: 'Marcelo Grimaldi' },
  { id: 'inc-022', date: dayOffset(-128), description: 'Mensalidades — categorias de base', category: 'Mensalidades', source: 'Sub-20 e Sub-17', amount: 1060, method: 'Pix', responsible: 'Beatriz Rangel' },
  { id: 'inc-023', date: dayOffset(-136), description: 'Venda de meiões e agasalhos', category: 'Outros', source: 'Loja do clube', amount: 720, method: 'Cartão', responsible: 'Renata Colombo' },
  { id: 'inc-024', date: dayOffset(-149), description: 'Doação de sócio-torcedor', category: 'Doações', source: 'Campanha do centenário', amount: 1350, method: 'Pix', responsible: 'Aurélio Mancini' },
  { id: 'inc-025', date: dayOffset(-155), description: 'Mensalidades — repasse do mês', category: 'Mensalidades', source: 'Elenco profissional', amount: 2460, method: 'Pix', responsible: 'Beatriz Rangel' },
];

export const incomeEntries = stamped(incomeSeeds) as IncomeEntry[];

/* -------------------------------------------------------------------- saídas */

type ExpenseSeed = Omit<ExpenseEntry, 'createdAt' | 'updatedAt'>;

const expenseSeeds: ExpenseSeed[] = [
  { id: 'exp-001', date: dayOffset(-1), description: 'Arbitragem — rodada do Paulista Amador', category: 'Arbitragem', supplier: 'Sindicato dos Árbitros', amount: 520, method: 'Pix', responsible: 'Beatriz Rangel' },
  { id: 'exp-002', date: dayOffset(-4), description: 'Lavanderia dos uniformes', category: 'Estrutura', supplier: 'Lavanderia Bom Retiro', amount: 380, method: 'Pix', responsible: 'Renata Colombo' },
  { id: 'exp-003', date: dayOffset(-7), description: 'Van para jogo em Santos', category: 'Transporte', supplier: 'Transportes Aliança', amount: 1250, method: 'Transferência', responsible: 'Henrique Salgado', notes: 'Deslocamento do Sub-20 para a Portuguesa Santista.' },
  { id: 'exp-004', date: dayOffset(-10), description: 'Jogo de camisas — modelo I', category: 'Material Esportivo', supplier: 'Esportes Marchetti', amount: 2180, method: 'Boleto', responsible: 'Cláudia Perretti' },
  { id: 'exp-005', date: dayOffset(-13), description: 'Manutenção do gramado', category: 'Estrutura', supplier: 'Jardinagem Vila Prudente', amount: 900, method: 'Pix', responsible: 'Jorge Antunes' },
  { id: 'exp-006', date: dayOffset(-16), description: 'Lanche pós-jogo do elenco', category: 'Alimentação', supplier: 'Padaria Real da Mooca', amount: 340, method: 'Dinheiro', responsible: 'Renata Colombo' },
  { id: 'exp-007', date: dayOffset(-20), description: 'Inscrição na Copa Javari', category: 'Inscrições', supplier: 'Liga da Mooca', amount: 1400, method: 'Transferência', responsible: 'Aurélio Mancini' },
  { id: 'exp-008', date: dayOffset(-24), description: 'Fisioterapia — Fernando Quirino', category: 'Saúde', supplier: 'Clínica Movimento', amount: 680, method: 'Pix', responsible: 'Marina Duarte', notes: 'Cinco sessões do protocolo de recuperação muscular.' },
  { id: 'exp-009', date: dayOffset(-28), description: 'Bolas de treino (10 un.)', category: 'Material Esportivo', supplier: 'Esportes Marchetti', amount: 1150, method: 'Cartão', responsible: 'Rogério Tavares' },
  { id: 'exp-010', date: dayOffset(-31), description: 'Arbitragem — Copa Javari', category: 'Arbitragem', supplier: 'Sindicato dos Árbitros', amount: 480, method: 'Pix', responsible: 'Beatriz Rangel' },
  { id: 'exp-011', date: dayOffset(-36), description: 'Energia elétrica do CT', category: 'Estrutura', supplier: 'Concessionária de Energia', amount: 1120, method: 'Boleto', responsible: 'Cláudia Perretti' },
  { id: 'exp-012', date: dayOffset(-42), description: 'Van para jogo na Lapa', category: 'Transporte', supplier: 'Transportes Aliança', amount: 760, method: 'Pix', responsible: 'Henrique Salgado' },
  { id: 'exp-013', date: dayOffset(-49), description: 'Coletes e cones de treino', category: 'Material Esportivo', supplier: 'Sport Zona Leste', amount: 540, method: 'Pix', responsible: 'Wesley Fontenele' },
  { id: 'exp-014', date: dayOffset(-55), description: 'Exames médicos do elenco', category: 'Saúde', supplier: 'Laboratório São Judas', amount: 1980, method: 'Boleto', responsible: 'Marina Duarte' },
  { id: 'exp-015', date: dayOffset(-63), description: 'Água e materiais de vestiário', category: 'Estrutura', supplier: 'Distribuidora Javari', amount: 420, method: 'Dinheiro', responsible: 'Jorge Antunes' },
  { id: 'exp-016', date: dayOffset(-70), description: 'Inscrição na Taça Sub-20', category: 'Inscrições', supplier: 'Liga Metropolitana', amount: 950, method: 'Transferência', responsible: 'Henrique Salgado' },
  { id: 'exp-017', date: dayOffset(-78), description: 'Meiões e calções de reposição', category: 'Material Esportivo', supplier: 'Sport Zona Leste', amount: 870, method: 'Cartão', responsible: 'Cláudia Perretti' },
  { id: 'exp-018', date: dayOffset(-86), description: 'Alimentação da comissão em viagem', category: 'Alimentação', supplier: 'Restaurante do Porto', amount: 460, method: 'Dinheiro', responsible: 'Rogério Tavares' },
  { id: 'exp-019', date: dayOffset(-93), description: 'Arbitragem — rodada dupla', category: 'Arbitragem', supplier: 'Sindicato dos Árbitros', amount: 960, method: 'Pix', responsible: 'Beatriz Rangel' },
  { id: 'exp-020', date: dayOffset(-99), description: 'Reforma dos vestiários', category: 'Estrutura', supplier: 'Construtora Bandeira', amount: 3200, method: 'Boleto', responsible: 'Ivan Bertolucci', notes: 'Troca do piso e revisão hidráulica.' },
  { id: 'exp-021', date: dayOffset(-108), description: 'Van para jogo em Guarulhos', category: 'Transporte', supplier: 'Transportes Aliança', amount: 690, method: 'Pix', responsible: 'Henrique Salgado' },
  { id: 'exp-022', date: dayOffset(-116), description: 'Uniformes de treino do Sub-20', category: 'Material Esportivo', supplier: 'Sport Zona Leste', amount: 1480, method: 'Cartão', responsible: 'Cláudia Perretti' },
  { id: 'exp-023', date: dayOffset(-124), description: 'Energia elétrica do CT', category: 'Estrutura', supplier: 'Concessionária de Energia', amount: 1080, method: 'Boleto', responsible: 'Cláudia Perretti' },
  { id: 'exp-024', date: dayOffset(-133), description: 'Inscrição no Paulista Amador', category: 'Inscrições', supplier: 'Federação Paulista de Futebol Amador', amount: 2100, method: 'Transferência', responsible: 'Aurélio Mancini' },
  { id: 'exp-025', date: dayOffset(-142), description: 'Marmitas do elenco em viagem', category: 'Alimentação', supplier: 'Cozinha da Vila', amount: 520, method: 'Dinheiro', responsible: 'Renata Colombo' },
  { id: 'exp-026', date: dayOffset(-151), description: 'Fisioterapia do elenco', category: 'Saúde', supplier: 'Clínica Movimento', amount: 840, method: 'Pix', responsible: 'Marina Duarte' },
];

export const expenseEntries = stamped(expenseSeeds) as ExpenseEntry[];

/** Opening balance carried from the previous season closing. */
export const openingBalance = 8450;
