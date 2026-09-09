import { Hono } from 'hono';
import type { AppBindings } from '../lib/env';
import { conflict, notFound } from '../lib/errors';
import { newId, nowIso } from '../lib/id';
import { mapPerson } from '../lib/mappers';
import { requirePermission } from '../lib/middleware';
import { logActivity } from '../lib/activity';
import { optionalIsoDate, optionalText, parseBody, requiredText, z } from '../lib/validate';

const people = new Hono<AppBindings>();

// Roles are derived from the link tables, never stored on the person.
const SELECT = `
  SELECT p.*,
         EXISTS (SELECT 1 FROM players       x WHERE x.person_id = p.id) AS is_player,
         EXISTS (SELECT 1 FROM board_members x WHERE x.person_id = p.id) AS is_board,
         EXISTS (SELECT 1 FROM staff_members x WHERE x.person_id = p.id) AS is_staff,
         EXISTS (SELECT 1 FROM accounts      x WHERE x.person_id = p.id) AS has_account
    FROM people p
`;

people.get('/', requirePermission('people.view'), async (c) => {
  const rows = await c.env.DB.prepare(`${SELECT} WHERE p.club_id = ? ORDER BY p.full_name`)
    .bind(c.get('clubId'))
    .all();
  return c.json({ data: rows.results.map(mapPerson) });
});

people.get('/:id', requirePermission('people.view'), async (c) => {
  const row = await c.env.DB.prepare(`${SELECT} WHERE p.id = ? AND p.club_id = ?`)
    .bind(c.req.param('id'), c.get('clubId'))
    .first();
  if (!row) throw notFound('Pessoa não encontrada.');
  return c.json({ data: mapPerson(row) });
});

const personSchema = z.object({
  fullName: requiredText('O nome completo'),
  nickname: optionalText(80),
  birthDate: optionalIsoDate,
  phone: optionalText(40),
  email: optionalText(160),
  document: optionalText(40),
  address: optionalText(240),
  city: optionalText(120),
  status: z.enum(['ativo', 'inativo']).default('ativo'),
  notes: optionalText(2000),
});

people.post('/', requirePermission('people.create'), async (c) => {
  const body = await parseBody(c.req.raw, personSchema);
  const clubId = c.get('clubId');
  const now = nowIso();
  const id = newId('per');

  await c.env.DB.prepare(
    `INSERT INTO people (id, club_id, full_name, nickname, birth_date, phone, email, document,
                         address, city, status, notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      id,
      clubId,
      body.fullName,
      body.nickname,
      body.birthDate,
      body.phone,
      body.email,
      body.document,
      body.address,
      body.city,
      body.status,
      body.notes,
      now,
      now,
    )
    .run();

  await logActivity(c.env, c.get('session'), {
    kind: 'elenco',
    title: 'Pessoa cadastrada',
    detail: body.fullName,
    entityType: 'person',
    entityId: id,
  });

  const row = await c.env.DB.prepare(`${SELECT} WHERE p.id = ?`).bind(id).first();
  return c.json({ data: mapPerson(row!) }, 201);
});

people.put('/:id', requirePermission('people.edit'), async (c) => {
  const body = await parseBody(c.req.raw, personSchema);
  const id = c.req.param('id');
  const clubId = c.get('clubId');

  const existing = await c.env.DB.prepare('SELECT id FROM people WHERE id = ? AND club_id = ?')
    .bind(id, clubId)
    .first();
  if (!existing) throw notFound('Pessoa não encontrada.');

  await c.env.DB.prepare(
    `UPDATE people SET full_name=?, nickname=?, birth_date=?, phone=?, email=?, document=?,
                       address=?, city=?, status=?, notes=?, updated_at=?
      WHERE id=? AND club_id=?`,
  )
    .bind(
      body.fullName,
      body.nickname,
      body.birthDate,
      body.phone,
      body.email,
      body.document,
      body.address,
      body.city,
      body.status,
      body.notes,
      nowIso(),
      id,
      clubId,
    )
    .run();

  await logActivity(c.env, c.get('session'), {
    kind: 'elenco',
    title: 'Pessoa atualizada',
    detail: body.fullName,
    entityType: 'person',
    entityId: id,
  });

  const row = await c.env.DB.prepare(`${SELECT} WHERE p.id = ?`).bind(id).first();
  return c.json({ data: mapPerson(row!) });
});

people.delete('/:id', requirePermission('people.delete'), async (c) => {
  const id = c.req.param('id');
  const clubId = c.get('clubId');

  const row = await c.env.DB.prepare(`${SELECT} WHERE p.id = ? AND p.club_id = ?`)
    .bind(id, clubId)
    .first();
  if (!row) throw notFound('Pessoa não encontrada.');

  // Deleting a person would cascade into squad rows and their history, so the
  // link has to be removed deliberately first.
  const person = mapPerson(row);
  if (person.roles.length > 0) {
    throw conflict(
      'Esta pessoa possui vínculos ativos. Remova o vínculo de jogador, diretoria ou comissão antes de excluir.',
      { roles: person.roles },
    );
  }
  if (person.hasAccount) {
    throw conflict('Esta pessoa possui uma conta de acesso. Remova a conta antes de excluir.');
  }

  await c.env.DB.prepare('DELETE FROM people WHERE id = ? AND club_id = ?').bind(id, clubId).run();
  await logActivity(c.env, c.get('session'), {
    kind: 'elenco',
    title: 'Pessoa excluída',
    detail: person.fullName,
  });
  return c.json({ ok: true });
});

export default people;
