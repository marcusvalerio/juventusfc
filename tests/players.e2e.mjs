/**
 * Editing and removing players, against the real Worker and the real D1.
 *
 * The two things being proved: that a save rewrites the record that already
 * exists — never a second person, never a second squad row — and that leaving
 * the squad never takes the club's history with it. `players` cascades into
 * dues, line-ups and attendance, so a player who carries any of that must be
 * retired instead of deleted.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.UI_BASE ?? 'http://127.0.0.1:8787';
const SHOTS = process.env.SHOTS ?? '/tmp/players';
mkdirSync(SHOTS, { recursive: true });

const ADMIN = { username: 'jefferson', password: 'Verificacao2026' };
const VIEWER = { username: 'observador', password: 'Observador2026' };

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
    /* non-JSON bodies are reported through `text` */
  }
  return { status: response.status, text, json, setCookie: response.headers.get('set-cookie') };
}

const signIn = async (credentials) => {
  const response = await call('/api/auth/login', { method: 'POST', body: credentials });
  return (response.setCookie ?? '').split(';')[0];
};

const count = async (path, cookie) => (await call(path, { cookie })).json?.data?.length ?? -1;

// ---------------------------------------------------------------- preparation

console.log('\n== preparação ==');
const bootstrap = await call('/api/bootstrap');
if (!bootstrap.json?.needsOnboarding) {
  console.log('FAIL  instância já configurada — rode `npm run db:reset` e reinicie o Worker.');
  process.exit(1);
}

