/**
 * Password recovery, end to end against the real Worker and the real D1.
 *
 * Two things are being proved here. That the flow works: a link arrives, it is
 * good once, and the new password signs in. And that it gives nothing away:
 * the answer is the same for an address that exists and one that does not, the
 * token is never returned, never stored in clear text and never logged.
 *
 * Reading the delivered message means opening the local D1 file and querying
 * the development mail sink directly. The sink has no HTTP surface, by design,
 * so this is the inbox — and it is also how the token's storage is inspected.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { chromium } from 'playwright';

const BASE = process.env.API_BASE ?? 'http://127.0.0.1:8787';
/** Where the Worker's own output is being written, for the log checks. */
const WORKER_LOG = process.env.WORKER_LOG;

const ADMIN = {
  fullName: 'Jefferson Souza',
  username: 'jefferson',
  password: 'Verificacao2026',
  email: 'jefferson@juventusfc.test',
};
const SECOND = {
  fullName: 'Renata Prado',
  username: 'renata',
  password: 'Segunda2026',
  email: 'renata@juventusfc.test',
};
const NEW_PASSWORD = 'NovaSenha2026';

let passed = 0;
const failures = [];
const check = (name, condition, detail = '') => {
  if (condition) {
    passed += 1;
    console.log(`  ok  ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const finish = (code = 0) => {
  console.log(`\n${passed} verificações passaram, ${failures.length} falharam.`);
  if (failures.length) console.log(failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(failures.length ? 1 : code);
};

const D1_DIR = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';

let handle;
/**
 * Opens the local D1 file directly. Shelling out to `wrangler d1 execute`
 * spawns a second Miniflare over the same state directory and knocks the dev
 * server's connections over, so the file is read in-process instead.
 */
function db() {
  if (handle) return handle;
  const file = readdirSync(D1_DIR).find(
    (name) => name.endsWith('.sqlite') && name !== 'metadata.sqlite',
  );
  if (!file) throw new Error(`banco local não encontrado em ${D1_DIR}`);
  handle = new DatabaseSync(`${D1_DIR}/${file}`);
  return handle;
}

const d1 = (sql, ...params) => db().prepare(sql).all(...params);
const d1run = (sql, ...params) => db().prepare(sql).run(...params);

async function post(path, body, cookie) {
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: response.status, text, json, setCookie: response.headers.get('set-cookie') };
}

/** Pulls the link out of the development sink, the way an inbox would. */
function lastResetLink(recipient) {
  const rows = d1(
    `SELECT body FROM mail_outbox WHERE kind = 'password_reset' AND recipient = ?
      ORDER BY created_at DESC, rowid DESC LIMIT 1`,
    recipient,
  );
  const body = rows[0]?.body;
  if (!body) return null;
  return /token=([0-9a-f]+)/.exec(body)?.[1] ?? null;
}

const outboxCount = (recipient) =>
  Number(d1('SELECT COUNT(*) AS total FROM mail_outbox WHERE recipient = ?', recipient)[0].total);

// ---------------------------------------------------------------- preparation

console.log('\n== preparação ==');
const bootstrap = await fetch(`${BASE}/api/bootstrap`).then((r) => r.json());
if (!bootstrap.needsOnboarding) {
  console.log('FAIL  instância já configurada — rode `npm run db:reset` e reinicie o Worker.');
  process.exit(1);
}

const onboarded = await post('/api/onboarding', {
  club: {
    officialName: 'Juventus Futebol Clube',
    shortName: 'Juventus F.C.',
    city: 'Santa Cruz do Sul',
    state: 'RS',
    foundedYear: '1976',
    venue: 'Campo da Santa Cruz',
  },
  teams: ['Principal'],
  finance: { defaultMonthlyFee: 80, defaultDueDay: 10, paymentMethods: ['Pix'], season: '2026' },
  admin: {
    fullName: ADMIN.fullName,
    username: ADMIN.username,
    password: ADMIN.password,
    confirmPassword: ADMIN.password,
    email: ADMIN.email,
  },
});
check('clube e administrador criados', onboarded.status === 201, String(onboarded.status));

const ownerLogin = await post('/api/auth/login', {
  username: ADMIN.username,
  password: ADMIN.password,
});
const ownerCookie = (ownerLogin.setCookie ?? '').split(';')[0];
check('administrador entra com a senha original', ownerLogin.status === 200);

// A second account, so "sessions are revoked" can be shown to mean *that*
// account and nobody else.
const person = await post(
  '/api/people',
  { fullName: SECOND.fullName, email: SECOND.email, status: 'ativo' },
  ownerCookie,
);
const personId = person.json?.data?.id;
check('segunda pessoa cadastrada', Boolean(personId), person.text.slice(0, 120));

const secondAccount = await post(
  '/api/accounts',
  { personId, username: SECOND.username, password: SECOND.password, permissions: ['dashboard.view'] },
  ownerCookie,
);
check('segunda conta criada', secondAccount.status === 201, secondAccount.text.slice(0, 120));

const secondLogin = await post('/api/auth/login', {
  username: SECOND.username,
  password: SECOND.password,
});
const secondCookie = (secondLogin.setCookie ?? '').split(';')[0];
check('segunda conta entra', secondLogin.status === 200);

// ------------------------------------------------------------------- solicitar

console.log('\n== solicitação ==');
const known = await post('/api/auth/forgot-password', { email: ADMIN.email });
const unknown = await post('/api/auth/forgot-password', { email: 'ninguem@exemplo.test' });

check('e-mail existente responde 200', known.status === 200);
check('e-mail inexistente responde 200', unknown.status === 200);
check(
  'respostas são indistinguíveis',
  known.status === unknown.status && known.text === unknown.text,
  `${known.text} vs ${unknown.text}`,
);
check(
  'resposta é a mensagem genérica',
  known.json?.message?.startsWith('Se existir uma conta associada a este e-mail'),
  known.text,
);
check(
  'e-mail malformado é recusado',
  (await post('/api/auth/forgot-password', { email: 'nao-e-email' })).status === 400,
);
check(
  'nenhuma mensagem é gerada para e-mail inexistente',
  outboxCount('ninguem@exemplo.test') === 0,
);
check(
  'token não é devolvido pela API',
  !/[0-9a-f]{64}/.test(known.text),
  known.text.slice(0, 160),
);

const token = lastResetLink(ADMIN.email);
check('link de redefinição foi gerado', Boolean(token) && token.length === 64);

const stored = d1(
  'SELECT token_hash, used_at, invalidated_at FROM password_resets ORDER BY created_at DESC LIMIT 1',
)[0];
check(
  'apenas o hash do token é gravado',
  stored.token_hash !== token && /^[0-9a-f]{64}$/.test(stored.token_hash),
);
check(
  'token não é encontrado em texto puro no banco',
  d1('SELECT COUNT(*) AS total FROM password_resets WHERE token_hash = ?', token)[0].total === 0,
);

// ------------------------------------------------------------------ validação

console.log('\n== validação do token ==');
check('token válido é aceito', (await post('/api/auth/reset-password/check', { token })).json?.valid === true);
check(
  'token inexistente é recusado',
  (await post('/api/auth/reset-password/check', { token: 'f'.repeat(64) })).json?.valid === false,
);
check(
  'token malformado é recusado',
  (await post('/api/auth/reset-password/check', { token: 'abc' })).json?.valid === false,
);

// A newer request must retire the previous link.
const secondRequest = await post('/api/auth/forgot-password', { email: ADMIN.email });
check('segunda solicitação responde igual', secondRequest.text === known.text);
const freshToken = lastResetLink(ADMIN.email);
check('segunda solicitação gera outro token', freshToken && freshToken !== token);
check(
  'token anterior é invalidado pela nova solicitação',
  (await post('/api/auth/reset-password/check', { token })).json?.valid === false,
);
check(
  'usar o token invalidado é recusado',
  (
    await post('/api/auth/reset-password', {
      token,
      password: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    })
  ).status === 400,
);

// Expiry, by moving the row's deadline into the past — the same thing the
// clock would do half an hour later.
const expiredRequest = await post('/api/auth/forgot-password', { email: ADMIN.email });
check('terceira solicitação responde igual', expiredRequest.text === known.text);
const expiringToken = lastResetLink(ADMIN.email);
d1run(
  `UPDATE password_resets SET expires_at = '2020-01-01T00:00:00.000Z'
    WHERE used_at IS NULL AND invalidated_at IS NULL`,
);
check(
  'token expirado é recusado na verificação',
  (await post('/api/auth/reset-password/check', { token: expiringToken })).json?.valid === false,
);
const expiredAttempt = await post('/api/auth/reset-password', {
  token: expiringToken,
  password: NEW_PASSWORD,
  confirmPassword: NEW_PASSWORD,
});
check('token expirado é recusado na redefinição', expiredAttempt.status === 400);
check(
  'recusa não diz por que o link falhou',
  expiredAttempt.json?.error?.message?.includes('inválido ou já expirou'),
  expiredAttempt.text,
);

// ------------------------------------------------------------------ redefinir

console.log('\n== redefinição ==');
const finalRequest = await post('/api/auth/forgot-password', { email: ADMIN.email });
check('quarta solicitação responde igual', finalRequest.text === known.text);
const goodToken = lastResetLink(ADMIN.email);

const weak = await post('/api/auth/reset-password', {
  token: goodToken,
  password: '123',
  confirmPassword: '123',
});
check('senha fraca é recusada', weak.status === 400);
check(
  'recusa aponta o campo da senha',
  weak.json?.error?.details?.password?.includes('8 caracteres'),
  weak.text,
);

const mismatch = await post('/api/auth/reset-password', {
  token: goodToken,
  password: NEW_PASSWORD,
  confirmPassword: 'OutraSenha2026',
});
check('confirmação diferente é recusada', mismatch.status === 400);
check(
  'recusa aponta o campo de confirmação',
  mismatch.json?.error?.details?.confirmPassword?.includes('não conferem'),
  mismatch.text,
);
check(
  'token não é consumido por uma tentativa inválida',
  (await post('/api/auth/reset-password/check', { token: goodToken })).json?.valid === true,
);

const applied = await post('/api/auth/reset-password', {
  token: goodToken,
  password: NEW_PASSWORD,
  confirmPassword: NEW_PASSWORD,
});
check('redefinição conclui', applied.status === 200, applied.text.slice(0, 140));
check('resposta confirma a alteração', applied.json?.message === 'Senha alterada com sucesso.');
check(
  'token reutilizado é recusado',
  (
    await post('/api/auth/reset-password', {
      token: goodToken,
      password: 'MaisUma2026',
      confirmPassword: 'MaisUma2026',
    })
  ).status === 400,
);

// ------------------------------------------------------------------- sessões

console.log('\n== sessões e credenciais ==');
const oldSession = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: ownerCookie } });
check('sessão anterior da conta é invalidada', oldSession.status === 401, String(oldSession.status));
const otherSession = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: secondCookie } });
check('sessão de outra conta continua válida', otherSession.status === 200, String(otherSession.status));

check(
  'senha antiga deixa de funcionar',
  (await post('/api/auth/login', { username: ADMIN.username, password: ADMIN.password })).status === 401,
);
const relogin = await post('/api/auth/login', { username: ADMIN.username, password: NEW_PASSWORD });
check('nova senha entra imediatamente', relogin.status === 200, relogin.text.slice(0, 120));

check(
  'senha não é armazenada em texto puro',
  d1('SELECT COUNT(*) AS total FROM accounts WHERE password_hash = ?', NEW_PASSWORD)[0].total === 0 &&
    d1('SELECT password_hash FROM accounts WHERE username = ?', ADMIN.username)[0].password_hash.startsWith(
      'pbkdf2$sha256$',
    ),
);

// ---------------------------------------------------------------- rate limit

console.log('\n== limite de solicitações ==');
const before = outboxCount(ADMIN.email);
let lastBody = '';
for (let i = 0; i < 4; i += 1) {
  lastBody = (await post('/api/auth/forgot-password', { email: ADMIN.email })).text;
}
const after = outboxCount(ADMIN.email);
check('resposta continua idêntica no limite', lastBody === known.text);
check(
  'limite corta o envio antes de virar spam',
  after - before < 4,
  `${after - before} mensagens novas em 4 pedidos`,
);

// --------------------------------------------------------------------- logs

console.log('\n== logs ==');
if (!WORKER_LOG) {
  check('WORKER_LOG aponta para a saída do Worker', false, 'defina WORKER_LOG=<arquivo de log>');
} else {
  let log = '';
  try {
    log = readFileSync(WORKER_LOG, 'utf8');
  } catch (error) {
    check('log do Worker legível', false, String(error));
  }
  check('token não aparece nos logs', !log.includes(goodToken) && !log.includes(token));
  check('senha não aparece nos logs', !log.includes(NEW_PASSWORD) && !log.includes(ADMIN.password));
  check('e-mail não aparece nos logs', !log.includes(ADMIN.email));
}

// ---------------------------------------------------------------------- UI

console.log('\n== interface ==');
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`${BASE}/entrar`, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: /Esqueceu a senha/i }).click();
  await page.waitForURL(/esqueci-senha/, { timeout: 10000 });
  check('login leva à recuperação', new URL(page.url()).pathname === '/esqueci-senha');

  await page.getByLabel('E-mail da conta').fill(ADMIN.email);
  await page.getByRole('button', { name: /Enviar instruções/i }).click();
  await page.waitForTimeout(1500);
  const body = (await page.locator('body').innerText()).toLowerCase();
  check('interface mostra a mensagem genérica', body.includes('se existir uma conta associada'));
  check('interface não revela o link', !/[0-9a-f]{64}/.test(body));

  // A dead link must say so before asking for a password.
  await page.goto(`${BASE}/redefinir-senha?token=${'a'.repeat(64)}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const dead = (await page.locator('body').innerText()).toLowerCase();
  check('link morto mostra estado próprio', dead.includes('link indisponível'));
  check('link morto não apresenta o formulário', !(await page.getByLabel('Nova senha').isVisible().catch(() => false)));

  await context.close();
}

{
  // Reset through the interface, then sign in with what it set.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await post('/api/auth/forgot-password', { email: SECOND.email });
  const uiToken = lastResetLink(SECOND.email);
  check('link gerado para a segunda conta', Boolean(uiToken));

  await page.goto(`${BASE}/redefinir-senha?token=${uiToken}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.getByLabel(/^Nova senha$/).fill('Interface2026');
  await page.getByLabel('Confirmar nova senha').fill('Interface2026');
  await page.getByRole('button', { name: /Redefinir senha/i }).click();
  await page.waitForTimeout(2000);
  const done = (await page.locator('body').innerText()).toLowerCase();
  check('interface confirma a alteração', done.includes('senha alterada'));

  const uiLogin = await post('/api/auth/login', {
    username: SECOND.username,
    password: 'Interface2026',
  });
  check('senha definida pela interface entra', uiLogin.status === 200, uiLogin.text.slice(0, 120));
  await context.close();
}

{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/esqueci-senha`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  check(
    'recuperação no mobile sem overflow horizontal',
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  );
  check('campo de e-mail utilizável no mobile', await page.getByLabel('E-mail da conta').isEditable());
  await context.close();
}

await browser.close();
handle?.close();
finish();
