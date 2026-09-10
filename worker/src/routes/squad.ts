import { Hono } from 'hono';
import type { AppBindings } from '../lib/env';
import { conflict, notFound } from '../lib/errors';
import { newId, nowIso } from '../lib/id';
import { mapBoardMember, mapPlayer, mapStaffMember } from '../lib/mappers';
import { requirePermission } from '../lib/middleware';
import { logActivity } from '../lib/activity';
import { optionalIsoDate, optionalText, parseBody, requiredText, z } from '../lib/validate';

const squad = new Hono<AppBindings>();

/**
 * A squad row never copies personal data: name, phone and birth date are read
 * from `people` through the join, so editing the person updates every role.
 */
const PLAYER_SELECT = `
  SELECT pl.*, p.full_name, p.nickname, p.birth_date, p.phone, t.name AS team_name,
         p.monthly_fee AS person_monthly_fee, p.due_day AS person_due_day,
         p.monthly_fee_enabled AS person_fee_enabled
    FROM players pl
    JOIN people p ON p.id = pl.person_id
    LEFT JOIN teams t ON t.id = pl.team_id
`;

const BOARD_SELECT = `
  SELECT b.*, p.full_name, COALESCE(b.notes, b.notes) AS notes, p.phone, p.email
    FROM board_members b
    JOIN people p ON p.id = b.person_id
`;

const STAFF_SELECT = `
  SELECT s.*, p.full_name, t.name AS team_name
    FROM staff_members s
    JOIN people p ON p.id = s.person_id
    LEFT JOIN teams t ON t.id = s.team_id
`;

/**
 * Resolves the person a role should attach to: an existing one when `personId`
 * is given, otherwise a new person created from the inline name. This keeps the
 * quick "novo jogador" form usable without ever duplicating an existing person.
 */
async function resolvePerson(
  c: any,
  input: { personId?: string | null; fullName?: string | null; phone?: string | null; birthDate?: string | null; nickname?: string | null },
): Promise<string> {
  const clubId = c.get('clubId');

  if (input.personId) {
    const person = await c.env.DB.prepare('SELECT id FROM people WHERE id = ? AND club_id = ?')
      .bind(input.personId, clubId)
      .first();
    if (!person) throw notFound('Pessoa não encontrada.');
    return input.personId;
  }

  if (!input.fullName) {
    throw conflict('Informe uma pessoa existente ou o nome completo para criar o cadastro.');
  }

  const now = nowIso();
  const personId = newId('per');
  await c.env.DB.prepare(
    `INSERT INTO people (id, club_id, full_name, nickname, birth_date, phone, status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,'ativo',?,?)`,
  )
    .bind(personId, clubId, input.fullName, input.nickname ?? null, input.birthDate ?? null, input.phone ?? null, now, now)
    .run();
  return personId;
}

/* ============================================================== players */

export interface PlayerHistory {
  dues: number;
  lineups: number;
  trainings: number;
  total: number;
}

/**
 * How much of the club's record stands behind this player.
 *
 * Line-ups and attendance cascade from `players`, so deleting the row would
 * take them with it. Dues no longer do — they belong to the person — but a
 * member who has been billed has a real history in the squad, so they count
 * here too. Either way the answer decides between erasing a mistaken entry and
 * retiring a career.
 */
