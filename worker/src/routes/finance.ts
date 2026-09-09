import { Hono } from 'hono';
import type { AppBindings } from '../lib/env';
import { conflict, notFound } from '../lib/errors';
import { newId, nowIso } from '../lib/id';
import { mapDue, mapExpense, mapIncome } from '../lib/mappers';
import { requirePermission } from '../lib/middleware';
import { logActivity } from '../lib/activity';
import {
  isoDate,
  monthRef,
  money,
  optionalIsoDate,
  optionalText,
  parseBody,
  requiredText,
  z,
} from '../lib/validate';

const finance = new Hono<AppBindings>();

const DUE_SELECT = `
  SELECT d.*, p.full_name AS player_name
    FROM monthly_dues d
    JOIN players pl ON pl.id = d.player_id
    JOIN people p ON p.id = pl.person_id
`;

/** Status is derived from the amounts and the due date, never trusted from the client. */
function dueStatus(expected: number, paid: number, dueDate: string): string {
  if (paid >= expected && expected > 0) return 'pago';
  if (paid > 0) return 'parcial';
  const today = new Date().toISOString().slice(0, 10);
  return dueDate < today ? 'atrasado' : 'pendente';
}

/* ============================================================== dues */

const dueSchema = z.object({
  playerId: requiredText('O jogador', 60),
  referenceMonth: monthRef,
  dueDate: isoDate,
  expectedAmount: money,
  paidAmount: money.default(0),
  paidAt: optionalIsoDate,
  method: optionalText(40),
  notes: optionalText(2000),
});

finance.get('/dues', requirePermission('finance.view'), async (c) => {
  const rows = await c.env.DB.prepare(
    `${DUE_SELECT} WHERE d.club_id = ? ORDER BY d.reference_month DESC, p.full_name`,
  )
    .bind(c.get('clubId'))
    .all();
  return c.json({ data: rows.results.map(mapDue) });
});

