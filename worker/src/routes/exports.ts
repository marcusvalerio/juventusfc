import { Hono, type Context } from 'hono';
import type { AppBindings } from '../lib/env';
import { notFound } from '../lib/errors';
import { requirePermission } from '../lib/middleware';
import { brDate, buildWorkbook, type Sheet } from '../lib/xlsx';
import { buildCashFlow } from './finance';

const exports_ = new Hono<AppBindings>();

async function query<T = Record<string, unknown>>(
  c: Context<AppBindings>,
  sql: string,
  ...params: unknown[]
): Promise<T[]> {
  const result = await c.env.DB.prepare(sql).bind(...params).all<T>();
  return result.results;
}

const STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo', inativo: 'Inativo', lesionado: 'Lesionado', suspenso: 'Suspenso',
  afastado: 'Afastado', encerrado: 'Encerrado', pago: 'Pago', pendente: 'Pendente',
  parcial: 'Parcial', atrasado: 'Atrasado', agendado: 'Agendado', confirmado: 'Confirmado',
  realizado: 'Realizado', cancelado: 'Cancelado', adiado: 'Adiado', planejado: 'Planejado',
  'em andamento': 'Em andamento', disponivel: 'Disponível', baixo: 'Baixo', esgotado: 'Esgotado',
  mandante: 'Mandante', visitante: 'Visitante', entrada: 'Entrada', saida: 'Saída', ajuste: 'Ajuste',
};

const label = (value: unknown) => STATUS_LABELS[String(value ?? '')] ?? String(value ?? '');

