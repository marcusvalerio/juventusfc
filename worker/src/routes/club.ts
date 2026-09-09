import { Hono, type Context } from 'hono';
import type { AppBindings } from '../lib/env';
import { notFound } from '../lib/errors';
import { newId, nowIso } from '../lib/id';
import { mapClub, mapSettings, mapTeam } from '../lib/mappers';
import { requirePermission } from '../lib/middleware';
import { parseBody, optionalText, requiredText, z } from '../lib/validate';
import { logActivity } from '../lib/activity';

const club = new Hono<AppBindings>();

async function loadClub(c: Context<AppBindings>) {
  const clubId = c.get('clubId');
  const row = await c.env.DB.prepare('SELECT * FROM clubs WHERE id = ?').bind(clubId).first();
  if (!row) throw notFound('Clube não encontrado.');

  const settings = await c.env.DB.prepare('SELECT * FROM club_settings WHERE club_id = ?')
    .bind(clubId)
    .first();
  const teams = await c.env.DB.prepare(
    'SELECT * FROM teams WHERE club_id = ? ORDER BY sort_order, name',
  )
    .bind(clubId)
    .all();

  return {
    club: mapClub(row),
    settings: settings ? mapSettings(settings) : null,
    teams: teams.results.map(mapTeam),
  };
}

club.get('/', async (c) => c.json(await loadClub(c)));

const clubSchema = z.object({
  officialName: requiredText('O nome oficial'),
  shortName: requiredText('O nome curto', 80),
  city: optionalText(120),
  state: optionalText(80),
  country: optionalText(80),
  foundedYear: optionalText(10),
  venue: optionalText(160),
  address: optionalText(240),
  phone: optionalText(40),
  email: optionalText(160),
  website: optionalText(200),
  social: optionalText(200),
  primaryColor: optionalText(40),
  secondaryColor: optionalText(40),
});

club.put('/', requirePermission('settings.edit'), async (c) => {
  const body = await parseBody(c.req.raw, clubSchema);
  const clubId = c.get('clubId');

  await c.env.DB.prepare(
    `UPDATE clubs SET official_name=?, short_name=?, city=?, state=?, country=?, founded_year=?,
                      venue=?, address=?, phone=?, email=?, website=?, social=?,
                      primary_color=?, secondary_color=?, updated_at=?
      WHERE id = ?`,
  )
    .bind(
      body.officialName,
      body.shortName,
      body.city,
      body.state,
      body.country,
      body.foundedYear,
      body.venue,
      body.address,
      body.phone,
      body.email,
      body.website,
      body.social,
      body.primaryColor,
      body.secondaryColor,
      nowIso(),
      clubId,
    )
    .run();

  await logActivity(c.env, c.get('session'), {
    kind: 'sistema',
    title: 'Dados do clube atualizados',
    detail: body.officialName,
  });
  return c.json(await loadClub(c));
});

const settingsSchema = z.object({
  defaultMonthlyFee: z.coerce.number().min(0),
  defaultDueDay: z.coerce.number().int().min(1).max(31),
  paymentMethods: z.array(z.string().trim().min(1).max(40)).max(12),
  season: optionalText(10),
  lowStockAlerts: z.boolean().default(true),
  dueReminders: z.boolean().default(true),
});

club.put('/settings', requirePermission('settings.edit'), async (c) => {
  const body = await parseBody(c.req.raw, settingsSchema);
  const clubId = c.get('clubId');

  await c.env.DB.prepare(
    `UPDATE club_settings
        SET default_monthly_fee=?, default_due_day=?, payment_methods=?, season=?,
            low_stock_alerts=?, due_reminders=?, updated_at=?
      WHERE club_id = ?`,
  )
    .bind(
      body.defaultMonthlyFee,
      body.defaultDueDay,
      JSON.stringify(body.paymentMethods),
      body.season,
      body.lowStockAlerts ? 1 : 0,
      body.dueReminders ? 1 : 0,
      nowIso(),
      clubId,
    )
    .run();

  return c.json(await loadClub(c));
});

/* --------------------------------------------------------------- teams */

const teamSchema = z.object({ name: requiredText('O nome da categoria', 80) });

club.post('/teams', requirePermission('settings.edit'), async (c) => {
  const body = await parseBody(c.req.raw, teamSchema);
  const clubId = c.get('clubId');
  const now = nowIso();
  const id = newId('tem');

  const existing = await c.env.DB.prepare(
    'SELECT COUNT(*) AS total FROM teams WHERE club_id = ?',
  )
    .bind(clubId)
    .first<{ total: number }>();

  await c.env.DB.prepare(
    'INSERT INTO teams (id, club_id, name, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  )
    .bind(id, clubId, body.name, Number(existing?.total ?? 0), now, now)
    .run();

  return c.json(await loadClub(c), 201);
});

club.delete('/teams/:id', requirePermission('settings.edit'), async (c) => {
  await c.env.DB.prepare('DELETE FROM teams WHERE id = ? AND club_id = ?')
    .bind(c.req.param('id'), c.get('clubId'))
    .run();
  return c.json(await loadClub(c));
});

export default club;