finance.post('/dues', requirePermission('finance.create'), async (c) => {
  const body = await parseBody(c.req.raw, dueSchema);
  const clubId = c.get('clubId');

  const player = await c.env.DB.prepare('SELECT id FROM players WHERE id=? AND club_id=?')
    .bind(body.playerId, clubId).first();
  if (!player) throw notFound('Jogador não encontrado.');

  const duplicate = await c.env.DB.prepare(
    'SELECT id FROM monthly_dues WHERE player_id=? AND reference_month=?',
  ).bind(body.playerId, body.referenceMonth).first();
  if (duplicate) throw conflict('Já existe uma mensalidade deste jogador para o mês informado.');

  const now = nowIso();
  const id = newId('due');
  const status = dueStatus(body.expectedAmount, body.paidAmount, body.dueDate);

  await c.env.DB.prepare(
    `INSERT INTO monthly_dues (id, club_id, player_id, reference_month, due_date, expected_amount,
                               paid_amount, paid_at, method, status, notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(id, clubId, body.playerId, body.referenceMonth, body.dueDate, body.expectedAmount,
      body.paidAmount, body.paidAt, body.method, status, body.notes, now, now)
    .run();

  const row = await c.env.DB.prepare(`${DUE_SELECT} WHERE d.id = ?`).bind(id).first();
  const due = mapDue(row!);
  await logActivity(c.env, c.get('session'), {
    kind: 'financeiro',
    title: body.paidAmount > 0 ? 'Mensalidade registrada' : 'Mensalidade lançada',
    detail: `${due.playerName} — ${due.referenceMonth}`,
  });
  return c.json({ data: due }, 201);
});

finance.put('/dues/:id', requirePermission('finance.edit'), async (c) => {
  const body = await parseBody(c.req.raw, dueSchema);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT id FROM monthly_dues WHERE id=? AND club_id=?')
    .bind(id, c.get('clubId')).first();
  if (!existing) throw notFound('Mensalidade não encontrada.');

  const status = dueStatus(body.expectedAmount, body.paidAmount, body.dueDate);
  await c.env.DB.prepare(
    `UPDATE monthly_dues SET reference_month=?, due_date=?, expected_amount=?, paid_amount=?,
                             paid_at=?, method=?, status=?, notes=?, updated_at=?
      WHERE id=? AND club_id=?`,
  )
    .bind(body.referenceMonth, body.dueDate, body.expectedAmount, body.paidAmount,
      body.paidAt, body.method, status, body.notes, nowIso(), id, c.get('clubId'))
    .run();

  const row = await c.env.DB.prepare(`${DUE_SELECT} WHERE d.id = ?`).bind(id).first();
  return c.json({ data: mapDue(row!) });
});

finance.delete('/dues/:id', requirePermission('finance.delete'), async (c) => {
  await c.env.DB.prepare('DELETE FROM monthly_dues WHERE id=? AND club_id=?')
    .bind(c.req.param('id'), c.get('clubId')).run();
  return c.json({ ok: true });
});

/**
 * Generates the month's dues for every billable player, skipping anyone who
 * already has one — so running it twice is safe.
 */
finance.post('/dues/generate', requirePermission('finance.create'), async (c) => {
  const body = await parseBody(c.req.raw, z.object({ referenceMonth: monthRef }));
  const clubId = c.get('clubId');
  const [year, month] = body.referenceMonth.split('-').map(Number);

  const players = await c.env.DB.prepare(
    `SELECT pl.id, pl.monthly_fee, pl.due_day FROM players pl
      WHERE pl.club_id = ? AND pl.status NOT IN ('inativo')
        AND NOT EXISTS (SELECT 1 FROM monthly_dues d WHERE d.player_id = pl.id AND d.reference_month = ?)`,
  ).bind(clubId, body.referenceMonth).all<{ id: string; monthly_fee: number; due_day: number }>();

  if (players.results.length === 0) return c.json({ created: 0 });

  const now = nowIso();
  const statements = players.results.map((player) => {
    const day = Math.min(Math.max(player.due_day, 1), 28);
    const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return c.env.DB.prepare(
      `INSERT INTO monthly_dues (id, club_id, player_id, reference_month, due_date, expected_amount,
                                 paid_amount, status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,0,?,?,?)`,
    ).bind(newId('due'), clubId, player.id, body.referenceMonth, dueDate, player.monthly_fee,
      dueStatus(player.monthly_fee, 0, dueDate), now, now);
  });

  await c.env.DB.batch(statements);
  await logActivity(c.env, c.get('session'), {
    kind: 'financeiro',
    title: 'Mensalidades geradas',
    detail: `${statements.length} cobranças para ${body.referenceMonth}`,
  });
  return c.json({ created: statements.length }, 201);
});

/* ====================================================== income & expense */

const incomeSchema = z.object({
  date: isoDate,
  description: requiredText('A descrição'),
  category: requiredText('A categoria', 80),
  source: optionalText(160),
  amount: money,
  method: optionalText(40),
  responsible: optionalText(160),
  notes: optionalText(2000),
});

const expenseSchema = incomeSchema.omit({ source: true }).extend({ supplier: optionalText(160) });

finance.get('/income', requirePermission('finance.view'), async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM income_entries WHERE club_id = ? ORDER BY entry_date DESC, created_at DESC',
  ).bind(c.get('clubId')).all();
  return c.json({ data: rows.results.map(mapIncome) });
});

finance.post('/income', requirePermission('finance.create'), async (c) => {
  const body = await parseBody(c.req.raw, incomeSchema);
  const now = nowIso();
  const id = newId('inc');
  await c.env.DB.prepare(
    `INSERT INTO income_entries (id, club_id, entry_date, description, category, source, amount,
                                 method, responsible, notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(id, c.get('clubId'), body.date, body.description, body.category, body.source,
      body.amount, body.method, body.responsible, body.notes, now, now)
    .run();

  await logActivity(c.env, c.get('session'), {
    kind: 'financeiro', title: 'Entrada lançada', detail: body.description,
  });
  const row = await c.env.DB.prepare('SELECT * FROM income_entries WHERE id = ?').bind(id).first();
  return c.json({ data: mapIncome(row!) }, 201);
});

finance.put('/income/:id', requirePermission('finance.edit'), async (c) => {
  const body = await parseBody(c.req.raw, incomeSchema);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT id FROM income_entries WHERE id=? AND club_id=?')
    .bind(id, c.get('clubId')).first();
  if (!existing) throw notFound('Lançamento não encontrado.');

  await c.env.DB.prepare(
    `UPDATE income_entries SET entry_date=?, description=?, category=?, source=?, amount=?,
                               method=?, responsible=?, notes=?, updated_at=? WHERE id=? AND club_id=?`,
  )
    .bind(body.date, body.description, body.category, body.source, body.amount,
      body.method, body.responsible, body.notes, nowIso(), id, c.get('clubId'))
    .run();

  const row = await c.env.DB.prepare('SELECT * FROM income_entries WHERE id = ?').bind(id).first();
  return c.json({ data: mapIncome(row!) });
});

finance.delete('/income/:id', requirePermission('finance.delete'), async (c) => {
  await c.env.DB.prepare('DELETE FROM income_entries WHERE id=? AND club_id=?')
    .bind(c.req.param('id'), c.get('clubId')).run();
  return c.json({ ok: true });
});

finance.get('/expenses', requirePermission('finance.view'), async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM expense_entries WHERE club_id = ? ORDER BY entry_date DESC, created_at DESC',
  ).bind(c.get('clubId')).all();
  return c.json({ data: rows.results.map(mapExpense) });
});