/** Builds each workbook from live rows; nothing is cached or pre-rendered. */
async function buildSheets(c: Context<AppBindings>, kind: string): Promise<Sheet[]> {
  const clubId = c.get('clubId');

  switch (kind) {
    case 'jogadores': {
      const rows = await query(
        c,
        `SELECT pl.*, p.full_name, p.nickname, p.birth_date, p.phone, t.name AS team_name
           FROM players pl JOIN people p ON p.id = pl.person_id
           LEFT JOIN teams t ON t.id = pl.team_id
          WHERE pl.club_id = ? ORDER BY pl.shirt_number, p.full_name`,
        clubId,
      );
      return [
        {
          name: 'Jogadores',
          columns: [
            { header: 'Camisa', key: 'shirt', type: 'number', width: 10 },
            { header: 'Nome', key: 'name', width: 28 },
            { header: 'Apelido', key: 'nickname', width: 18 },
            { header: 'Posição', key: 'position', width: 18 },
            { header: 'Posição secundária', key: 'secondary', width: 20 },
            { header: 'Equipe', key: 'team', width: 16 },
            { header: 'Nascimento', key: 'birth', width: 14 },
            { header: 'Telefone', key: 'phone', width: 18 },
            { header: 'Entrada', key: 'joined', width: 14 },
            { header: 'Mensalidade', key: 'fee', type: 'money', width: 16 },
            { header: 'Vencimento', key: 'dueDay', type: 'number', width: 12 },
            { header: 'Situação', key: 'status', width: 14 },
            { header: 'Observações', key: 'notes', width: 40 },
          ],
          rows: rows.map((row: any) => ({
            shirt: row.shirt_number, name: row.full_name, nickname: row.nickname,
            position: row.position, secondary: row.secondary_position, team: row.team_name,
            birth: brDate(row.birth_date), phone: row.phone, joined: brDate(row.joined_at),
            fee: row.monthly_fee, dueDay: row.due_day, status: label(row.status), notes: row.notes,
          })),
        },
      ];
    }

    case 'pessoas': {
      const rows = await query(
        c,
        `SELECT p.*,
                EXISTS (SELECT 1 FROM players x WHERE x.person_id = p.id) AS is_player,
                EXISTS (SELECT 1 FROM board_members x WHERE x.person_id = p.id) AS is_board,
                EXISTS (SELECT 1 FROM staff_members x WHERE x.person_id = p.id) AS is_staff
           FROM people p WHERE p.club_id = ? ORDER BY p.full_name`,
        clubId,
      );
      return [
        {
          name: 'Pessoas',
          columns: [
            { header: 'Nome completo', key: 'name', width: 30 },
            { header: 'Apelido', key: 'nickname', width: 18 },
            { header: 'Vínculos', key: 'roles', width: 28 },
            { header: 'Nascimento', key: 'birth', width: 14 },
            { header: 'Telefone', key: 'phone', width: 18 },
            { header: 'E-mail', key: 'email', width: 28 },
            { header: 'Documento', key: 'document', width: 18 },
            { header: 'Cidade', key: 'city', width: 20 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Observações', key: 'notes', width: 40 },
          ],
          rows: rows.map((row: any) => ({
            name: row.full_name, nickname: row.nickname,
            roles: [row.is_player && 'Jogador', row.is_board && 'Diretoria', row.is_staff && 'Comissão']
              .filter(Boolean).join(', '),
            birth: brDate(row.birth_date), phone: row.phone, email: row.email,
            document: row.document, city: row.city, status: label(row.status), notes: row.notes,
          })),
        },
      ];
    }

    case 'mensalidades': {
      const rows = await query(
        c,
        `SELECT d.*, p.full_name FROM monthly_dues d
           JOIN people p ON p.id = d.person_id
          WHERE d.club_id = ? ORDER BY d.reference_month DESC, p.full_name`,
        clubId,
      );
      return [
        {
          name: 'Mensalidades',
          columns: [
            { header: 'Pessoa', key: 'person', width: 28 },
            { header: 'Referência', key: 'ref', width: 14 },
            { header: 'Vencimento', key: 'due', width: 14 },
            { header: 'Previsto', key: 'expected', type: 'money', width: 14 },
            { header: 'Pago', key: 'paid', type: 'money', width: 14 },
            { header: 'Data do pagamento', key: 'paidAt', width: 18 },
            { header: 'Forma', key: 'method', width: 16 },
            { header: 'Status', key: 'status', width: 14 },
            { header: 'Observações', key: 'notes', width: 40 },
          ],
          rows: rows.map((row: any) => ({
            person: row.full_name, ref: row.reference_month, due: brDate(row.due_date),
            expected: row.expected_amount, paid: row.paid_amount, paidAt: brDate(row.paid_at),
            method: row.method, status: label(row.status), notes: row.notes,
          })),
        },
      ];
    }

    case 'financeiro': {
      const [income, expenses, dues, cashFlow] = await Promise.all([
        query(c, 'SELECT * FROM income_entries WHERE club_id = ? ORDER BY entry_date DESC', clubId),
        query(c, 'SELECT * FROM expense_entries WHERE club_id = ? ORDER BY entry_date DESC', clubId),
        query(
          c,
          `SELECT d.*, p.full_name FROM monthly_dues d
             JOIN people p ON p.id = d.person_id
            WHERE d.club_id = ? ORDER BY d.reference_month DESC`,
          clubId,
        ),
        buildCashFlow(c.env.DB, clubId, 12),
      ]);

      const totalIncome = income.reduce((sum: number, row: any) => sum + Number(row.amount), 0);
      const totalExpense = expenses.reduce((sum: number, row: any) => sum + Number(row.amount), 0);

      return [
        {
          name: 'Resumo',
          columns: [
            { header: 'Indicador', key: 'label', width: 32 },
            { header: 'Valor', key: 'value', type: 'money', width: 18 },
          ],
          rows: [
            { label: 'Total de entradas', value: totalIncome },
            { label: 'Total de saídas', value: totalExpense },
            { label: 'Saldo', value: totalIncome - totalExpense },
            { label: 'Mensalidades previstas', value: dues.reduce((s: number, r: any) => s + Number(r.expected_amount), 0) },
            { label: 'Mensalidades recebidas', value: dues.reduce((s: number, r: any) => s + Number(r.paid_amount), 0) },
          ],
        },
        {
          name: 'Entradas',
          columns: [
            { header: 'Data', key: 'date', width: 14 },
            { header: 'Descrição', key: 'description', width: 36 },
            { header: 'Categoria', key: 'category', width: 20 },
            { header: 'Origem', key: 'source', width: 24 },
            { header: 'Valor', key: 'amount', type: 'money', width: 16 },
            { header: 'Forma', key: 'method', width: 16 },
            { header: 'Responsável', key: 'responsible', width: 22 },
            { header: 'Observações', key: 'notes', width: 36 },
          ],
          rows: income.map((row: any) => ({
            date: brDate(row.entry_date), description: row.description, category: row.category,
            source: row.source, amount: row.amount, method: row.method,
            responsible: row.responsible, notes: row.notes,
          })),
        },
        {
          name: 'Saídas',
          columns: [
            { header: 'Data', key: 'date', width: 14 },
            { header: 'Descrição', key: 'description', width: 36 },
            { header: 'Categoria', key: 'category', width: 20 },
            { header: 'Fornecedor', key: 'supplier', width: 24 },
            { header: 'Valor', key: 'amount', type: 'money', width: 16 },
            { header: 'Forma', key: 'method', width: 16 },
            { header: 'Responsável', key: 'responsible', width: 22 },
            { header: 'Observações', key: 'notes', width: 36 },
          ],
          rows: expenses.map((row: any) => ({
            date: brDate(row.entry_date), description: row.description, category: row.category,
            supplier: row.supplier, amount: row.amount, method: row.method,
            responsible: row.responsible, notes: row.notes,
          })),
        },
        {
          name: 'Mensalidades',
          columns: [
            { header: 'Jogador', key: 'player', width: 28 },
            { header: 'Referência', key: 'ref', width: 14 },
            { header: 'Vencimento', key: 'due', width: 14 },
            { header: 'Previsto', key: 'expected', type: 'money', width: 14 },
            { header: 'Pago', key: 'paid', type: 'money', width: 14 },
            { header: 'Status', key: 'status', width: 14 },
          ],
          rows: dues.map((row: any) => ({
            player: row.full_name, ref: row.reference_month, due: brDate(row.due_date),
            expected: row.expected_amount, paid: row.paid_amount, status: label(row.status),
          })),
        },
        {
          name: 'Fluxo de Caixa',
          columns: [
            { header: 'Mês', key: 'ref', width: 14 },
            { header: 'Entradas', key: 'income', type: 'money', width: 16 },
            { header: 'Saídas', key: 'expense', type: 'money', width: 16 },
            { header: 'Resultado', key: 'net', type: 'money', width: 16 },
            { header: 'Saldo acumulado', key: 'balance', type: 'money', width: 18 },
          ],
          rows: cashFlow.map((point) => ({
            ref: point.ref, income: point.income, expense: point.expense,
            net: point.net, balance: point.balance,
          })),
        },
      ];
    }

    case 'futebol': {
      const [matches, competitions, trainings, lineups] = await Promise.all([
        query(
          c,
          `SELECT m.*, t.name AS team_name, cp.name AS competition_name FROM matches m
             LEFT JOIN teams t ON t.id = m.team_id LEFT JOIN competitions cp ON cp.id = m.competition_id
            WHERE m.club_id = ? ORDER BY m.match_date DESC`,
          clubId,
        ),
        query(
          c,
          `SELECT cp.*, t.name AS team_name FROM competitions cp
             LEFT JOIN teams t ON t.id = cp.team_id WHERE cp.club_id = ? ORDER BY cp.season DESC`,
          clubId,
        ),
        query(
          c,
          `SELECT tr.*, t.name AS team_name, p.full_name AS responsible_name FROM trainings tr
             LEFT JOIN teams t ON t.id = tr.team_id
             LEFT JOIN staff_members s ON s.id = tr.responsible_id
             LEFT JOIN people p ON p.id = s.person_id
            WHERE tr.club_id = ? ORDER BY tr.training_date DESC`,
          clubId,
        ),
        query(
          c,
          `SELECT l.formation, m.match_date, m.opponent, e.slot, e.shirt_number, e.position, p.full_name
             FROM lineups l
             JOIN matches m ON m.id = l.match_id
             JOIN lineup_entries e ON e.lineup_id = l.id
             JOIN players pl ON pl.id = e.player_id
             JOIN people p ON p.id = pl.person_id
            WHERE l.club_id = ? ORDER BY m.match_date DESC, e.sort_order`,
          clubId,
        ),
      ]);

      return [
        {
          name: 'Jogos',
          columns: [
            { header: 'Data', key: 'date', width: 14 },
            { header: 'Horário', key: 'time', width: 12 },
            { header: 'Adversário', key: 'opponent', width: 28 },
            { header: 'Mando', key: 'venue', width: 14 },
            { header: 'Local', key: 'location', width: 26 },
            { header: 'Campeonato', key: 'competition', width: 30 },
            { header: 'Equipe', key: 'team', width: 16 },
            { header: 'Gols pró', key: 'goalsFor', type: 'number', width: 12 },
            { header: 'Gols contra', key: 'goalsAgainst', type: 'number', width: 12 },
            { header: 'Status', key: 'status', width: 14 },
          ],
          rows: matches.map((row: any) => ({
            date: brDate(row.match_date), time: row.match_time, opponent: row.opponent,
            venue: label(row.venue), location: row.location,
            competition: row.competition_name ?? 'Amistoso', team: row.team_name,
            goalsFor: row.goals_for, goalsAgainst: row.goals_against, status: label(row.status),
          })),
        },
        {
          name: 'Campeonatos',
          columns: [
            { header: 'Nome', key: 'name', width: 36 },
            { header: 'Temporada', key: 'season', width: 14 },
            { header: 'Organização', key: 'organizer', width: 28 },
            { header: 'Equipe', key: 'team', width: 16 },
            { header: 'Formato', key: 'format', width: 24 },
            { header: 'Status', key: 'status', width: 16 },
          ],
          rows: competitions.map((row: any) => ({
            name: row.name, season: row.season, organizer: row.organizer,
            team: row.team_name, format: row.format, status: label(row.status),
          })),
        },
        {
          name: 'Treinamentos',
          columns: [
            { header: 'Data', key: 'date', width: 14 },
            { header: 'Horário', key: 'time', width: 12 },
            { header: 'Tipo', key: 'type', width: 16 },
            { header: 'Equipe', key: 'team', width: 16 },
            { header: 'Local', key: 'location', width: 30 },
            { header: 'Responsável', key: 'responsible', width: 24 },
            { header: 'Status', key: 'status', width: 14 },
          ],
          rows: trainings.map((row: any) => ({
            date: brDate(row.training_date), time: row.training_time, type: row.type,
            team: row.team_name, location: row.location,
            responsible: row.responsible_name, status: label(row.status),
          })),
        },
        {
          name: 'Escalações',
          columns: [
            { header: 'Data', key: 'date', width: 14 },
            { header: 'Adversário', key: 'opponent', width: 28 },
            { header: 'Formação', key: 'formation', width: 12 },
            { header: 'Camisa', key: 'shirt', type: 'number', width: 10 },
            { header: 'Jogador', key: 'player', width: 28 },
            { header: 'Posição', key: 'position', width: 18 },
            { header: 'Condição', key: 'slot', width: 14 },
          ],
          rows: lineups.map((row: any) => ({
            date: brDate(row.match_date), opponent: row.opponent, formation: row.formation,
            shirt: row.shirt_number, player: row.full_name, position: row.position,
            slot: row.slot === 'titular' ? 'Titular' : 'Reserva',
          })),
        },
      ];
    }

    case 'estoque': {
      const [items, movements] = await Promise.all([
        query(c, 'SELECT * FROM inventory_items WHERE club_id = ? ORDER BY name', clubId),
        query(
          c,
          `SELECT m.*, i.name AS item_name FROM inventory_movements m
             JOIN inventory_items i ON i.id = m.item_id
            WHERE m.club_id = ? ORDER BY m.movement_date DESC`,
          clubId,
        ),
      ]);

      return [
        {
          name: 'Itens',
          columns: [
            { header: 'Item', key: 'name', width: 30 },
            { header: 'Categoria', key: 'category', width: 18 },
            { header: 'Quantidade', key: 'quantity', type: 'number', width: 14 },
            { header: 'Unidade', key: 'unit', width: 12 },
            { header: 'Estoque mínimo', key: 'min', type: 'number', width: 16 },
            { header: 'Localização', key: 'location', width: 30 },
            { header: 'Situação', key: 'status', width: 14 },
            { header: 'Observações', key: 'notes', width: 36 },
          ],
          rows: items.map((row: any) => ({
            name: row.name, category: row.category, quantity: row.quantity, unit: row.unit,
            min: row.min_quantity, location: row.location,
            status: label(
              Number(row.quantity) <= 0 ? 'esgotado'
                : Number(row.quantity) < Number(row.min_quantity) ? 'baixo' : 'disponivel',
            ),
            notes: row.notes,
          })),
        },
        {
          name: 'Movimentações',
          columns: [
            { header: 'Data', key: 'date', width: 14 },
            { header: 'Item', key: 'item', width: 30 },
            { header: 'Tipo', key: 'type', width: 14 },
            { header: 'Quantidade', key: 'quantity', type: 'number', width: 14 },
            { header: 'Responsável', key: 'responsible', width: 24 },
            { header: 'Motivo', key: 'reason', width: 30 },
            { header: 'Observações', key: 'notes', width: 36 },
          ],
          rows: movements.map((row: any) => ({
            date: brDate(row.movement_date), item: row.item_name, type: label(row.type),
            quantity: row.quantity, responsible: row.responsible, reason: row.reason, notes: row.notes,
          })),
        },
      ];
    }

    default:
      throw notFound('Relatório não encontrado.');
  }
}

exports_.get('/:kind', requirePermission('reports.export'), async (c) => {
  const kind = c.req.param('kind').replace(/\.xlsx$/, '');
  const sheets = await buildSheets(c, kind);
  const workbook = buildWorkbook(sheets);

  return new Response(workbook, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${kind}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
});

export default exports_;