async function playerHistory(
  db: D1Database,
  playerId: string,
  personId: string,
): Promise<PlayerHistory> {
  const row = await db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM monthly_dues WHERE person_id = ?)          AS dues,
              (SELECT COUNT(*) FROM lineup_entries WHERE player_id = ?)        AS lineups,
              (SELECT COUNT(*) FROM training_participants WHERE player_id = ?) AS trainings`,
    )
    .bind(personId, playerId, playerId)
    .first<{ dues: number; lineups: number; trainings: number }>();

  const dues = Number(row?.dues ?? 0);
  const lineups = Number(row?.lineups ?? 0);
  const trainings = Number(row?.trainings ?? 0);
  return { dues, lineups, trainings, total: dues + lineups + trainings };
}

const playerSchema = z.object({
  personId: z.string().trim().optional().nullable(),
  fullName: optionalText(200),
  nickname: optionalText(80),
  birthDate: optionalIsoDate,
  phone: optionalText(40),
  shirtNumber: z.union([z.coerce.number().int().min(1).max(99), z.literal('')]).optional().nullable()
    .transform((value) => (value === '' || value == null ? null : Number(value))),
  position: requiredText('A posição', 60),
  secondaryPosition: optionalText(60),
  teamId: optionalText(60),
  joinedAt: optionalIsoDate,
  monthlyFee: z.coerce.number().min(0).default(0),
  dueDay: z.coerce.number().int().min(1).max(31).default(10),
  status: z.enum(['ativo', 'lesionado', 'suspenso', 'afastado', 'inativo']).default('ativo'),
  notes: optionalText(2000),
});

squad.get('/players', requirePermission('squad.view'), async (c) => {
  const rows = await c.env.DB.prepare(`${PLAYER_SELECT} WHERE pl.club_id = ? ORDER BY pl.shirt_number, p.full_name`)
    .bind(c.get('clubId'))
    .all();
  return c.json({ data: rows.results.map(mapPlayer) });
});

squad.get('/players/:id', requirePermission('squad.view'), async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare(`${PLAYER_SELECT} WHERE pl.id = ? AND pl.club_id = ?`)
    .bind(id, c.get('clubId'))
    .first();
  if (!row) throw notFound('Jogador não encontrado.');
  // `history` rides along on the detail read only: the list stays a single
  // query, and the screen that needs the counts already fetches this row.
  return c.json({
    data: { ...mapPlayer(row), history: await playerHistory(c.env.DB, id, String(row.person_id)) },
  });
});

squad.post('/players', requirePermission('squad.create'), async (c) => {
  const body = await parseBody(c.req.raw, playerSchema);
  const clubId = c.get('clubId');
  const personId = await resolvePerson(c, body);

  const duplicate = await c.env.DB.prepare('SELECT id FROM players WHERE person_id = ?')
    .bind(personId)
    .first();
  if (duplicate) throw conflict('Esta pessoa já está cadastrada como jogador.');

  // Joining the squad makes someone a paying member by default, and the amount
  // belongs to the person — that is where the monthly generation reads it.
  await c.env.DB.prepare(
    'UPDATE people SET monthly_fee_enabled=1, monthly_fee=?, due_day=?, updated_at=? WHERE id=? AND club_id=?',
  )
    .bind(body.monthlyFee, body.dueDay, nowIso(), personId, clubId)
    .run();

  const now = nowIso();
  const id = newId('ply');
  await c.env.DB.prepare(
    `INSERT INTO players (id, club_id, person_id, team_id, shirt_number, position, secondary_position,
                          joined_at, monthly_fee, due_day, status, notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      id, clubId, personId, body.teamId, body.shirtNumber, body.position, body.secondaryPosition,
      body.joinedAt, body.monthlyFee, body.dueDay, body.status, body.notes, now, now,
    )
    .run();

  const row = await c.env.DB.prepare(`${PLAYER_SELECT} WHERE pl.id = ?`).bind(id).first();
  const player = mapPlayer(row!);
  await logActivity(c.env, c.get('session'), {
    kind: 'elenco', title: 'Jogador cadastrado', detail: player.name, entityType: 'player', entityId: id,
  });
  return c.json({ data: player }, 201);
});