await call('/api/onboarding', {
  method: 'POST',
  body: {
    club: { officialName: 'Juventus Futebol Clube', shortName: 'Juventus F.C.', city: 'Santa Cruz do Sul', state: 'RS' },
    teams: ['Principal'],
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

// An account that may look at the squad but not change it.
const viewerPerson = await call('/api/people', {
  method: 'POST',
  cookie: admin,
  body: { fullName: 'Observador do Clube', status: 'ativo' },
});
await call('/api/accounts', {
  method: 'POST',
  cookie: admin,
  body: {
    personId: viewerPerson.json.data.id,
    username: VIEWER.username,
    password: VIEWER.password,
    permissions: ['dashboard.view', 'squad.view'],
  },
});
const viewer = await signIn(VIEWER);
check('conta somente-leitura autenticada', Boolean(viewer));

// ------------------------------------------------------------------- edição

console.log('\n== edição pela API ==');
const created = await call('/api/squad/players', {
  method: 'POST',
  cookie: admin,
  body: {
    fullName: 'Diego Marchetti',
    nickname: 'Diego',
    shirtNumber: 10,
    position: 'Atacante',
    birthDate: '2000-03-04',
    phone: '(51) 99999-0000',
    joinedAt: '2026-01-15',
    monthlyFee: 180,
    dueDay: 10,
    status: 'ativo',
  },
});
check('jogador criado', created.status === 201, created.text.slice(0, 140));
const player = created.json.data;

const peopleBefore = await count('/api/people', admin);
const playersBefore = await count('/api/squad/players', admin);

const edited = await call(`/api/squad/players/${player.id}`, {
  method: 'PUT',
  cookie: admin,
  body: {
    fullName: 'Diego Marchetti Silva',
    nickname: 'Dieguinho',
    shirtNumber: 9,
    position: 'Meia',
    birthDate: '2000-03-04',
    phone: '(51) 98888-1111',
    joinedAt: '2026-02-01',
    monthlyFee: 250,
    dueDay: 15,
    status: 'lesionado',
    notes: 'Capitão do elenco',
  },
});
check('edição responde 200', edited.status === 200, edited.text.slice(0, 140));

const after = edited.json?.data ?? {};
check('atualiza o mesmo registro de jogador', after.id === player.id);
check('mantém a mesma pessoa', after.personId === player.personId);
check('não cria um segundo jogador', (await count('/api/squad/players', admin)) === playersBefore);
check('não cria uma segunda pessoa', (await count('/api/people', admin)) === peopleBefore);

const reread = (await call(`/api/squad/players/${player.id}`, { cookie: admin })).json?.data ?? {};
check('nome persistido', reread.name === 'Diego Marchetti Silva', reread.name);
check('apelido persistido', reread.nickname === 'Dieguinho', reread.nickname);
check('número persistido', reread.shirtNumber === 9, String(reread.shirtNumber));
check('posição persistida', reread.position === 'Meia', reread.position);
check('mensalidade persistida', reread.monthlyFee === 250, String(reread.monthlyFee));
check('dia do vencimento persistido', reread.dueDay === 15, String(reread.dueDay));
check('telefone persistido', reread.phone === '(51) 98888-1111', reread.phone);
check('data de entrada persistida', reread.joinedAt === '2026-02-01', reread.joinedAt);
check('situação persistida', reread.status === 'lesionado', reread.status);
check('observações persistidas', reread.notes === 'Capitão do elenco', reread.notes);

// ---------------------------------------------------------------- permissões

console.log('\n== permissões ==');
const viewerEdit = await call(`/api/squad/players/${player.id}`, {
  method: 'PUT',
  cookie: viewer,
  body: { fullName: 'Alterado indevidamente', position: 'Meia' },
});
check('sem squad.edit a API recusa a edição', viewerEdit.status === 403, String(viewerEdit.status));

const viewerDelete = await call(`/api/squad/players/${player.id}`, { method: 'DELETE', cookie: viewer });
check('sem squad.delete a API recusa a remoção', viewerDelete.status === 403, String(viewerDelete.status));
check(
  'a recusa não alterou o jogador',
  (await call(`/api/squad/players/${player.id}`, { cookie: admin })).json.data.name ===
    'Diego Marchetti Silva',
);

// --------------------------------------------------------- exclusão/inativação

console.log('\n== saída do elenco ==');
const disposable = (
  await call('/api/squad/players', {
    method: 'POST',
    cookie: admin,
    body: { fullName: 'Cadastro Enganado', position: 'Zagueiro', joinedAt: '2026-03-01', monthlyFee: 0, dueDay: 10 },
  })
).json.data;

const erased = await call(`/api/squad/players/${disposable.id}`, { method: 'DELETE', cookie: admin });
check('sem histórico o cadastro é removido', erased.json?.mode === 'removido', erased.text.slice(0, 140));
check(
  'a pessoa do jogador removido continua existindo',
  (await call(`/api/people/${disposable.personId}`, { cookie: admin })).status === 200,
);

// Now one that carries history.
const due = await call('/api/finance/dues', {
  method: 'POST',
  cookie: admin,
  body: {
    playerId: player.id,
    referenceMonth: '2026-09',
    dueDate: '2026-09-15',
    expectedAmount: 250,
    status: 'pendente',
  },
});
check('mensalidade lançada para o jogador', due.status === 201, due.text.slice(0, 140));

const detail = (await call(`/api/squad/players/${player.id}`, { cookie: admin })).json.data;
check('detalhe informa o histórico vinculado', detail.history?.dues === 1, JSON.stringify(detail.history));

const retired = await call(`/api/squad/players/${player.id}`, { method: 'DELETE', cookie: admin });
check('com histórico o jogador é inativado', retired.json?.mode === 'inativado', retired.text.slice(0, 140));

const listed = (await call('/api/squad/players', { cookie: admin })).json.data;
const retiredRow = listed.find((row) => row.id === player.id);
check('o jogador continua no elenco como inativo', retiredRow?.status === 'inativo', retiredRow?.status);
check('não aparece mais entre os ativos', listed.filter((row) => row.status === 'ativo').length === 0);
check('a mensalidade foi preservada', (await count('/api/finance/dues', admin)) === 1);
check(
  'a pessoa continua no cadastro central',
  (await call(`/api/people/${player.personId}`, { cookie: admin })).status === 200,
);

// ---------------------------------------------------------------------- UI

console.log('\n== interface ==');
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

async function session(credentials, width = 1440, height = 900) {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: width < 700,
    hasTouch: width < 700,
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
  await page.goto(`${BASE}/app/jogadores`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  check('a listagem tem a coluna Ações', await page.getByRole('columnheader', { name: 'Ações' }).isVisible());
  const target = 'Diego Marchetti Silva';
  check('ação Visualizar disponível', await page.getByRole('button', { name: `Visualizar ${target}` }).isVisible());
  check('ação Editar disponível', await page.getByRole('button', { name: `Editar ${target}` }).isVisible());
  check(
    'ação Excluir/Inativar disponível',
    await page.getByRole('button', { name: `Excluir ou inativar ${target}` }).isVisible(),
  );

  // Counted here, not earlier: the disposable player above left its person
  // behind on purpose, so an older baseline would not mean anything.
  const peopleBeforeUi = await count('/api/people', admin);

  await page.getByRole('button', { name: `Editar ${target}` }).click();
  await page.waitForTimeout(900);
  check('o formulário abre em modo de edição', await page.getByText('Editar jogador').isVisible());
  check('o botão confirma a edição', await page.getByRole('button', { name: 'Salvar alterações' }).isVisible());
  check('carrega o nome atual', (await page.getByLabel(/^Nome\*?$/).inputValue()) === target);
  check('carrega o número atual', (await page.getByLabel('Número da camisa').inputValue()) === '9');
  check('carrega a mensalidade atual', (await page.getByLabel('Valor mensal').inputValue()) === '250');
  check('carrega as observações atuais', (await page.getByLabel('Observações').inputValue()).includes('Capitão'));
  await page.screenshot({ path: `${SHOTS}/editar.png` });

  // Editing the row must not open a second registration.
  await page.getByLabel(/^Nome\*?$/).fill('Diego Marchetti Neto');
  await page.getByLabel('Número da camisa').fill('7');
  await page.getByLabel('Valor mensal').fill('300');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await page.waitForTimeout(2200);

  check('o formulário fecha após salvar', (await page.getByRole('button', { name: 'Salvar alterações' }).count()) === 0);
  const body = await page.locator('body').innerText();
  check('a listagem mostra o nome novo', body.includes('Diego Marchetti Neto'));

  const persisted = (await call(`/api/squad/players/${player.id}`, { cookie: admin })).json.data;
  check('a alteração da interface foi persistida', persisted.name === 'Diego Marchetti Neto', persisted.name);
  check('o número da interface foi persistido', persisted.shirtNumber === 7, String(persisted.shirtNumber));
  check('a mensalidade da interface foi persistida', persisted.monthlyFee === 300, String(persisted.monthlyFee));
  check('a interface não duplicou o jogador', (await count('/api/squad/players', admin)) === 1);
  check('a interface não duplicou a pessoa', (await count('/api/people', admin)) === peopleBeforeUi);

  // Removal, on a player that carries history: the dialog has to say so.
  await page.getByRole('button', { name: /^Excluir ou inativar/ }).click();
  await page.waitForTimeout(1500);
  const dialog = await page.locator('body').innerText();
  check('a confirmação é apresentada', dialog.includes('Inativar jogador?'));
  check('a confirmação explica o histórico', /mensalidade/i.test(dialog), dialog.slice(0, 200));
  check('a confirmação garante a pessoa', dialog.includes('cadastro central'));
  await page.screenshot({ path: `${SHOTS}/confirmar.png` });

  await page.getByRole('button', { name: 'Cancelar' }).click();
  await page.waitForTimeout(700);
  check('cancelar não executa nada', (await count('/api/squad/players', admin)) === 1);

  await page.getByRole('button', { name: /^Excluir ou inativar/ }).click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Inativar jogador' }).click();
  await page.waitForTimeout(2200);
  check('a listagem é atualizada após a operação', (await page.locator('body').innerText()).includes('Inativo'));
  check('a mensalidade seguiu preservada', (await count('/api/finance/dues', admin)) === 1);
  check('a interface não gerou erro', errors.length === 0, errors.join(' | '));
  await context.close();
}

{
  const { context, page, errors } = await session(VIEWER);
  await page.goto(`${BASE}/app/jogadores`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  check('conta sem permissão ainda vê o elenco', await page.getByRole('columnheader', { name: 'Ações' }).isVisible());
  check('conta sem permissão não vê Editar', (await page.getByRole('button', { name: /^Editar / }).count()) === 0);
  check(
    'conta sem permissão não vê Excluir',
    (await page.getByRole('button', { name: /^Excluir ou inativar/ }).count()) === 0,
  );
  check('conta sem permissão ainda pode visualizar', (await page.getByRole('button', { name: /^Visualizar / }).count()) > 0);
  check('sem erros na conta limitada', errors.length === 0, errors.join(' | '));
  await context.close();
}

{
  const { context, page } = await session(ADMIN, 390, 844);
  await page.goto(`${BASE}/app/jogadores`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  check(
    'no mobile a página não estoura na horizontal',
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  );
  check('as ações continuam alcançáveis no mobile', (await page.getByRole('button', { name: /^Editar / }).count()) > 0);
  await page.screenshot({ path: `${SHOTS}/mobile.png` });
  await context.close();
}

await browser.close();

console.log(`\n${passed} verificações passaram, ${failures.length} falharam.`);
if (failures.length) {
  console.log(failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
