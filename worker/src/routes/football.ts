import { Hono } from 'hono';
import type { AppBindings } from '../lib/env';
import { notFound } from '../lib/errors';
import { newId, nowIso } from '../lib/id';
import { mapCompetition, mapMatch, mapTraining } from '../lib/mappers';
import { requirePermission } from '../lib/middleware';
import { logActivity } from '../lib/activity';
import { isoDate, optionalText, parseBody, requiredText, timeOfDay, z } from '../lib/validate';

const football = new Hono<AppBindings>();

const COMPETITION_SELECT = `
  SELECT cp.*, t.name AS team_name
    FROM competitions cp
    LEFT JOIN teams t ON t.id = cp.team_id
`;

const MATCH_SELECT = `
  SELECT m.*, t.name AS team_name, cp.name AS competition_name
    FROM matches m
    LEFT JOIN teams t ON t.id = m.team_id
    LEFT JOIN competitions cp ON cp.id = m.competition_id
`;

const TRAINING_SELECT = `
  SELECT tr.*, t.name AS team_name, p.full_name AS responsible_name
    FROM trainings tr
    LEFT JOIN teams t ON t.id = tr.team_id
    LEFT JOIN staff_members s ON s.id = tr.responsible_id
    LEFT JOIN people p ON p.id = s.person_id
`;

/* ========================================================= competitions */

const competitionSchema = z.object({
  name: requiredText('O nome do campeonato'),
  season: optionalText(10),
  organizer: optionalText(160),
  teamId: optionalText(60),
  status: z.enum(['planejado', 'em andamento', 'encerrado']).default('planejado'),
  format: optionalText(160),
  notes: optionalText(2000),
});

football.get('/competitions', requirePermission('football.view'), async (c) => {
  const rows = await c.env.DB.prepare(`${COMPETITION_SELECT} WHERE cp.club_id = ? ORDER BY cp.season DESC, cp.name`)
    .bind(c.get('clubId'))
    .all();
  return c.json({ data: rows.results.map(mapCompetition) });
});

