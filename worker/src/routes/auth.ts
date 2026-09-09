import { Hono } from 'hono';
import type { AppBindings } from '../lib/env';
import { ApiError, unauthorized } from '../lib/errors';
import { verifyPassword } from '../lib/password';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  clearCookie,
  createSession,
  readCookie,
  resolveSession,
  revokeSession,
  sessionCookie,
} from '../lib/session';
import { nowIso } from '../lib/id';
import { parseBody, z } from '../lib/validate';
import { requireSession } from '../lib/middleware';

const auth = new Hono<AppBindings>();

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Informe o usuário.').max(80),
  password: z.string().min(1, 'Informe a senha.').max(200),
});

interface AccountRow {
  id: string;
  club_id: string;
  password_hash: string;
  status: string;
}

/**
 * Login by username and password — e-mail is not required to sign in.
 * Failures always answer with the same message and status so the response
 * cannot be used to discover which usernames exist.
 */
auth.post('/login', async (c) => {
  const { username, password } = await parseBody(c.req.raw, loginSchema);

  const account = await c.env.DB.prepare(
    'SELECT id, club_id, password_hash, status FROM accounts WHERE username = ?',
  )
    .bind(username)
    .first<AccountRow>();

  const invalid = new ApiError(401, 'invalid_credentials', 'Usuário ou senha incorretos.');

  if (!account) {
    // Spend comparable time on a missing user so timing does not reveal it.
    await verifyPassword(password, 'pbkdf2$sha256$210000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=');
    throw invalid;
  }
  if (!(await verifyPassword(password, account.password_hash))) throw invalid;
  if (account.status !== 'ativo') {
    throw new ApiError(403, 'account_suspended', 'Esta conta está suspensa.');
  }

  const { token } = await createSession(c.env, account.id, c.req.header('User-Agent') ?? null);
  await c.env.DB.prepare('UPDATE accounts SET last_login_at = ?, updated_at = ? WHERE id = ?')
    .bind(nowIso(), nowIso(), account.id)
    .run();

  const session = await resolveSession(c.env, token);
  if (!session) throw unauthorized();

  c.header(
    'Set-Cookie',
    sessionCookie(token, c.env.ENVIRONMENT === 'production', SESSION_MAX_AGE),
  );
  return c.json({
    account: {
      id: session.accountId,
      username: session.username,
      displayName: session.displayName,
      personId: session.personId,
      isOwner: session.isOwner,
      permissions: [...session.permissions],
    },
  });
});

auth.post('/logout', async (c) => {
  const token = readCookie(c.req.header('Cookie') ?? null, SESSION_COOKIE);
  if (token) {
    const session = await resolveSession(c.env, token);
    if (session) await revokeSession(c.env, session.sessionId);
  }
  c.header('Set-Cookie', clearCookie(c.env.ENVIRONMENT === 'production'));
  return c.json({ ok: true });
});

/** Current session, used by the SPA to restore state after a refresh. */
auth.get('/session', requireSession, (c) => {
  const session = c.get('session');
  return c.json({
    account: {
      id: session.accountId,
      username: session.username,
      displayName: session.displayName,
      personId: session.personId,
      isOwner: session.isOwner,
      permissions: [...session.permissions],
    },
  });
});

/** Revokes every other session of the signed-in account. */
auth.post('/logout-all', requireSession, async (c) => {
  const session = c.get('session');
  await c.env.DB.prepare(
    'UPDATE sessions SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL',
  )
    .bind(nowIso(), session.accountId)
    .run();
  c.header('Set-Cookie', clearCookie(c.env.ENVIRONMENT === 'production'));
  return c.json({ ok: true });
});

export default auth;
