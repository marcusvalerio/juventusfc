import { Hono } from 'hono';
import type { AppBindings, Env } from '../lib/env';
import { badRequest } from '../lib/errors';
import { checkPasswordPolicy, hashPassword } from '../lib/password';
import { generateToken, hashToken } from '../lib/session';
import { newId, nowIso } from '../lib/id';
import { logActivity } from '../lib/activity';
import { passwordResetMessage, sendMail } from '../lib/mailer';
import { parseBody, z } from '../lib/validate';

const passwordReset = new Hono<AppBindings>();

/** Short by design: long enough to reach an inbox, short enough to matter. */
const TTL_MINUTES = 30;

/** Ceiling per account per hour, counted in the database, not in memory. */
const MAX_REQUESTS_PER_HOUR = 5;

/**
 * The single answer `/forgot-password` ever gives. It has to be identical for
 * an address that has an account, one that does not, and one that has been
 * asking too often — otherwise the endpoint becomes a way to enumerate people.
 */
const GENERIC_ANSWER =
  'Se existir uma conta associada a este e-mail, enviaremos as instruções para redefinição da senha.';

const emailSchema = z.object({
  email: z
    .string({ message: 'Informe o e-mail da conta.' })
    .trim()
    .min(1, 'Informe o e-mail da conta.')
    .max(160)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Informe um e-mail válido.'),
});

const tokenSchema = z.object({
  token: z.string().trim().min(1, 'Link inválido.').max(200),
});

const resetSchema = z.object({
  token: z.string().trim().min(1, 'Link inválido.').max(200),
  password: z.string().min(1, 'Informe a nova senha.').max(200),
  confirmPassword: z.string().min(1, 'Confirme a nova senha.').max(200),
});

interface AccountRow {
  account_id: string;
  club_id: string;
  full_name: string;
  email: string;
  club_name: string;
}

interface ResetRow {
  id: string;
  account_id: string;
  club_id: string;
  full_name: string;
  expires_at: string;
  used_at: string | null;
  invalidated_at: string | null;
}

const invalidToken = () =>
  badRequest('Este link de redefinição é inválido ou já expirou. Solicite um novo.');

/**
 * Where the reset link points.
 *
 * Never derived from `Origin`, `Referer` or `Host` sent by the caller — those
 * are attacker-controlled and would turn the link into a way to harvest tokens.
 * Behind the Vercel rewrite the Worker only ever sees its own hostname, so
 * `APP_ORIGIN` has to be set for the link to reach the public domain.
 */
function appOrigin(env: Env, requestUrl: string) {
  const configured = env.APP_ORIGIN?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return new URL(requestUrl).origin;
}

async function findAccountByEmail(env: Env, email: string) {
  return env.DB.prepare(
    `SELECT a.id AS account_id, a.club_id, p.full_name, p.email, c.short_name AS club_name
       FROM accounts a
       JOIN people p ON p.id = a.person_id
       JOIN clubs  c ON c.id = a.club_id
      WHERE p.email IS NOT NULL
        AND lower(p.email) = lower(?)
        AND a.status = 'ativo'
      ORDER BY a.created_at
      LIMIT 1`,
  )
    .bind(email)
    .first<AccountRow>();
}

/**
 * Starts a recovery.
 *
 * Always answers 200 with the same message. A token is generated and hashed on
 * every call, whether or not an account was found, so the work done is close to
 * identical either way.
 */