football.post('/competitions', requirePermission('football.create'), async (c) => {
  const body = await parseBody(c.req.raw, competitionSchema);
  const now = nowIso();
  const id = newId('cmp');
  await c.env.DB.prepare(
    `INSERT INTO competitions (id, club_id, name, season, organizer, team_id, status, format, notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(id, c.get('clubId'), body.name, body.season, body.organizer, body.teamId, body.status, body.format, body.notes, now, now)
    .run();

  await logActivity(c.env, c.get('session'), { kind: 'futebol', title: 'Campeonato cadastrado', detail: body.name });
  const row = await c.env.DB.prepare(`${COMPETITION_SELECT} WHERE cp.id = ?`).bind(id).first();
  return c.json({ data: mapCompetition(row!) }, 201);
});

football.put('/competitions/:id', requirePermission('football.edit'), async (c) => {
  const body = await parseBody(c.req.raw, competitionSchema);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT id FROM competitions WHERE id=? AND club_id=?')
    .bind(id, c.get('clubId')).first();
  if (!existing) throw notFound('Campeonato não encontrado.');

  await c.env.DB.prepare(
    'UPDATE competitions SET name=?, season=?, organizer=?, team_id=?, status=?, format=?, notes=?, updated_at=? WHERE id=? AND club_id=?',
  )
    .bind(body.name, body.season, body.organizer, body.teamId, body.status, body.format, body.notes, nowIso(), id, c.get('clubId'))
    .run();

  const row = await c.env.DB.prepare(`${COMPETITION_SELECT} WHERE cp.id = ?`).bind(id).first();
  return c.json({ data: mapCompetition(row!) });
});

football.delete('/competitions/:id', requirePermission('football.delete'), async (c) => {
  await c.env.DB.prepare('DELETE FROM competitions WHERE id=? AND club_id=?')
    .bind(c.req.param('id'), c.get('clubId')).run();
  return c.json({ ok: true });
});

/* =============================================================== matches */

const matchSchema = z.object({
  date: isoDate,
  time: timeOfDay.default('15:00'),
  opponent: requiredText('O adversário'),
  location: optionalText(200),
  venue: z.enum(['mandante', 'visitante']).default('mandante'),
  competitionId: optionalText(60),
  teamId: optionalText(60),
  status: z.enum(['agendado', 'confirmado', 'encerrado', 'adiado', 'cancelado']).default('agendado'),
  goalsFor: z.union([z.coerce.number().int().min(0), z.literal('')]).optional().nullable()
    .transform((v) => (v === '' || v == null ? null : Number(v))),
  goalsAgainst: z.union([z.coerce.number().int().min(0), z.literal('')]).optional().nullable()
    .transform((v) => (v === '' || v == null ? null : Number(v))),
  notes: optionalText(2000),
});

football.get('/matches', requirePermission('football.view'), async (c) => {
  const rows = await c.env.DB.prepare(`${MATCH_SELECT} WHERE m.club_id = ? ORDER BY m.match_date DESC, m.match_time`)
    .bind(c.get('clubId'))
    .all();
  return c.json({ data: rows.results.map(mapMatch) });
});

football.post('/matches', requirePermission('football.create'), async (c) => {
  const body = await parseBody(c.req.raw, matchSchema);
  const now = nowIso();
  const id = newId('mtc');
  await c.env.DB.prepare(
    `INSERT INTO matches (id, club_id, match_date, match_time, opponent, location, venue,
                          competition_id, team_id, status, goals_for, goals_against, notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(id, c.get('clubId'), body.date, body.time, body.opponent, body.location, body.venue,
      body.competitionId, body.teamId, body.status, body.goalsFor, body.goalsAgainst, body.notes, now, now)
    .run();

  await logActivity(c.env, c.get('session'), {
    kind: 'futebol', title: 'Partida cadastrada', detail: `${body.opponent} — ${body.date}`,
  });
  const row = await c.env.DB.prepare(`${MATCH_SELECT} WHERE m.id = ?`).bind(id).first();
  return c.json({ data: mapMatch(row!) }, 201);
});

football.put('/matches/:id', requirePermission('football.edit'), async (c) => {
  const body = await parseBody(c.req.raw, matchSchema);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT id FROM matches WHERE id=? AND club_id=?')
    .bind(id, c.get('clubId')).first();
  if (!existing) throw notFound('Partida não encontrada.');

  await c.env.DB.prepare(
    `UPDATE matches SET match_date=?, match_time=?, opponent=?, location=?, venue=?, competition_id=?,
                        team_id=?, status=?, goals_for=?, goals_against=?, notes=?, updated_at=?
      WHERE id=? AND club_id=?`,
  )
    .bind(body.date, body.time, body.opponent, body.location, body.venue, body.competitionId,
      body.teamId, body.status, body.goalsFor, body.goalsAgainst, body.notes, nowIso(), id, c.get('clubId'))
    .run();

  const row = await c.env.DB.prepare(`${MATCH_SELECT} WHERE m.id = ?`).bind(id).first();
  return c.json({ data: mapMatch(row!) });
});

football.delete('/matches/:id', requirePermission('football.delete'), async (c) => {
  await c.env.DB.prepare('DELETE FROM matches WHERE id=? AND club_id=?')
    .bind(c.req.param('id'), c.get('clubId')).run();
  return c.json({ ok: true });
});

/* ============================================================= trainings */

const trainingSchema = z.object({
  date: isoDate,
  time: timeOfDay.default('19:30'),
  location: optionalText(200),
  teamId: optionalText(60),
  responsibleId: optionalText(60),
  type: requiredText('O tipo de treino', 60),
  status: z.enum(['agendado', 'realizado', 'cancelado']).default('agendado'),
  notes: optionalText(2000),
});

football.get('/trainings', requirePermission('football.view'), async (c) => {
  const rows = await c.env.DB.prepare(`${TRAINING_SELECT} WHERE tr.club_id = ? ORDER BY tr.training_date DESC, tr.training_time`)
    .bind(c.get('clubId'))
    .all();
  return c.json({ data: rows.results.map(mapTraining) });
});

football.post('/trainings', requirePermission('football.create'), async (c) => {
  const body = await parseBody(c.req.raw, trainingSchema);
  const now = nowIso();
  const id = newId('trn');
  await c.env.DB.prepare(
    `INSERT INTO trainings (id, club_id, training_date, training_time, location, team_id,
                            responsible_id, type, status, notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(id, c.get('clubId'), body.date, body.time, body.location, body.teamId,
      body.responsibleId, body.type, body.status, body.notes, now, now)
    .run();

  await logActivity(c.env, c.get('session'), {
    kind: 'futebol', title: 'Treino agendado', detail: `${body.type} — ${body.date}`,
  });
  const row = await c.env.DB.prepare(`${TRAINING_SELECT} WHERE tr.id = ?`).bind(id).first();
  return c.json({ data: mapTraining(row!) }, 201);
});

football.put('/trainings/:id', requirePermission('football.edit'), async (c) => {
  const body = await parseBody(c.req.raw, trainingSchema);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT id FROM trainings WHERE id=? AND club_id=?')
    .bind(id, c.get('clubId')).first();
  if (!existing) throw notFound('Treino não encontrado.');

  await c.env.DB.prepare(
    `UPDATE trainings SET training_date=?, training_time=?, location=?, team_id=?, responsible_id=?,
                          type=?, status=?, notes=?, updated_at=? WHERE id=? AND club_id=?`,
  )
    .bind(body.date, body.time, body.location, body.teamId, body.responsibleId,
      body.type, body.status, body.notes, nowIso(), id, c.get('clubId'))
    .run();

  const row = await c.env.DB.prepare(`${TRAINING_SELECT} WHERE tr.id = ?`).bind(id).first();
  return c.json({ data: mapTraining(row!) });
});

football.delete('/trainings/:id', requirePermission('football.delete'), async (c) => {
  await c.env.DB.prepare('DELETE FROM trainings WHERE id=? AND club_id=?')
    .bind(c.req.param('id'), c.get('clubId')).run();
  return c.json({ ok: true });
});

/* =============================================================== lineups */

const lineupSchema = z.object({
  matchId: requiredText('A partida', 60),
  formation: requiredText('A formação', 20),
  notes: optionalText(2000),
  entries: z
    .array(
      z.object({
        playerId: z.string().trim().min(1),
        slot: z.enum(['titular', 'reserva']).default('titular'),
        position: optionalText(60),
        shirtNumber: z.coerce.number().int().min(1).max(99).optional().nullable(),
      }),
    )
    .max(40)
    .default([]),
  staffIds: z.array(z.string().trim().min(1)).max(20).default([]),
});

async function loadLineup(c: any, id: string) {
  const row = await c.env.DB.prepare('SELECT * FROM lineups WHERE id = ? AND club_id = ?')
    .bind(id, c.get('clubId'))
    .first();
  if (!row) throw notFound('Escalação não encontrada.');

  const entries = await c.env.DB.prepare(
    `SELECT e.*, p.full_name, p.nickname
       FROM lineup_entries e
       JOIN players pl ON pl.id = e.player_id
       JOIN people p ON p.id = pl.person_id
      WHERE e.lineup_id = ? ORDER BY e.sort_order`,
  ).bind(id).all();

  const staff = await c.env.DB.prepare(
    `SELECT s.id, p.full_name FROM lineup_staff ls
       JOIN staff_members s ON s.id = ls.staff_id
       JOIN people p ON p.id = s.person_id
      WHERE ls.lineup_id = ?`,
  ).bind(id).all();

  return {
    id: String(row.id),
    matchId: String(row.match_id),
    formation: String(row.formation),
    notes: row.notes == null ? undefined : String(row.notes),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    entries: entries.results.map((entry: any) => ({
      playerId: String(entry.player_id),
      playerName: String(entry.full_name),
      playerNickname: entry.nickname == null ? undefined : String(entry.nickname),
      slot: String(entry.slot),
      position: entry.position == null ? undefined : String(entry.position),
      shirtNumber: entry.shirt_number == null ? undefined : Number(entry.shirt_number),
    })),
    staff: staff.results.map((item: any) => ({ id: String(item.id), name: String(item.full_name) })),
  };
}

football.get('/lineups', requirePermission('football.view'), async (c) => {
  const rows = await c.env.DB.prepare('SELECT id FROM lineups WHERE club_id = ? ORDER BY created_at DESC')
    .bind(c.get('clubId'))
    .all<{ id: string }>();
  const data = [];
  for (const row of rows.results) data.push(await loadLineup(c, row.id));
  return c.json({ data });
});

football.post('/lineups', requirePermission('football.create'), async (c) => {
  const body = await parseBody(c.req.raw, lineupSchema);
  const clubId = c.get('clubId');

  const match = await c.env.DB.prepare('SELECT id FROM matches WHERE id=? AND club_id=?')
    .bind(body.matchId, clubId).first();
  if (!match) throw notFound('Partida não encontrada.');

  const existing = await c.env.DB.prepare('SELECT id FROM lineups WHERE match_id = ?')
    .bind(body.matchId).first<{ id: string }>();

  const now = nowIso();
  const id = existing?.id ?? newId('lnp');

  const statements: D1PreparedStatement[] = [];
  if (existing) {
    statements.push(
      c.env.DB.prepare('UPDATE lineups SET formation=?, notes=?, updated_at=? WHERE id=?')
        .bind(body.formation, body.notes, now, id),
      c.env.DB.prepare('DELETE FROM lineup_entries WHERE lineup_id=?').bind(id),
      c.env.DB.prepare('DELETE FROM lineup_staff WHERE lineup_id=?').bind(id),
    );
  } else {
    statements.push(
      c.env.DB.prepare(
        'INSERT INTO lineups (id, club_id, match_id, formation, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
      ).bind(id, clubId, body.matchId, body.formation, body.notes, now, now),
    );
  }

  body.entries.forEach((entry, index) => {
    statements.push(
      c.env.DB.prepare(
        'INSERT INTO lineup_entries (lineup_id, player_id, slot, position, shirt_number, sort_order) VALUES (?,?,?,?,?,?)',
      ).bind(id, entry.playerId, entry.slot, entry.position ?? null, entry.shirtNumber ?? null, index),
    );
  });
  for (const staffId of [...new Set(body.staffIds)]) {
    statements.push(
      c.env.DB.prepare('INSERT INTO lineup_staff (lineup_id, staff_id) VALUES (?,?)').bind(id, staffId),
    );
  }

  await c.env.DB.batch(statements);
  await logActivity(c.env, c.get('session'), {
    kind: 'futebol', title: 'Escalação publicada', detail: `Formação ${body.formation}`,
  });
  return c.json({ data: await loadLineup(c, id) }, existing ? 200 : 201);
});

football.delete('/lineups/:id', requirePermission('football.delete'), async (c) => {
  await c.env.DB.prepare('DELETE FROM lineups WHERE id=? AND club_id=?')
    .bind(c.req.param('id'), c.get('clubId')).run();
  return c.json({ ok: true });
});

export default football;
