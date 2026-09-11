import { Hono } from 'hono';
import type { AppBindings } from '../lib/env';
import { badRequest, conflict, notFound } from '../lib/errors';
import { newId, nowIso } from '../lib/id';
import { mapDue, mapExpense, mapIncome } from '../lib/mappers';
import { requirePermission } from '../lib/middleware';
import { logActivity } from '../lib/activity';
import { dueDateFor } from '../../../src/shared/billing';
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

/**
 * A due names the person who owes it, plus the links that person holds, so the
 * screen can show "João Silva · Jogador, Diretoria" without a second round trip.
 */
const DUE_SELECT = `
  SELECT d.*, p.full_name AS person_name, p.nickname AS person_nickname,
         EXISTS (SELECT 1 FROM players       x WHERE x.person_id = p.id) AS is_player,
         EXISTS (SELECT 1 FROM board_members x WHERE x.person_id = p.id) AS is_board,
         EXISTS (SELECT 1 FROM staff_members x WHERE x.person_id = p.id) AS is_staff
    FROM monthly_dues d
    JOIN people p ON p.id = d.person_id
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
  personId: requiredText('A pessoa', 60),
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

  const person = await c.env.DB.prepare('SELECT id FROM people WHERE id=? AND club_id=?')
    .bind(body.personId, clubId).first();
  if (!person) throw notFound('Pessoa não encontrada.');

  // `monthly_fee_enabled` governs who the monthly generation picks up. Raising a
  // single charge by hand is a deliberate act, so it is not gated by the flag —
  // otherwise a one-off cobrança would mean editing the person first.
  const duplicate = await c.env.DB.prepare(
    'SELECT id FROM monthly_dues WHERE person_id=? AND reference_month=?',
  ).bind(body.personId, body.referenceMonth).first();
  if (duplicate) throw conflict('Já existe uma mensalidade desta pessoa para o mês informado.');

  const now = nowIso();
  const id = newId('due');
  const status = dueStatus(body.expectedAmount, body.paidAmount, body.dueDate);

  await c.env.DB.prepare(
    `INSERT INTO monthly_dues (id, club_id, person_id, reference_month, due_date, expected_amount,
                               paid_amount, paid_at, method, status, notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(id, clubId, body.personId, body.referenceMonth, body.dueDate, body.expectedAmount,
      body.paidAmount, body.paidAt, body.method, status, body.notes, now, now)
    .run();

  const row = await c.env.DB.prepare(`${DUE_SELECT} WHERE d.id = ?`).bind(id).first();
  const due = mapDue(row!);
  await logActivity(c.env, c.get('session'), {
    kind: 'financeiro',
    title: body.paidAmount > 0 ? 'Mensalidade registrada' : 'Mensalidade lançada',
    detail: `${due.personName} — ${due.referenceMonth}`,
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
 * Generates the month's dues for every person marked as paying a monthly fee,
 * skipping anyone who already has one — so running it twice is safe.
 *
 * Membership links are irrelevant here: a director, a coach and a player are all
 * picked up if their person is flagged, and someone who holds three links is
 * still charged once, because the charge hangs off the person.
 */
finance.post('/dues/generate', requirePermission('finance.create'), async (c) => {
  const body = await parseBody(c.req.raw, z.object({ referenceMonth: monthRef }));
  const clubId = c.get('clubId');
  // `monthRef` only checks the shape, so a month like 2026-13 would otherwise
  // reach the insert as a date that does not exist.
  const month = Number(body.referenceMonth.split('-')[1]);
  if (month < 1 || month > 12) throw badRequest('Mês de referência inválido.');

  const payers = await c.env.DB.prepare(
    `SELECT p.id, p.monthly_fee, p.due_day FROM people p
      WHERE p.club_id = ? AND p.monthly_fee_enabled = 1 AND p.status = 'ativo'
        AND NOT EXISTS (SELECT 1 FROM monthly_dues d WHERE d.person_id = p.id AND d.reference_month = ?)`,
  ).bind(clubId, body.referenceMonth).all<{ id: string; monthly_fee: number; due_day: number }>();

  if (payers.results.length === 0) return c.json({ created: 0 });

  const now = nowIso();
  const statements = payers.results.map((payer) => {
    // Same rule as the form: the person's billing day inside the reference
    // month, pulled back to the last day that month actually has.
    const dueDate = dueDateFor(body.referenceMonth, payer.due_day);
    return c.env.DB.prepare(
      `INSERT INTO monthly_dues (id, club_id, person_id, reference_month, due_date, expected_amount,
                                 paid_amount, status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,0,?,?,?)`,
    ).bind(newId('due'), clubId, payer.id, body.referenceMonth, dueDate, payer.monthly_fee,
      dueStatus(payer.monthly_fee, 0, dueDate), now, now);
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
