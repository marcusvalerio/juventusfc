/**
 * Monthly dues belong to the person.
 *
 * What this proves, against the real Worker and the real D1: that anyone on the
 * register can be charged — player, director, coach, or nobody in particular —
 * and that holding several links to the club still means one charge per month.
 * The person is never created, altered or removed by anything the billing
 * screen does.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.UI_BASE ?? 'http://127.0.0.1:8787';
const SHOTS = process.env.SHOTS ?? '/tmp/dues';
mkdirSync(SHOTS, { recursive: true });

const ADMIN = { username: 'jefferson', password: 'Verificacao2026' };
const VIEWER = { username: 'observador', password: 'Observador2026' };
const MONTH = '2026-09';

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

async function call(path, { method = 'GET', body, cookie } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON body reported through `text` */
  }
  return { status: response.status, text, json, setCookie: response.headers.get('set-cookie') };
}

const signIn = async (credentials) =>
  ((await call('/api/auth/login', { method: 'POST', body: credentials })).setCookie ?? '').split(';')[0];

// ---------------------------------------------------------------- preparation

console.log('\n== preparação ==');
if (!(await call('/api/bootstrap')).json?.needsOnboarding) {
  console.log('FAIL  instância já configurada — rode `npm run db:reset` e reinicie o Worker.');
  process.exit(1);
}

await call('/api/onboarding', {
  method: 'POST',
  body: {
    club: { officialName: 'Juventus Futebol Clube', shortName: 'Juventus F.C.', city: 'Santa Cruz do Sul', state: 'RS' },
    teams: ['Profissional'],
    finance: { defaultMonthlyFee: 180, defaultDueDay: 10, paymentMethods: ['Pix'], season: '2026' },
    admin: {
      fullName: 'Jefferson Souza',
      username: ADMIN.username,
      password: ADMIN.password,
      confirmPassword: ADMIN.password,
      email: 'jefferson@juventusfc.test',
    },
  },
});
const admin = await signIn(ADMIN);
check('administrador autenticado', Boolean(admin));

const addPerson = async (fullName, { enabled = true, fee = 0, dueDay = 10 } = {}) =>
  (
    await call('/api/people', {
      method: 'POST',
      cookie: admin,
      body: { fullName, status: 'ativo', monthlyFeeEnabled: enabled, monthlyFee: fee, dueDay },
    })
  ).json.data;

// The cast: one of each shape the club actually has.
const joao = await addPerson('João Silva', { fee: 180 });
const carlos = await addPerson('Carlos Souza', { fee: 120 });
const pedro = await addPerson('Pedro Santos', { fee: 200 });
const ana = await addPerson('Ana Ferraz', { fee: 90 });
const maria = await addPerson('Maria Oliveira', { enabled: false });
const bruno = await addPerson('Bruno Dias', { fee: 70 }); // sem vínculo esportivo

await call('/api/squad/players', {
  method: 'POST', cookie: admin,
  body: { personId: joao.id, position: 'Atacante', monthlyFee: 180, dueDay: 10, status: 'ativo' },
});
await call('/api/squad/players', {
  method: 'POST', cookie: admin,
  body: { personId: pedro.id, position: 'Zagueiro', monthlyFee: 200, dueDay: 10, status: 'ativo' },
});
await call('/api/squad/board', { method: 'POST', cookie: admin, body: { personId: carlos.id, role: 'Diretor' } });
await call('/api/squad/board', { method: 'POST', cookie: admin, body: { personId: pedro.id, role: 'Diretor' } });
await call('/api/squad/staff', { method: 'POST', cookie: admin, body: { personId: ana.id, role: 'Preparadora' } });
await call('/api/squad/staff', { method: 'POST', cookie: admin, body: { personId: maria.id, role: 'Fisioterapeuta' } });

const roles = async (personId) => (await call(`/api/people/${personId}`, { cookie: admin })).json.data.roles;
check('Pedro acumula jogador e diretoria', (await roles(pedro.id)).join(',') === 'jogador,diretoria');
check('Maria fica só na comissão', (await roles(maria.id)).join(',') === 'comissao');