squad.put('/players/:id', requirePermission('squad.edit'), async (c) => {
  const body = await parseBody(c.req.raw, playerSchema);
  const id = c.req.param('id');
  const clubId = c.get('clubId');

  const existing = await c.env.DB.prepare('SELECT person_id FROM players WHERE id = ? AND club_id = ?')
    .bind(id, clubId)
    .first<{ person_id: string }>();
  if (!existing) throw notFound('Jogador não encontrado.');

  const now = nowIso();
  await c.env.DB.prepare(
    `UPDATE players SET team_id=?, shirt_number=?, position=?, secondary_position=?, joined_at=?,
                        monthly_fee=?, due_day=?, status=?, notes=?, updated_at=?
      WHERE id=? AND club_id=?`,
  )
    .bind(
      body.teamId, body.shirtNumber, body.position, body.secondaryPosition, body.joinedAt,
      body.monthlyFee, body.dueDay, body.status, body.notes, now, id, clubId,
    )
    .run();

  // Personal fields — and the billing defaults, which the person owns — are
  // written on the person record, so every screen reads the same numbers.
  if (body.fullName) {
    await c.env.DB.prepare(
      `UPDATE people SET full_name=?, nickname=?, birth_date=?, phone=?,
                         monthly_fee=?, due_day=?, updated_at=?
        WHERE id=? AND club_id=?`,
    )
      .bind(body.fullName, body.nickname, body.birthDate, body.phone, body.monthlyFee,
        body.dueDay, now, existing.person_id, clubId)
      .run();
  } else {
    await c.env.DB.prepare(
      'UPDATE people SET monthly_fee=?, due_day=?, updated_at=? WHERE id=? AND club_id=?',
    )
      .bind(body.monthlyFee, body.dueDay, now, existing.person_id, clubId).run();
  }

  const row = await c.env.DB.prepare(`${PLAYER_SELECT} WHERE pl.id = ?`).bind(id).first();
  const player = mapPlayer(row!);
  await logActivity(c.env, c.get('session'), {
    kind: 'elenco', title: 'Jogador atualizado', detail: player.name, entityType: 'player', entityId: id,
  });
  return c.json({ data: player });
});

/**
 * Leaving the squad.
 *
 * `lineup_entries` and `training_participants` cascade from `players`, so a
 * physical delete does not just remove an athlete — it rewrites the club's
 * sporting record. A player with any history behind them is therefore retired
 * (status `inativo`), which is the same flag the squad form already offers;
 * only a record with nothing attached is actually deleted.
 *
 * The person is never touched. She stays in the central register with whatever
 * other links she holds — and so do her dues, which are hers, not the squad's.
 */
squad.delete('/players/:id', requirePermission('squad.delete'), async (c) => {
  const id = c.req.param('id');
  const clubId = c.get('clubId');
  const row = await c.env.DB.prepare(`${PLAYER_SELECT} WHERE pl.id = ? AND pl.club_id = ?`)
    .bind(id, clubId)
    .first();
  if (!row) throw notFound('Jogador não encontrado.');

  const player = mapPlayer(row);
  const history = await playerHistory(c.env.DB, id, String(row.person_id));

  if (history.total > 0) {
    await c.env.DB.prepare('UPDATE players SET status = ?, updated_at = ? WHERE id = ? AND club_id = ?')
      .bind('inativo', nowIso(), id, clubId)
      .run();
    const updated = await c.env.DB.prepare(`${PLAYER_SELECT} WHERE pl.id = ?`).bind(id).first();
    await logActivity(c.env, c.get('session'), {
      kind: 'elenco',
      title: 'Jogador inativado',
      detail: `${player.name} — histórico preservado`,
      entityType: 'player',
      entityId: id,
    });
    return c.json({ ok: true, mode: 'inativado', history, data: mapPlayer(updated!) });
  }

  await c.env.DB.prepare('DELETE FROM players WHERE id = ? AND club_id = ?').bind(id, clubId).run();
  await logActivity(c.env, c.get('session'), {
    kind: 'elenco', title: 'Jogador removido do elenco', detail: player.name,
  });
  return c.json({ ok: true, mode: 'removido', history });
});

/* ============================================================ diretoria */

const boardSchema = z.object({
  personId: z.string().trim().optional().nullable(),
  fullName: optionalText(200),
  role: requiredText('O cargo', 120),
  startDate: optionalIsoDate,
  endDate: optionalIsoDate,
  status: z.enum(['ativo', 'encerrado']).default('ativo'),
  notes: optionalText(2000),
});

squad.get('/board', requirePermission('squad.view'), async (c) => {
  const rows = await c.env.DB.prepare(`${BOARD_SELECT} WHERE b.club_id = ? ORDER BY p.full_name`)
    .bind(c.get('clubId'))
    .all();
  return c.json({ data: rows.results.map(mapBoardMember) });
});

