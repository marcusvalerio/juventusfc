import type { MiddlewareHandler } from 'hono';
import type { AppBindings } from './env';
import { forbidden, unauthorized } from './errors';
import { SESSION_COOKIE, readCookie, resolveSession } from './session';

/**
 * Attaches the session to the request context. Every mutating route sits behind
 * this; the club id always comes from the session, never from the payload, so a
 * client cannot address another organisation's rows.
 */
export const requireSession: MiddlewareHandler<AppBindings> = async (c, next) => {
  const token = readCookie(c.req.header('Cookie') ?? null, SESSION_COOKIE);
  if (!token) throw unauthorized();

  const session = await resolveSession(c.env, token);
  if (!session) throw unauthorized();

  c.set('session', session);
  c.set('clubId', session.clubId);
  await next();
};

/** Authorisation is checked server-side on every route that needs it. */
export const requirePermission =
  (permission: string): MiddlewareHandler<AppBindings> =>
  async (c, next) => {
    const session = c.get('session');
    if (!session) throw unauthorized();
    if (!session.isOwner && !session.permissions.has(permission)) {
      throw forbidden(`Autorização necessária: ${permission}.`);
    }
    await next();
  };

/** Denies caching of authenticated API responses. */
export const noStore: MiddlewareHandler<AppBindings> = async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store');
};