const viewerPerson = await addPerson('Observador do Clube', { enabled: false });
await call('/api/accounts', {
  method: 'POST', cookie: admin,
  body: { personId: viewerPerson.id, username: VIEWER.username, password: VIEWER.password, permissions: ['dashboard.view', 'finance.view'] },
});
const viewer = await signIn(VIEWER);
check('conta somente-leitura autenticada', Boolean(viewer));

// ------------------------------------------------------- cobrança por vínculo

console.log('\n== quem pode ser cobrado ==');
const raise = (personId, month = MONTH, amount = 100, cookie = admin) =>
  call('/api/finance/dues', {
    method: 'POST',
    cookie,
    body: { personId, referenceMonth: month, dueDate: `${month}-10`, expectedAmount: amount },
  });

const asPlayer = await raise(joao.id, '2026-07', 180);
check('CASO 1 — pessoa só jogador é cobrada', asPlayer.status === 201, asPlayer.text.slice(0, 140));
check('a cobrança traz o nome da pessoa', asPlayer.json?.data?.personName === 'João Silva');
check('a cobrança traz os vínculos', (asPlayer.json?.data?.personRoles ?? []).includes('jogador'));

const asBoard = await raise(carlos.id, '2026-07', 120);
check('CASO 2 — pessoa só diretoria é cobrada', asBoard.status === 201, asBoard.text.slice(0, 140));
check('a cobrança de diretoria não vira jogador', !(asBoard.json?.data?.personRoles ?? []).includes('jogador'));

const asStaff = await raise(ana.id, '2026-07', 90);
check('CASO 4 — pessoa da comissão é cobrada', asStaff.status === 201, asStaff.text.slice(0, 140));

const asNobody = await raise(bruno.id, '2026-07', 70);
check('pessoa sem vínculo esportivo é cobrada', asNobody.status === 201, asNobody.text.slice(0, 140));

const asBoth = await raise(pedro.id, '2026-07', 200);
check('CASO 3 — pessoa com dois vínculos é cobrada', asBoth.status === 201);
const julyForPedro = (await call('/api/finance/dues', { cookie: admin })).json.data.filter(
  (due) => due.personId === pedro.id && due.referenceMonth === '2026-07',
);
check('CASO 3 — e recebe uma única cobrança', julyForPedro.length === 1, String(julyForPedro.length));

console.log('\n== duplicidade ==');
const again = await raise(carlos.id, '2026-07', 120);
check('CASO 6 — segunda cobrança no mesmo mês é bloqueada', again.status === 409, String(again.status));
check(
  'a recusa fala de pessoa, não de jogador',
  /pessoa/i.test(again.json?.error?.message ?? ''),
  again.json?.error?.message,
);

// ------------------------------------------------------------------- geração

console.log('\n== geração do mês ==');
const generated = await call('/api/finance/dues/generate', {
  method: 'POST', cookie: admin, body: { referenceMonth: MONTH },
});
check('a geração roda', generated.status === 201, generated.text.slice(0, 140));

const month = (await call('/api/finance/dues', { cookie: admin })).json.data.filter(
  (due) => due.referenceMonth === MONTH,
);
const billed = month.map((due) => due.personName).sort();
check(
  'CASO 5 — quem não é mensalista fica de fora',
  !billed.includes('Maria Oliveira'),
  billed.join(', '),
);
check(
  'jogador, diretoria, comissão e sem vínculo entram',
  ['Ana Ferraz', 'Bruno Dias', 'Carlos Souza', 'João Silva', 'Pedro Santos'].every((name) => billed.includes(name)),
  billed.join(', '),
);
check(
  'CASO 3 — quem tem dois vínculos entra uma vez',
  month.filter((due) => due.personId === pedro.id).length === 1,
);
check(
  'cada pessoa é cobrada pelo próprio valor',
  month.find((d) => d.personId === carlos.id)?.expectedAmount === 120 &&
    month.find((d) => d.personId === pedro.id)?.expectedAmount === 200,
);
check(
  'rodar de novo não duplica nada',
  (await call('/api/finance/dues/generate', { method: 'POST', cookie: admin, body: { referenceMonth: MONTH } })).json
    ?.created === 0,
);