finance.post('/expenses', requirePermission('finance.create'), async (c) => {
  const body = await parseBody(c.req.raw, expenseSchema);
  const now = nowIso();
  const id = newId('exp');
  await c.env.DB.prepare(
    `INSERT INTO expense_entries (id, club_id, entry_date, description, category, supplier, amount,
                                  method, responsible, notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(id, c.get('clubId'), body.date, body.description, body.category, body.supplier,
      body.amount, body.method, body.responsible, body.notes, now, now)
    .run();

  await logActivity(c.env, c.get('session'), {
    kind: 'financeiro', title: 'Saída lançada', detail: body.description,
  });
  const row = await c.env.DB.prepare('SELECT * FROM expense_entries WHERE id = ?').bind(id).first();
  return c.json({ data: mapExpense(row!) }, 201);
});

finance.put('/expenses/:id', requirePermission('finance.edit'), async (c) => {
  const body = await parseBody(c.req.raw, expenseSchema);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT id FROM expense_entries WHERE id=? AND club_id=?')
    .bind(id, c.get('clubId')).first();
  if (!existing) throw notFound('Lançamento não encontrado.');

  await c.env.DB.prepare(
    `UPDATE expense_entries SET entry_date=?, description=?, category=?, supplier=?, amount=?,
                                method=?, responsible=?, notes=?, updated_at=? WHERE id=? AND club_id=?`,
  )
    .bind(body.date, body.description, body.category, body.supplier, body.amount,
      body.method, body.responsible, body.notes, nowIso(), id, c.get('clubId'))
    .run();

  const row = await c.env.DB.prepare('SELECT * FROM expense_entries WHERE id = ?').bind(id).first();
  return c.json({ data: mapExpense(row!) });
});

finance.delete('/expenses/:id', requirePermission('finance.delete'), async (c) => {
  await c.env.DB.prepare('DELETE FROM expense_entries WHERE id=? AND club_id=?')
    .bind(c.req.param('id'), c.get('clubId')).run();
  return c.json({ ok: true });
});

/* ========================================================== cash flow */

export interface CashFlowPoint {
  ref: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  balance: number;
}

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Cash flow is always computed from the ledger; no derived total is stored. */
export async function buildCashFlow(db: D1Database, clubId: string, months: number): Promise<CashFlowPoint[]> {
  const now = new Date();
  const refs: string[] = [];
  for (let back = months - 1; back >= 0; back -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    refs.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  const earliest = `${refs[0]}-01`;

  const [incomeRows, expenseRows, priorIncome, priorExpense] = await Promise.all([
    db.prepare(
      `SELECT substr(entry_date,1,7) AS ref, SUM(amount) AS total FROM income_entries
        WHERE club_id = ? AND entry_date >= ? GROUP BY ref`,
    ).bind(clubId, earliest).all<{ ref: string; total: number }>(),
    db.prepare(
      `SELECT substr(entry_date,1,7) AS ref, SUM(amount) AS total FROM expense_entries
        WHERE club_id = ? AND entry_date >= ? GROUP BY ref`,
    ).bind(clubId, earliest).all<{ ref: string; total: number }>(),
    db.prepare('SELECT COALESCE(SUM(amount),0) AS total FROM income_entries WHERE club_id = ? AND entry_date < ?')
      .bind(clubId, earliest).first<{ total: number }>(),
    db.prepare('SELECT COALESCE(SUM(amount),0) AS total FROM expense_entries WHERE club_id = ? AND entry_date < ?')
      .bind(clubId, earliest).first<{ total: number }>(),
  ]);

  const incomeByRef = new Map(incomeRows.results.map((row) => [row.ref, Number(row.total)]));
  const expenseByRef = new Map(expenseRows.results.map((row) => [row.ref, Number(row.total)]));

  let running = Number(priorIncome?.total ?? 0) - Number(priorExpense?.total ?? 0);

  return refs.map((ref) => {
    const income = incomeByRef.get(ref) ?? 0;
    const expense = expenseByRef.get(ref) ?? 0;
    running += income - expense;
    return {
      ref,
      label: MONTHS_SHORT[Number(ref.slice(5, 7)) - 1],
      income,
      expense,
      net: income - expense,
      balance: running,
    };
  });
}

finance.get('/cash-flow', requirePermission('finance.view'), async (c) => {
  const months = Math.min(Math.max(Number(c.req.query('months') ?? 6), 1), 24);
  const points = await buildCashFlow(c.env.DB, c.get('clubId'), months);

  const breakdownRows = await c.env.DB.prepare(
    `SELECT category, SUM(amount) AS total FROM expense_entries
      WHERE club_id = ? AND entry_date >= ? GROUP BY category ORDER BY total DESC`,
  ).bind(c.get('clubId'), `${points[Math.max(points.length - 3, 0)].ref}-01`).all<{ category: string; total: number }>();

  const total = breakdownRows.results.reduce((sum, row) => sum + Number(row.total), 0);

  return c.json({
    points,
    breakdown: breakdownRows.results.map((row) => ({
      label: row.category,
      value: Number(row.total),
      share: total === 0 ? 0 : (Number(row.total) / total) * 100,
    })),
  });
});

export default finance;
