import { Hono } from 'hono';
import type { AppBindings } from '../lib/env';
import { mapActivity, mapInventoryItem, mapMatch, mapTraining } from '../lib/mappers';
import { requirePermission } from '../lib/middleware';
import { buildCashFlow } from './finance';

const dashboard = new Hono<AppBindings>();

const today = () => new Date().toISOString().slice(0, 10);
const monthRef = () => new Date().toISOString().slice(0, 7);

/**
 * Every figure here is a live aggregate over the club's own rows. When the club
 * has no data the numbers are genuinely zero — nothing is invented to fill the
 * layout.
 */
dashboard.get('/summary', requirePermission('dashboard.view'), async (c) => {
  const clubId = c.get('clubId');
  const db = c.env.DB;
  const day = today();
  const ref = monthRef();

  const [
    playerCounts,
    peopleCount,
    upcomingMatchCount,
    upcomingTrainingCount,
    monthIncome,
    monthExpense,
    totals,
    dueSummary,
    lowStock,
  ] = await Promise.all([
    db.prepare(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN status='ativo' THEN 1 ELSE 0 END) AS active
         FROM players WHERE club_id = ?`,
    ).bind(clubId).first<{ total: number; active: number }>(),
    db.prepare('SELECT COUNT(*) AS total FROM people WHERE club_id = ?').bind(clubId).first<{ total: number }>(),
    db.prepare(
      `SELECT COUNT(*) AS total FROM matches
        WHERE club_id = ? AND match_date >= ? AND status NOT IN ('cancelado','encerrado')`,
    ).bind(clubId, day).first<{ total: number }>(),
    db.prepare(
      `SELECT COUNT(*) AS total FROM trainings
        WHERE club_id = ? AND training_date >= ? AND status = 'agendado'`,
    ).bind(clubId, day).first<{ total: number }>(),
    db.prepare(
      "SELECT COALESCE(SUM(amount),0) AS total FROM income_entries WHERE club_id = ? AND substr(entry_date,1,7) = ?",
    ).bind(clubId, ref).first<{ total: number }>(),
    db.prepare(
      "SELECT COALESCE(SUM(amount),0) AS total FROM expense_entries WHERE club_id = ? AND substr(entry_date,1,7) = ?",
    ).bind(clubId, ref).first<{ total: number }>(),
    db.prepare(
      `SELECT
         (SELECT COALESCE(SUM(amount),0) FROM income_entries  WHERE club_id = ?) AS income,
         (SELECT COALESCE(SUM(amount),0) FROM expense_entries WHERE club_id = ?) AS expense`,
    ).bind(clubId, clubId).first<{ income: number; expense: number }>(),
    db.prepare(
      `SELECT COALESCE(SUM(expected_amount),0) AS expected,
              COALESCE(SUM(paid_amount),0) AS received,
              SUM(CASE WHEN status <> 'pago' THEN 1 ELSE 0 END) AS open_count,
              SUM(CASE WHEN status = 'atrasado' THEN 1 ELSE 0 END) AS overdue_count
         FROM monthly_dues WHERE club_id = ? AND reference_month = ?`,
    ).bind(clubId, ref).first<{ expected: number; received: number; open_count: number; overdue_count: number }>(),
    db.prepare(
      'SELECT COUNT(*) AS total FROM inventory_items WHERE club_id = ? AND quantity < min_quantity',
    ).bind(clubId).first<{ total: number }>(),
  ]);

  const expected = Number(dueSummary?.expected ?? 0);
  const received = Number(dueSummary?.received ?? 0);

  return c.json({
    activePlayers: Number(playerCounts?.active ?? 0),
    totalPlayers: Number(playerCounts?.total ?? 0),
    totalPeople: Number(peopleCount?.total ?? 0),
    upcomingMatchCount: Number(upcomingMatchCount?.total ?? 0),
    upcomingTrainingCount: Number(upcomingTrainingCount?.total ?? 0),
    monthIncome: Number(monthIncome?.total ?? 0),
    monthExpense: Number(monthExpense?.total ?? 0),
    balance: Number(totals?.income ?? 0) - Number(totals?.expense ?? 0),
    lowStockCount: Number(lowStock?.total ?? 0),
    dues: {
      ref,
      expected,
      received,
      open: expected - received,
      openCount: Number(dueSummary?.open_count ?? 0),
      overdueCount: Number(dueSummary?.overdue_count ?? 0),
      collectionRate: expected === 0 ? 0 : Math.round((received / expected) * 100),
    },
  });
});

/** Everything the dashboard renders below the KPI row, in one round trip. */
dashboard.get('/overview', requirePermission('dashboard.view'), async (c) => {
  const clubId = c.get('clubId');
  const db = c.env.DB;
  const day = today();
  const ref = monthRef();

  const [matches, trainings, results, activity, lowStock, openDues, cashFlow, dueStatuses] =
    await Promise.all([
      db.prepare(
        `SELECT m.*, t.name AS team_name, cp.name AS competition_name FROM matches m
           LEFT JOIN teams t ON t.id = m.team_id
           LEFT JOIN competitions cp ON cp.id = m.competition_id
          WHERE m.club_id = ? AND m.match_date >= ? AND m.status NOT IN ('cancelado','encerrado')
          ORDER BY m.match_date, m.match_time LIMIT 4`,
      ).bind(clubId, day).all(),
      db.prepare(
        `SELECT tr.*, t.name AS team_name, p.full_name AS responsible_name FROM trainings tr
           LEFT JOIN teams t ON t.id = tr.team_id
           LEFT JOIN staff_members s ON s.id = tr.responsible_id
           LEFT JOIN people p ON p.id = s.person_id
          WHERE tr.club_id = ? AND tr.training_date >= ? AND tr.status = 'agendado'
          ORDER BY tr.training_date, tr.training_time LIMIT 4`,
      ).bind(clubId, day).all(),
      db.prepare(
        `SELECT m.*, t.name AS team_name, cp.name AS competition_name FROM matches m
           LEFT JOIN teams t ON t.id = m.team_id
           LEFT JOIN competitions cp ON cp.id = m.competition_id
          WHERE m.club_id = ? AND m.status = 'encerrado'
          ORDER BY m.match_date DESC LIMIT 5`,
      ).bind(clubId).all(),
      db.prepare(
        'SELECT * FROM activity_log WHERE club_id = ? ORDER BY created_at DESC LIMIT 6',
      ).bind(clubId).all(),
      db.prepare(
        'SELECT * FROM inventory_items WHERE club_id = ? AND quantity < min_quantity ORDER BY quantity LIMIT 4',
      ).bind(clubId).all(),
      db.prepare(
        `SELECT d.id, d.expected_amount, d.paid_amount, d.due_date, d.status, p.full_name AS player_name
           FROM monthly_dues d
           JOIN players pl ON pl.id = d.player_id
           JOIN people p ON p.id = pl.person_id
          WHERE d.club_id = ? AND d.reference_month = ? AND d.status <> 'pago'
          ORDER BY d.due_date LIMIT 4`,
      ).bind(clubId, ref).all(),
      buildCashFlow(db, clubId, 6),
      db.prepare(
        'SELECT status, COUNT(*) AS total FROM monthly_dues WHERE club_id = ? AND reference_month = ? GROUP BY status',
      ).bind(clubId, ref).all<{ status: string; total: number }>(),
    ]);

  return c.json({
    upcomingMatches: matches.results.map(mapMatch),
    upcomingTrainings: trainings.results.map(mapTraining),
    lastResults: results.results.map(mapMatch),
    activity: activity.results.map(mapActivity),
    lowStock: lowStock.results.map(mapInventoryItem),
    openDues: openDues.results.map((row: any) => ({
      id: String(row.id),
      player: String(row.player_name),
      amount: Number(row.expected_amount) - Number(row.paid_amount),
      dueDate: String(row.due_date),
      status: String(row.status),
    })),
    cashFlow,
    duesByStatus: Object.fromEntries(dueStatuses.results.map((row) => [row.status, Number(row.total)])),
  });
});

export default dashboard;