console.log('\n== vínculos mudam, cobrança não ==');
await call('/api/squad/board', { method: 'POST', cookie: admin, body: { personId: joao.id, role: 'Conselheiro' } });
check('João passa a acumular dois vínculos', (await roles(joao.id)).length === 2);
await call('/api/finance/dues/generate', { method: 'POST', cookie: admin, body: { referenceMonth: MONTH } });
const joaoSeptember = (await call('/api/finance/dues', { cookie: admin })).json.data.filter(
  (due) => due.personId === joao.id && due.referenceMonth === MONTH,
);
check('CASO 10 — novo vínculo não gera segunda cobrança', joaoSeptember.length === 1, String(joaoSeptember.length));

// --------------------------------------------------------- edição e exclusão

console.log('\n== edição e exclusão ==');
const target = joaoSeptember[0];
const personBefore = (await call(`/api/people/${joao.id}`, { cookie: admin })).json.data;
const edited = await call(`/api/finance/dues/${target.id}`, {
  method: 'PUT',
  cookie: admin,
  body: {
    personId: joao.id,
    referenceMonth: MONTH,
    dueDate: `${MONTH}-20`,
    expectedAmount: 195,
    paidAmount: 195,
    paidAt: `${MONTH}-19`,
    method: 'Pix',
  },
});
check('a mensalidade é editada', edited.status === 200, edited.text.slice(0, 140));
check('o status é recalculado no servidor', edited.json?.data?.status === 'pago', edited.json?.data?.status);

const personAfter = (await call(`/api/people/${joao.id}`, { cookie: admin })).json.data;
check(
  'CASO 8 — editar a cobrança não altera a pessoa',
  personAfter.fullName === personBefore.fullName &&
    personAfter.monthlyFee === personBefore.monthlyFee &&
    personAfter.dueDay === personBefore.dueDay,
  JSON.stringify({ before: personBefore.monthlyFee, after: personAfter.monthlyFee }),
);

// The person's default must not rewrite a charge already raised.
await call(`/api/people/${joao.id}`, {
  method: 'PUT', cookie: admin,
  body: { fullName: 'João Silva', status: 'ativo', monthlyFeeEnabled: true, monthlyFee: 999, dueDay: 5 },
});
const untouched = (await call('/api/finance/dues', { cookie: admin })).json.data.find((d) => d.id === target.id);
check('mudar o valor padrão não mexe em cobrança lançada', untouched.expectedAmount === 195, String(untouched.expectedAmount));

const removed = await call(`/api/finance/dues/${target.id}`, { method: 'DELETE', cookie: admin });
check('a mensalidade é excluída', removed.status === 200);
check(
  'CASO 9 — excluir a cobrança não exclui a pessoa',
  (await call(`/api/people/${joao.id}`, { cookie: admin })).status === 200,
);
check('CASO 9 — nem o vínculo de jogador', (await roles(joao.id)).includes('jogador'));

console.log('\n== histórico do jogador ==');
const playerRow = (await call('/api/squad/players', { cookie: admin })).json.data.find((p) => p.personId === pedro.id);
const detail = (await call(`/api/squad/players/${playerRow.id}`, { cookie: admin })).json.data;
check('CASO 7 — a cobrança da pessoa aparece no histórico do jogador', detail.history?.dues >= 1, JSON.stringify(detail.history));
check('o jogador lê o valor padrão da pessoa', detail.monthlyFee === 200, String(detail.monthlyFee));

console.log('\n== permissões ==');
check('sem finance.create a API recusa lançar', (await raise(carlos.id, '2026-10', 120, viewer)).status === 403);
const anyDue = (await call('/api/finance/dues', { cookie: admin })).json.data[0];
check(
  'sem finance.edit a API recusa editar',
  (await call(`/api/finance/dues/${anyDue.id}`, {
    method: 'PUT', cookie: viewer,
    body: { personId: anyDue.personId, referenceMonth: anyDue.referenceMonth, dueDate: anyDue.dueDate, expectedAmount: 1 },
  })).status === 403,
);
check(
  'sem finance.delete a API recusa excluir',
  (await call(`/api/finance/dues/${anyDue.id}`, { method: 'DELETE', cookie: viewer })).status === 403,
);

console.log('\n== pessoa inexistente ==');
check('cobrar uma pessoa que não existe é recusado', (await raise('per_inexistente', '2026-11', 50)).status === 404);

// ---------------------------------------------------------------------- UI

console.log('\n== interface ==');
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

