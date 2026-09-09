/**
 * First-access flow — casos A a G.
 *
 * Runs against a live Worker and a freshly migrated D1, starting from an
 * instance with no club at all. Several checks throttle /api/bootstrap on
 * purpose: the defect this suite guards against was public screens deciding
 * what to render before that call had answered.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.UI_BASE ?? 'http://127.0.0.1:8787';
const SHOTS = process.env.SHOTS ?? '/tmp/first-access';
mkdirSync(SHOTS, { recursive: true });

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

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const pageErrors = [];

/** A context whose /api/bootstrap is delayed, to expose premature rendering. */
async function slowContext(delayMs = 900) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/api/bootstrap', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.continue();
  });
  return page;
}

const path = (page) => new URL(page.url()).pathname;
const text = async (page) => (await page.locator('body').innerText()).toLowerCase();

console.log('\n== CASO A — banco vazio leva ao primeiro acesso ==');
{
  const response = await fetch(`${BASE}/api/bootstrap`);
  const payload = await response.json();
  check('bootstrap responde needsOnboarding = true', payload.needsOnboarding === true, JSON.stringify(payload));
  check('bootstrap não expõe conta nem clube', payload.account === null && payload.club === null);
}

{
  const page = await slowContext();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  // While bootstrap is in flight nothing may claim the instance is configured.
  const during = await text(page);
  check(
    'durante o bootstrap a raiz não mostra login nem portal',
    !during.includes('usuário') && !during.includes('chega mais'),
    during.slice(0, 80),
  );
  await page.waitForTimeout(2500);
  check('raiz leva ao onboarding', path(page) === '/onboarding', path(page));
  await page.screenshot({ path: `${SHOTS}/A1-raiz-para-onboarding.png` });
  await page.close();
}

{
  const page = await slowContext();
  await page.goto(`${BASE}/entrar`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  const during = await text(page);
  check(
    'durante o bootstrap /entrar não mostra o formulário de login',
    !during.includes('esqueceu a senha'),
    during.slice(0, 80),
  );
  await page.waitForTimeout(2500);
  const after = await text(page);
  check('/entrar apresenta o primeiro acesso', after.includes('primeiro acesso'));
  check('/entrar não oferece formulário de login sem contas', !after.includes('esqueceu a senha'));
  check('/entrar deixa claro que não há credencial padrão', after.includes('não existem credenciais padrão'));
  await page.screenshot({ path: `${SHOTS}/A2-entrar-primeiro-acesso.png` });

  await page.getByRole('button', { name: 'Configurar clube' }).click();
  await page.waitForTimeout(1200);
  check('botão de primeiro acesso leva ao onboarding', path(page) === '/onboarding', path(page));
  await page.close();
}

{
  // The bounce that used to happen: /onboarding → /entrar → /onboarding.
  const page = await slowContext();
  const visited = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) visited.push(new URL(frame.url()).pathname);
  });
  await page.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  check('/onboarding não passa por /entrar', !visited.includes('/entrar'), visited.join(' → '));
  check('/onboarding permanece no onboarding', path(page) === '/onboarding', path(page));
  await page.close();
}

console.log('\n== CASO B — concluir o onboarding entra na plataforma ==');
const ADMIN = { name: 'Marcus Valério', username: 'marcus', password: 'juventus2026' };
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  await page.getByLabel('Nome oficial').fill('Juventus Futebol Clube');
  await page.getByLabel('Nome curto').fill('Juventus F.C.');
  await page.getByLabel('Cidade').fill('São Paulo');
  for (let step = 0; step < 4; step += 1) {
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForTimeout(600);
  }
  await page.getByLabel('Nome completo').fill(ADMIN.name);
  await page.getByLabel('Usuário').fill(ADMIN.username);
  await page.getByLabel(/^Senha\*?$/).fill(ADMIN.password);
  await page.getByLabel('Confirmar senha').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Concluir configuração' }).click();

  await page.waitForURL(/\/app$/, { timeout: 20000 });
  await page.waitForTimeout(2000);
  check('entra automaticamente em /app, sem novo login', path(page) === '/app');

  const dashboard = await text(page);
  check('confirmação de configuração concluída', dashboard.includes('configuração concluída'));
  check('sessão reconhece o administrador criado', dashboard.includes('marcus'));
  await page.screenshot({ path: `${SHOTS}/B-entrada-automatica.png` });

  const session = await page.evaluate(async () => {
    const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
    return response.ok ? response.json() : null;
  });
  check('sessão válida criada pelo backend', Boolean(session?.account?.id));
  check('conta é proprietária do clube', session?.account?.isOwner === true);
  check('autorizações criadas para o administrador', (session?.account?.permissions ?? []).length >= 20,
    `${session?.account?.permissions?.length} autorizações`);

  const cookieVisible = await page.evaluate(() => document.cookie.includes('jfc_session'));
  check('cookie de sessão é HttpOnly (invisível ao script)', cookieVisible === false);
  await page.close();
}