squad.post('/board', requirePermission('squad.create'), async (c) => {
  const body = await parseBody(c.req.raw, boardSchema);
  const personId = await resolvePerson(c, body);
  const now = nowIso();
  const id = newId('brd');

  await c.env.DB.prepare(
    `INSERT INTO board_members (id, club_id, person_id, role, start_date, end_date, status, notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(id, c.get('clubId'), personId, body.role, body.startDate, body.endDate, body.status, body.notes, now, now)
    .run();

  const row = await c.env.DB.prepare(`${BOARD_SELECT} WHERE b.id = ?`).bind(id).first();
  const member = mapBoardMember(row!);
  await logActivity(c.env, c.get('session'), {
    kind: 'elenco', title: 'Membro da diretoria registrado', detail: `${member.name} — ${member.role}`,
  });
  return c.json({ data: member }, 201);
});

squad.put('/board/:id', requirePermission('squad.edit'), async (c) => {
  const body = await parseBody(c.req.raw, boardSchema);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT id FROM board_members WHERE id=? AND club_id=?')
    .bind(id, c.get('clubId'))
    .first();
  if (!existing) throw notFound('Registro não encontrado.');

  await c.env.DB.prepare(
    'UPDATE board_members SET role=?, start_date=?, end_date=?, status=?, notes=?, updated_at=? WHERE id=? AND club_id=?',
  )
    .bind(body.role, body.startDate, body.endDate, body.status, body.notes, nowIso(), id, c.get('clubId'))
    .run();

  const row = await c.env.DB.prepare(`${BOARD_SELECT} WHERE b.id = ?`).bind(id).first();
  return c.json({ data: mapBoardMember(row!) });
});

squad.delete('/board/:id', requirePermission('squad.delete'), async (c) => {
  await c.env.DB.prepare('DELETE FROM board_members WHERE id=? AND club_id=?')
    .bind(c.req.param('id'), c.get('clubId'))
    .run();
  return c.json({ ok: true });
});

/* ============================================================== comissão */

const staffSchema = z.object({
  personId: z.string().trim().optional().nullable(),
  fullName: optionalText(200),
  role: requiredText('A função', 120),
  specialty: optionalText(120),
  teamId: optionalText(60),
  startDate: optionalIsoDate,
  status: z.enum(['ativo', 'inativo']).default('ativo'),
  notes: optionalText(2000),
});

squad.get('/staff', requirePermission('squad.view'), async (c) => {
  const rows = await c.env.DB.prepare(`${STAFF_SELECT} WHERE s.club_id = ? ORDER BY p.full_name`)
    .bind(c.get('clubId'))
    .all();
  return c.json({ data: rows.results.map(mapStaffMember) });
});

squad.post('/staff', requirePermission('squad.create'), async (c) => {
  const body = await parseBody(c.req.raw, staffSchema);
  const personId = await resolvePerson(c, body);
  const now = nowIso();
  const id = newId('stf');

  await c.env.DB.prepare(
    `INSERT INTO staff_members (id, club_id, person_id, role, specialty, team_id, start_date, status, notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(id, c.get('clubId'), personId, body.role, body.specialty, body.teamId, body.startDate, body.status, body.notes, now, now)
    .run();

  const row = await c.env.DB.prepare(`${STAFF_SELECT} WHERE s.id = ?`).bind(id).first();
  const member = mapStaffMember(row!);
  await logActivity(c.env, c.get('session'), {
    kind: 'elenco', title: 'Comissão técnica atualizada', detail: `${member.name} — ${member.role}`,
  });
  return c.json({ data: member }, 201);
});

squad.put('/staff/:id', requirePermission('squad.edit'), async (c) => {
  const body = await parseBody(c.req.raw, staffSchema);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT id FROM staff_members WHERE id=? AND club_id=?')
    .bind(id, c.get('clubId'))
    .first();
  if (!existing) throw notFound('Registro não encontrado.');

  await c.env.DB.prepare(
    'UPDATE staff_members SET role=?, specialty=?, team_id=?, start_date=?, status=?, notes=?, updated_at=? WHERE id=? AND club_id=?',
  )
    .bind(body.role, body.specialty, body.teamId, body.startDate, body.status, body.notes, nowIso(), id, c.get('clubId'))
    .run();

  const row = await c.env.DB.prepare(`${STAFF_SELECT} WHERE s.id = ?`).bind(id).first();
  return c.json({ data: mapStaffMember(row!) });
});

squad.delete('/staff/:id', requirePermission('squad.delete'), async (c) => {
  await c.env.DB.prepare('DELETE FROM staff_members WHERE id=? AND club_id=?')
    .bind(c.req.param('id'), c.get('clubId'))
    .run();
  return c.json({ ok: true });
});

export default squad;
