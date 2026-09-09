import { Hono } from 'hono';
import type { AppBindings } from './lib/env';
import { ApiError, errorResponse, notFound } from './lib/errors';
import { noStore, requireSession } from './lib/middleware';
import { SESSION_COOKIE, readCookie, resolveSession } from './lib/session';
import auth from './routes/auth';
import onboarding, { clubCount } from './routes/onboarding';
import club from './routes/club';
import people from './routes/people';
import squad from './routes/squad';
import football from './routes/football';
import finance from './routes/finance';
import inventory from './routes/inventory';
import dashboard from './routes/dashboard';
import accounts from './routes/accounts';
import exportsRoutes from './routes/exports';

const app = new Hono<AppBindings>();

app.use('/api/*', noStore);

/**
 * Entry point for the SPA before anything else is known: says whether the
 * instance still needs onboarding and, when a cookie is present, who is signed
 * in. Deliberately anonymous — it is the only way the client can learn that the
 * club has not been created yet.
 */
app.get('/api/bootstrap', async (c) => {
  const clubs = await clubCount(c.env.DB);
  if (clubs === 0) {
    return c.json({ needsOnboarding: true, club: null, account: null });
  }

  const clubRow = await c.env.DB.prepare(
    'SELECT id, official_name, short_name, founded_year, city, state, venue FROM clubs LIMIT 1',
  ).first();

  const token = readCookie(c.req.header('Cookie') ?? null, SESSION_COOKIE);
  const session = token ? await resolveSession(c.env, token) : null;

  return c.json({
    needsOnboarding: false,
    club: clubRow
      ? {
          id: String(clubRow.id),
          officialName: String(clubRow.official_name),
          shortName: String(clubRow.short_name),
          foundedYear: clubRow.founded_year ? String(clubRow.founded_year) : '',
          city: clubRow.city ? String(clubRow.city) : '',
          state: clubRow.state ? String(clubRow.state) : '',
          venue: clubRow.venue ? String(clubRow.venue) : '',
        }
      : null,
    account: session
      ? {
          id: session.accountId,
          username: session.username,
          displayName: session.displayName,
          personId: session.personId,
          isOwner: session.isOwner,
          permissions: [...session.permissions],
        }
      : null,
  });
});

app.route('/api/auth', auth);
app.route('/api/onboarding', onboarding);

// Everything below requires a valid session; each route additionally checks its
// own capability.
app.use('/api/club/*', requireSession);
app.use('/api/people/*', requireSession);
app.use('/api/squad/*', requireSession);
app.use('/api/football/*', requireSession);
app.use('/api/finance/*', requireSession);
app.use('/api/inventory/*', requireSession);
app.use('/api/dashboard/*', requireSession);
app.use('/api/accounts/*', requireSession);
app.use('/api/exports/*', requireSession);

app.route('/api/club', club);
app.route('/api/people', people);
app.route('/api/squad', squad);
app.route('/api/football', football);
app.route('/api/finance', finance);
app.route('/api/inventory', inventory);
app.route('/api/dashboard', dashboard);
app.route('/api/accounts', accounts);
app.route('/api/exports', exportsRoutes);

app.all('/api/*', () => {
  throw notFound('Endpoint não encontrado.');
});

app.onError((error, c) => errorResponse(c, error));

export default {
  async fetch(request: Request, env: AppBindings['Bindings'], ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return app.fetch(request, env, ctx);
    }

    // Everything else is the built SPA; unknown paths fall back to index.html
    // so deep links into client-side routes keep working.
    return env.ASSETS.fetch(request);
  },
};

export { ApiError };