console.log('\n== CASO C — segundo onboarding é recusado ==');
{
  const response = await fetch(`${BASE}/api/onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      club: { officialName: 'Outro Clube', shortName: 'Outro' },
      teams: [],
      finance: { defaultMonthlyFee: 0, defaultDueDay: 10, paymentMethods: [] },
      admin: { fullName: 'Invasor', username: 'invasor', password: 'senha12345', confirmPassword: 'senha12345' },
    }),
  });
  check('backend recusa um segundo clube com 409', response.status === 409, `status ${response.status}`);

  const clubs = await fetch(`${BASE}/api/bootstrap`).then((r) => r.json());
  check('clube original permanece', clubs.club?.shortName === 'Juventus F.C.');
}

console.log('\n== CASO D — configurado e sem autenticação ==');
{
  const page = await slowContext();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const portal = await text(page);
  check('raiz apresenta o portal do clube', portal.includes('chega mais'));
  check('portal identifica o clube configurado', portal.includes('juventus f.c.'));

  await page.getByRole('link', { name: /Acessar a plataforma/i }).click();
  await page.waitForTimeout(1500);
  check('portal leva ao login', path(page) === '/entrar', path(page));

  const login = await text(page);
  check('login é apresentado normalmente', login.includes('esqueceu a senha'));
  check('não oferece criar conta em instância configurada', !login.includes('configurar clube'));
  check('orienta quem procura primeiro acesso', login.includes('já está configurado'));
  await page.screenshot({ path: `${SHOTS}/D-login-configurado.png` });
  await page.close();
}

console.log('\n== CASO G — senha do administrador ==');
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`${BASE}/entrar`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  await page.getByLabel('Usuário').fill(ADMIN.username);
  await page.getByLabel(/^Senha\*?$/).fill('senhaerrada123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForTimeout(1500);
  check('senha incorreta é recusada', (await text(page)).includes('usuário ou senha incorretos'));

  await page.getByLabel(/^Senha\*?$/).fill(ADMIN.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/\/app/, { timeout: 15000 });
  await page.waitForTimeout(1500);
  check('login posterior com a senha criada funciona', path(page).startsWith('/app'));

  console.log('\n== CASO E — configurado e autenticado ==');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  check('raiz mantém o portal para quem está autenticado', (await text(page)).includes('chega mais'));
  await page.getByRole('link', { name: /Entrar na plataforma/i }).click();
  await page.waitForTimeout(1500);
  check('portal leva direto à aplicação', path(page) === '/app', path(page));

  console.log('\n== CASO F — onboarding com clube já existente ==');
  await page.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const configured = await text(page);
  check('onboarding informa que o clube já está configurado', configured.includes('clube já configurado'));
  check('onboarding não apresenta o formulário de configuração', !configured.includes('etapa 1 de 5'));
  await page.screenshot({ path: `${SHOTS}/F-ja-configurado.png` });
  await page.getByRole('button', { name: 'Ir para a plataforma' }).click();
  await page.waitForTimeout(1500);
  check('oferece retorno para a aplicação', path(page) === '/app', path(page));

  // Signed out, the same screen must point at the login instead.
  await page.evaluate(() => fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }));
  await page.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  check('deslogado, o onboarding aponta para o login',
    (await text(page)).includes('clube já configurado'));
  await page.getByRole('button', { name: 'Ir para o login' }).click();
  await page.waitForTimeout(1500);
  check('retorno leva a /entrar', path(page) === '/entrar', path(page));
  await page.close();
}

console.log('\n== bootstrap indisponível ==');
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/api/bootstrap', (route) => route.abort('failed'));
  await page.goto(`${BASE}/entrar`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const failed = await text(page);
  check('falha de bootstrap mostra erro claro', failed.includes('sem conexão'));
  check('falha não é confundida com falta de configuração', !failed.includes('primeiro acesso'));
  check('falha não apresenta formulário de login', !failed.includes('esqueceu a senha'));
  await page.screenshot({ path: `${SHOTS}/erro-bootstrap.png` });
  await page.close();
}

console.log(`\n${passed} verificações passaram, ${failures.length} falharam.`);
if (pageErrors.length > 0) {
  console.log('\nErros de página:');
  [...new Set(pageErrors)].forEach((error) => console.log(`  - ${error}`));
}
if (failures.length > 0) {
  console.log('\nFalhas:');
  failures.forEach((failure) => console.log(`  - ${failure}`));
}
await browser.close();
process.exit(failures.length > 0 || pageErrors.length > 0 ? 1 : 0);
