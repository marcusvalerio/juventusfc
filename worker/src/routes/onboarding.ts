import { Hono } from 'hono';
import type { AppBindings } from '../lib/env';
import { conflict, badRequest } from '../lib/errors';
import { newId, nowIso } from '../lib/id';
import { checkPasswordPolicy, hashPassword } from '../lib/password';
import { SESSION_MAX_AGE, createSession, sessionCookie } from '../lib/session';
import { parseBody, optionalText, requiredText, z } from '../lib/validate';
import { ALL_PERMISSIONS } from '../../../src/shared/permissions';
import { logActivity } from '../lib/activity';

const onboarding = new Hono<AppBindings>();

const schema = z.object({
  club: z.object({
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
  }),
  teams: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  finance: z.object({
    defaultMonthlyFee: z.coerce.number().min(0).default(0),
    defaultDueDay: z.coerce.number().int().min(1).max(31).default(10),
    paymentMethods: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
    season: optionalText(10),
  }),
  admin: z.object({
    fullName: requiredText('O nome do administrador'),
    username: z
      .string()
      .trim()
      .min(3, 'O usuário precisa ter ao menos 3 caracteres.')
      .max(40)
      .regex(/^[a-zA-Z0-9._-]+$/, 'Use apenas letras, números, ponto, hífen ou sublinhado.'),
    password: z.string().min(1, 'Informe a senha.').max(200),
    confirmPassword: z.string().min(1, 'Confirme a senha.').max(200),
    phone: optionalText(40),
    email: optionalText(160),
  }),
});

/** True while no club exists — the only moment onboarding is reachable. */
export async function clubCount(db: D1Database) {
  const row = await db.prepare('SELECT COUNT(*) AS total FROM clubs').first<{ total: number }>();
  return Number(row?.total ?? 0);
}

/**
 * Creates the club, its structure and the first administrator in one shot,
 * then signs that administrator in. Unauthenticated by necessity, so it is
 * strictly single-use: once a club exists the endpoint refuses.
 */
onboarding.post('/', async (c) => {
  if ((await clubCount(c.env.DB)) > 0) {
    throw conflict('O clube já foi configurado. Faça login para continuar.');
  }

  const body = await parseBody(c.req.raw, schema);

  if (body.admin.password !== body.admin.confirmPassword) {
    throw badRequest('Dados inválidos.', { 'admin.confirmPassword': 'As senhas não conferem.' });
  }
  const policy = checkPasswordPolicy(body.admin.password);
  if (!policy.ok) throw badRequest('Dados inválidos.', { 'admin.password': policy.message! });

  const now = nowIso();
  const clubId = newId('clb');
  const personId = newId('per');
  const accountId = newId('acc');
  const passwordHash = await hashPassword(body.admin.password);

  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(
      `INSERT INTO clubs (id, official_name, short_name, city, state, country, founded_year,
                          venue, address, phone, email, website, social,
                          primary_color, secondary_color, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).bind(
      clubId,
      body.club.officialName,
      body.club.shortName,
      body.club.city,
      body.club.state,
      body.club.country ?? 'Brasil',
      body.club.foundedYear,
      body.club.venue,
      body.club.address,
      body.club.phone,
      body.club.email,
      body.club.website,
      body.club.social,
      body.club.primaryColor,
      body.club.secondaryColor,
      now,
      now,
    ),
    c.env.DB.prepare(
      `INSERT INTO club_settings (club_id, default_monthly_fee, default_due_day, payment_methods,
                                  currency, season, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?)`,
    ).bind(
      clubId,
      body.finance.defaultMonthlyFee,
      body.finance.defaultDueDay,
      JSON.stringify(body.finance.paymentMethods),
      'BRL',
      body.finance.season,
      now,
      now,
    ),
    c.env.DB.prepare(
      `INSERT INTO people (id, club_id, full_name, phone, email, status, created_at, updated_at)
       VALUES (?,?,?,?,?,'ativo',?,?)`,
    ).bind(personId, clubId, body.admin.fullName, body.admin.phone, body.admin.email, now, now),
    c.env.DB.prepare(
      `INSERT INTO accounts (id, club_id, person_id, username, password_hash, status, is_owner, created_at, updated_at)
       VALUES (?,?,?,?,?,'ativo',1,?,?)`,
    ).bind(accountId, clubId, personId, body.admin.username, passwordHash, now, now),
  ];

  // Deduplicate team names so the UNIQUE(club_id, name) constraint cannot abort the batch.
  const uniqueTeams = [...new Set(body.teams.map((name) => name.trim()).filter(Boolean))];
  uniqueTeams.forEach((name, index) => {
    statements.push(
      c.env.DB.prepare(
        'INSERT INTO teams (id, club_id, name, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?)',
      ).bind(newId('tem'), clubId, name, index, now, now),
    );
  });

  // The first administrator receives every capability; further accounts are granted individually.
  for (const permission of ALL_PERMISSIONS) {
    statements.push(
      c.env.DB.prepare(
        'INSERT INTO account_permissions (account_id, permission, created_at) VALUES (?,?,?)',
      ).bind(accountId, permission, now),
    );
  }

  await c.env.DB.batch(statements);

  const { token } = await createSession(c.env, accountId, c.req.header('User-Agent') ?? null);
  await logActivity(
    c.env,
    { clubId, accountId, displayName: body.admin.fullName },
    { kind: 'sistema', title: 'Clube configurado', detail: `${body.club.shortName} criado na plataforma` },
  );

  c.header('Set-Cookie', sessionCookie(token, c.env.ENVIRONMENT === 'production', SESSION_MAX_AGE));
  return c.json({ clubId, accountId }, 201);
});

export default onboarding;
