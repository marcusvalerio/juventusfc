import { Hono } from 'hono';
import type { AppBindings } from '../lib/env';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors';
import { newId, nowIso } from '../lib/id';
import { checkPasswordPolicy, hashPassword, verifyPassword } from '../lib/password';
import { requirePermission } from '../lib/middleware';
import { logActivity } from '../lib/activity';
import { parseBody, requiredText, z } from '../lib/validate';
import { ALL_PERMISSIONS, isValidPermission } from '../../../src/shared/permissions';

const accounts = new Hono<AppBindings>();

const usernameSchema = z
  .string()
  .trim()
  .min(3, 'O usuário precisa ter ao menos 3 caracteres.')
  .max(40)
  .regex(/^[a-zA-Z0-9._-]+$/, 'Use apenas letras, números, ponto, hífen ou sublinhado.');

accounts.get('/', requirePermission('accounts.view'), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT a.id, a.username, a.status, a.is_owner, a.last_login_at, a.created_at,
            a.person_id, p.full_name
       FROM accounts a JOIN people p ON p.id = a.person_id
      WHERE a.club_id = ? ORDER BY p.full_name`,
  ).bind(c.get('clubId')).all();

  const permissions = await c.env.DB.prepare(
    `SELECT ap.account_id, ap.permission FROM account_permissions ap
       JOIN accounts a ON a.id = ap.account_id WHERE a.club_id = ?`,
  ).bind(c.get('clubId')).all<{ account_id: string; permission: string }>();

  const byAccount = new Map<string, string[]>();
  for (const row of permissions.results) {
    byAccount.set(row.account_id, [...(byAccount.get(row.account_id) ?? []), row.permission]);
  }

  return c.json({
    data: rows.results.map((row: any) => ({
      id: String(row.id),
      username: String(row.username),
      personId: String(row.person_id),
      name: String(row.full_name),
      status: String(row.status),
      isOwner: row.is_owner === 1,
      lastLoginAt: row.last_login_at ? String(row.last_login_at) : undefined,
      createdAt: String(row.created_at),
      permissions: byAccount.get(String(row.id)) ?? [],
    })),
  });
});

const createSchema = z.object({
  personId: requiredText('A pessoa', 60),
  username: usernameSchema,
  password: z.string().min(1, 'Informe a senha.').max(200),
  permissions: z.array(z.string()).max(ALL_PERMISSIONS.length).default([]),
});

accounts.post('/', requirePermission('accounts.manage'), async (c) => {
  const body = await parseBody(c.req.raw, createSchema);
  const clubId = c.get('clubId');

  // The whole payload is validated before any conflict lookup, so a malformed
  // request always answers 400 regardless of the state of the database.
  const policy = checkPasswordPolicy(body.password);
  if (!policy.ok) throw badRequest('Dados inválidos.', { password: policy.message! });

  const invalid = body.permissions.filter((permission) => !isValidPermission(permission));
  if (invalid.length > 0) throw badRequest('Autorização desconhecida.', { permissions: invalid.join(', ') });

  const person = await c.env.DB.prepare('SELECT id FROM people WHERE id=? AND club_id=?')
    .bind(body.personId, clubId).first();
  if (!person) throw notFound('Pessoa não encontrada.');

  const existingForPerson = await c.env.DB.prepare('SELECT id FROM accounts WHERE person_id=?')
    .bind(body.personId).first();
  if (existingForPerson) throw conflict('Esta pessoa já possui uma conta de acesso.');

  const existingUsername = await c.env.DB.prepare('SELECT id FROM accounts WHERE username=?')
    .bind(body.username).first();
  if (existingUsername) throw conflict('Este nome de usuário já está em uso.');

  const now = nowIso();
  const id = newId('acc');
  const statements = [
    c.env.DB.prepare(
      `INSERT INTO accounts (id, club_id, person_id, username, password_hash, status, is_owner, created_at, updated_at)
       VALUES (?,?,?,?,?,'ativo',0,?,?)`,
    ).bind(id, clubId, body.personId, body.username, await hashPassword(body.password), now, now),
    ...body.permissions.map((permission) =>
      c.env.DB.prepare(
        'INSERT INTO account_permissions (account_id, permission, created_at) VALUES (?,?,?)',
      ).bind(id, permission, now),
    ),
  ];
  await c.env.DB.batch(statements);

  await logActivity(c.env, c.get('session'), {
    kind: 'sistema', title: 'Conta de acesso criada', detail: body.username,
  });
  return c.json({ id }, 201);
});

accounts.put('/:id/permissions', requirePermission('accounts.manage'), async (c) => {
  const body = await parseBody(c.req.raw, z.object({ permissions: z.array(z.string()) }));
  const id = c.req.param('id');
  const clubId = c.get('clubId');

  const account = await c.env.DB.prepare('SELECT id, is_owner FROM accounts WHERE id=? AND club_id=?')
    .bind(id, clubId).first<{ id: string; is_owner: number }>();
  if (!account) throw notFound('Conta não encontrada.');
  if (account.is_owner === 1) {
    throw forbidden('A conta proprietária mantém todas as autorizações.');
  }

  const invalid = body.permissions.filter((permission) => !isValidPermission(permission));
  if (invalid.length > 0) throw badRequest('Autorização desconhecida.', { permissions: invalid.join(', ') });

  const now = nowIso();
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM account_permissions WHERE account_id = ?').bind(id),
    ...[...new Set(body.permissions)].map((permission) =>
      c.env.DB.prepare(
        'INSERT INTO account_permissions (account_id, permission, created_at) VALUES (?,?,?)',
      ).bind(id, permission, now),
    ),
  ]);

  await logActivity(c.env, c.get('session'), {
    kind: 'sistema', title: 'Autorizações atualizadas', detail: `${body.permissions.length} permissões`,
  });
  return c.json({ ok: true });
});

/** Password change for the signed-in account; the current password is required. */
accounts.post('/me/password', async (c) => {
  const body = await parseBody(
    c.req.raw,
    z.object({
      currentPassword: z.string().min(1, 'Informe a senha atual.'),
      newPassword: z.string().min(1, 'Informe a nova senha.'),
    }),
  );
  const session = c.get('session');

  const account = await c.env.DB.prepare('SELECT password_hash FROM accounts WHERE id = ?')
    .bind(session.accountId).first<{ password_hash: string }>();
  if (!account || !(await verifyPassword(body.currentPassword, account.password_hash))) {
    throw badRequest('Dados inválidos.', { currentPassword: 'Senha atual incorreta.' });
  }

  const policy = checkPasswordPolicy(body.newPassword);
  if (!policy.ok) throw badRequest('Dados inválidos.', { newPassword: policy.message! });

  await c.env.DB.prepare('UPDATE accounts SET password_hash=?, updated_at=? WHERE id=?')
    .bind(await hashPassword(body.newPassword), nowIso(), session.accountId)
    .run();

  // Every other session is dropped so a stolen cookie cannot outlive the change.
  await c.env.DB.prepare(
    'UPDATE sessions SET revoked_at=? WHERE account_id=? AND id<>? AND revoked_at IS NULL',
  ).bind(nowIso(), session.accountId, session.sessionId).run();

  return c.json({ ok: true });
});

accounts.delete('/:id', requirePermission('accounts.manage'), async (c) => {
  const id = c.req.param('id');
  const account = await c.env.DB.prepare('SELECT is_owner FROM accounts WHERE id=? AND club_id=?')
    .bind(id, c.get('clubId')).first<{ is_owner: number }>();
  if (!account) throw notFound('Conta não encontrada.');
  if (account.is_owner === 1) throw forbidden('A conta proprietária não pode ser excluída.');
  if (id === c.get('session').accountId) throw forbidden('Você não pode excluir a própria conta.');

  await c.env.DB.prepare('DELETE FROM accounts WHERE id=? AND club_id=?')
    .bind(id, c.get('clubId')).run();
  return c.json({ ok: true });
});

export default accounts;