async function session(credentials, width = 1440, height = 900) {
  const context = await browser.newContext({
    viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${BASE}/entrar`, { waitUntil: 'networkidle' });
  await page.getByLabel('Usuário').fill(credentials.username);
  await page.getByLabel(/^Senha\*?$/).fill(credentials.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/\/app/, { timeout: 15000 });
  return { context, page, errors };
}

{
  const { context, page, errors } = await session(ADMIN);
  await page.goto(`${BASE}/app/mensalidades`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);

  check('a listagem tem a coluna Pessoa', await page.getByRole('columnheader', { name: 'Pessoa' }).isVisible());
  check('não há mais coluna de jogador', (await page.getByRole('columnheader', { name: 'Jogador' }).count()) === 0);
  const body = await page.locator('body').innerText();
  check('a tabela mostra pessoas de vários vínculos', body.includes('Carlos Souza') && body.includes('Ana Ferraz'));
  check('os vínculos aparecem junto do nome', /Jogador · Diretoria/.test(body), body.slice(0, 200));
  await page.screenshot({ path: `${SHOTS}/listagem.png` });

  // Raising a charge for someone who never played.
  const peopleBefore = (await call('/api/people', { cookie: admin })).json.data.length;
  await page.getByRole('button', { name: /Registrar mensalidade/i }).click();
  await page.waitForTimeout(700);
  // Everything below is scoped to the dialog: the table behind it carries the
  // same labels on its sort buttons and filter selects.
  const dialog = page.getByRole('dialog');
  check('o formulário pede uma pessoa', await dialog.getByPlaceholder('Pesquisar pessoa…').isVisible());
  await dialog.getByPlaceholder('Pesquisar pessoa…').fill('Carlos');
  await page.waitForTimeout(500);
  const picker = dialog.getByRole('listbox');
  check('a busca encontra a pessoa pelo nome', await picker.getByRole('option', { name: /Carlos Souza/ }).isVisible());
  await picker.getByRole('option', { name: /Carlos Souza/ }).click();
  await page.waitForTimeout(400);
  check('o valor padrão da pessoa é sugerido', (await dialog.getByLabel('Valor previsto').inputValue()) === '120');
  check(
    'o vencimento é sugerido pelo dia da pessoa',
    (await dialog.getByLabel('Vencimento').inputValue()).endsWith('-10'),
    await dialog.getByLabel('Vencimento').inputValue(),
  );

  await dialog.getByLabel('Mês de referência').fill('2026-10');
  await dialog.getByLabel('Vencimento').fill('2026-10-10');
  await page.screenshot({ path: `${SHOTS}/formulario.png` });
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await page.waitForTimeout(2200);

  const persisted = (await call('/api/finance/dues', { cookie: admin })).json.data.filter(
    (due) => due.personId === carlos.id && due.referenceMonth === '2026-10',
  );
  check('a cobrança criada pela interface é persistida', persisted.length === 1, String(persisted.length));
  check(
    'a interface não criou uma pessoa nova',
    (await call('/api/people', { cookie: admin })).json.data.length === peopleBefore,
    String(peopleBefore),
  );
  check('a interface não gerou erro', errors.length === 0, errors.join(' | '));
  await context.close();
}

{
  const { context, page } = await session(ADMIN, 390, 844);
  await page.goto(`${BASE}/app/mensalidades`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  check(
    'no mobile a página não estoura na horizontal',
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  );
  await page.screenshot({ path: `${SHOTS}/mobile.png` });
  await context.close();
}

{
  const { context, page } = await session(ADMIN);
  await page.goto(`${BASE}/app/pessoas`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /Nova pessoa/i }).first().click();
  await page.waitForTimeout(700);
  const personDialog = page.getByRole('dialog');
  check('o cadastro de pessoa pergunta sobre a cobrança', await personDialog.getByLabel('Participa da cobrança').isVisible());
  check('o valor padrão fica desabilitado sem cobrança', await personDialog.getByLabel('Valor padrão').isDisabled());
  await personDialog.getByLabel('Participa da cobrança').selectOption('sim');
  await page.waitForTimeout(300);
  check('habilitar a cobrança libera o valor', await personDialog.getByLabel('Valor padrão').isEnabled());
  await context.close();
}

await browser.close();

console.log(`\n${passed} verificações passaram, ${failures.length} falharam.`);
if (failures.length) {
  console.log(failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