passwordReset.post('/forgot-password', async (c) => {
  const { email } = await parseBody(c.req.raw, emailSchema);

  const token = generateToken();
  const tokenHash = await hashToken(token);
  const account = await findAccountByEmail(c.env, email);

  if (account) {
    const since = new Date(Date.now() - 3_600_000).toISOString();
    const recent = await c.env.DB.prepare(
      'SELECT COUNT(*) AS total FROM password_resets WHERE account_id = ? AND created_at > ?',
    )
      .bind(account.account_id, since)
      .first<{ total: number }>();

    if (Number(recent?.total ?? 0) < MAX_REQUESTS_PER_HOUR) {
      const now = nowIso();

      // A new request supersedes anything still outstanding for this account.
      await c.env.DB.prepare(
        `UPDATE password_resets SET invalidated_at = ?
          WHERE account_id = ? AND used_at IS NULL AND invalidated_at IS NULL`,
      )
        .bind(now, account.account_id)
        .run();

      await c.env.DB.prepare(
        `INSERT INTO password_resets (id, account_id, token_hash, created_at, expires_at, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          newId('pwr'),
          account.account_id,
          tokenHash,
          now,
          new Date(Date.now() + TTL_MINUTES * 60_000).toISOString(),
          c.req.header('User-Agent')?.slice(0, 200) ?? null,
        )
        .run();

      const url = `${appOrigin(c.env, c.req.url)}/redefinir-senha?token=${encodeURIComponent(token)}`;
      await sendMail(
        c.env,
        passwordResetMessage({
          recipient: account.email,
          displayName: account.full_name,
          clubName: account.club_name,
          resetUrl: url,
          expiresInMinutes: TTL_MINUTES,
        }),
      );
    }
  }

  return c.json({ ok: true, message: GENERIC_ANSWER });
});

async function loadReset(env: Env, token: string) {
  return env.DB.prepare(
    `SELECT r.id, r.account_id, r.expires_at, r.used_at, r.invalidated_at,
            a.club_id, p.full_name
       FROM password_resets r
       JOIN accounts a ON a.id = r.account_id
       JOIN people   p ON p.id = a.person_id
      WHERE r.token_hash = ? AND a.status = 'ativo'`,
  )
    .bind(await hashToken(token))
    .first<ResetRow>();
}

const isUsable = (row: ResetRow | null) =>
  Boolean(row) &&
  !row!.used_at &&
  !row!.invalidated_at &&
  new Date(row!.expires_at).getTime() > Date.now();

/**
 * Lets the reset screen say "this link no longer works" before asking someone
 * to type a new password twice. Only the holder of the token learns anything,
 * and what they learn is whether their own link is still good.
 */
passwordReset.post('/reset-password/check', async (c) => {
  const { token } = await parseBody(c.req.raw, tokenSchema);
  const row = await loadReset(c.env, token);
  return c.json(isUsable(row) ? { valid: true, expiresAt: row!.expires_at } : { valid: false });
});

/**
 * Applies the new password.
 *
 * The password is validated before the token is touched, so a typo does not
 * burn the link. On success the token is spent, any sibling token is dropped,
 * and every session of that account — and only that account — is revoked.
 */
passwordReset.post('/reset-password', async (c) => {
  const { token, password, confirmPassword } = await parseBody(c.req.raw, resetSchema);

  if (password !== confirmPassword) {
    throw badRequest('Dados inválidos.', { confirmPassword: 'As senhas não conferem.' });
  }
  const policy = checkPasswordPolicy(password);
  if (!policy.ok) throw badRequest('Dados inválidos.', { password: policy.message });

  const row = await loadReset(c.env, token);
  if (!isUsable(row)) throw invalidToken();
  const reset = row!;

  const now = nowIso();
  const hash = await hashPassword(password);

  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE accounts SET password_hash = ?, updated_at = ? WHERE id = ?').bind(
      hash,
      now,
      reset.account_id,
    ),
    c.env.DB.prepare('UPDATE password_resets SET used_at = ? WHERE id = ?').bind(now, reset.id),
    c.env.DB.prepare(
      `UPDATE password_resets SET invalidated_at = ?
        WHERE account_id = ? AND id != ? AND used_at IS NULL AND invalidated_at IS NULL`,
    ).bind(now, reset.account_id, reset.id),
    // Whoever was signed in with the old password is signed out everywhere.
    c.env.DB.prepare(
      'UPDATE sessions SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL',
    ).bind(now, reset.account_id),
  ]);

  await logActivity(
    c.env,
    { clubId: reset.club_id, accountId: reset.account_id, displayName: reset.full_name },
    {
      kind: 'sistema',
      title: 'Senha redefinida',
      detail: 'Redefinição concluída por link de recuperação; sessões anteriores encerradas.',
      entityType: 'account',
      entityId: reset.account_id,
    },
  );

  return c.json({ ok: true, message: 'Senha alterada com sucesso.' });
});

export default passwordReset;
