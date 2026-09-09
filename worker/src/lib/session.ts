import type { Env, SessionContext } from './env';
import { newId, nowIso } from './id';

export const SESSION_COOKIE = 'jfc_session';
const SESSION_TTL_HOURS = 12;
const SLIDING_REFRESH_MINUTES = 30;

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

/** The cookie carries the token; only its SHA-256 is stored, so a DB leak is not a login. */
export async function hashToken(token: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
}

export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toHex(bytes.buffer);
}

export async function createSession(
  env: Env,
  accountId: string,
  userAgent: string | null,
): Promise<{ token: string; expiresAt: string }> {
  const token = generateToken();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3_600_000).toISOString();

  await env.DB.prepare(
    `INSERT INTO sessions (id, account_id, token_hash, created_at, expires_at, last_seen_at, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      newId('ses'),
      accountId,
      await hashToken(token),
      createdAt,
      expiresAt,
      createdAt,
      userAgent?.slice(0, 200) ?? null,
    )
    .run();

  return { token, expiresAt };
}

interface SessionRow {
  session_id: string;
  account_id: string;
  person_id: string;
  club_id: string;
  username: string;
  is_owner: number;
  account_status: string;
  full_name: string;
  expires_at: string;
  revoked_at: string | null;
  last_seen_at: string;
}

export async function resolveSession(env: Env, token: string): Promise<SessionContext | null> {
  const row = await env.DB.prepare(
    `SELECT s.id AS session_id, s.expires_at, s.revoked_at, s.last_seen_at,
            a.id AS account_id, a.person_id, a.club_id, a.username, a.is_owner,
            a.status AS account_status, p.full_name
       FROM sessions s
       JOIN accounts a ON a.id = s.account_id
       JOIN people p   ON p.id = a.person_id
      WHERE s.token_hash = ?`,
  )
    .bind(await hashToken(token))
    .first<SessionRow>();

  if (!row) return null;
  if (row.revoked_at) return null;
  if (row.account_status !== 'ativo') return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;

  // Sliding expiry, written at most twice an hour to keep writes cheap.
  const lastSeen = new Date(row.last_seen_at).getTime();
  if (Date.now() - lastSeen > SLIDING_REFRESH_MINUTES * 60_000) {
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3_600_000).toISOString();
    await env.DB.prepare('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?')
      .bind(nowIso(), expiresAt, row.session_id)
      .run();
  }

  const permissionRows = await env.DB.prepare(
    'SELECT permission FROM account_permissions WHERE account_id = ?',
  )
    .bind(row.account_id)
    .all<{ permission: string }>();

  return {
    sessionId: row.session_id,
    accountId: row.account_id,
    personId: row.person_id,
    clubId: row.club_id,
    username: row.username,
    displayName: row.full_name,
    isOwner: row.is_owner === 1,
    permissions: new Set(permissionRows.results.map((item) => item.permission)),
  };
}

export async function revokeSession(env: Env, sessionId: string) {
  await env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ?')
    .bind(nowIso(), sessionId)
    .run();
}

export function sessionCookie(token: string, isProduction: boolean, maxAgeSeconds: number) {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isProduction) parts.push('Secure');
  return parts.join('; ');
}

export function clearCookie(isProduction: boolean) {
  return sessionCookie('', isProduction, 0);
}

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

export const SESSION_MAX_AGE = SESSION_TTL_HOURS * 3600;
