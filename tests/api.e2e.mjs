/**
 * End-to-end exercise of the flow required by phase 2, run against a live
 * Worker with a real D1 database. Each step asserts on the response so a
 * regression fails loudly instead of printing a green message.
 */
const BASE = process.env.API_BASE ?? 'http://127.0.0.1:8787';

let passed = 0;
const failures = [];
const cookies = new Map();

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ok  ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function jar(name = 'default') {
  return cookies.get(name) ?? '';
}

async function call(path, { method = 'GET', body, session = 'default', raw = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const cookie = jar(session);
  if (cookie) headers.Cookie = cookie;

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookies.set(session, setCookie.split(';')[0]);

  if (raw) return { status: response.status, response };
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { parseError: text.slice(0, 200) };
  }
  return { status: response.status, body: json, headers: response.headers };
}

console.log('\n== 1. estado inicial ==');
let res = await call('/api/bootstrap');
check('bootstrap indica onboarding pendente', res.body?.needsOnboarding === true, JSON.stringify(res.body));

res = await call('/api/people');
check('API protegida responde 401 sem sessão', res.status === 401, `status ${res.status}`);

console.log('\n== 2. onboarding ==');
const onboardingPayload = {
  club: {
    officialName: 'Juventus Futebol Clube',
    shortName: 'Juventus F.C.',
    city: 'São Paulo',
    state: 'SP',
    country: 'Brasil',
    foundedYear: '1934',
    venue: 'Estádio Rua Javari',
    phone: '(11) 3271-4400',
    email: 'contato@juventusfc.com.br',
    website: 'juventusfc.com.br',
    social: '@juventusfc',
    primaryColor: '#08090B',
    secondaryColor: '#C9A227',
  },
  teams: ['Profissional', 'Sub-20', 'Sub-17'],
  finance: {
    defaultMonthlyFee: 180,
    defaultDueDay: 10,
    paymentMethods: ['Pix', 'Dinheiro', 'Transferência'],
    season: '2026',
  },
  admin: {
    fullName: 'Marcus Valério',
    username: 'marcus',
    password: 'juventus2026',
    confirmPassword: 'juventus2026',
    phone: '(11) 90000-0000',
    email: 'marcus@juventusfc.com.br',
  },
};

res = await call('/api/onboarding', { method: 'POST', body: onboardingPayload });
check('onboarding cria clube e administrador', res.status === 201, JSON.stringify(res.body));
check('onboarding devolve sessão autenticada', jar().includes('jfc_session='));

// CASO G — nothing about the credential may travel back to the client.
const onboardingBody = JSON.stringify(res.body ?? {});
check('resposta não devolve a senha', !onboardingBody.includes(onboardingPayload.admin.password));
check('resposta não devolve o hash', !/pbkdf2|password_hash|passwordHash/i.test(onboardingBody));

// The cookie must be unreadable by scripts and scoped safely.
const rawCookie = res.headers?.get('set-cookie') ?? '';
check('cookie de sessão é HttpOnly', /HttpOnly/i.test(rawCookie), rawCookie.slice(0, 80));
check('cookie usa SameSite=Lax', /SameSite=Lax/i.test(rawCookie), rawCookie.slice(0, 80));

res = await call('/api/onboarding', { method: 'POST', body: onboardingPayload });
check('onboarding não pode rodar duas vezes', res.status === 409, `status ${res.status}`);

res = await call('/api/bootstrap');
check('bootstrap deixa de pedir onboarding', res.body?.needsOnboarding === false);
check('bootstrap devolve o clube criado', res.body?.club?.shortName === 'Juventus F.C.');

console.log('\n== 3. sessão ==');
res = await call('/api/auth/session');
check('sessão do administrador é válida', res.status === 200 && res.body?.account?.username === 'marcus');
check('administrador é proprietário', res.body?.account?.isOwner === true);
check('administrador recebe todas as autorizações', (res.body?.account?.permissions ?? []).length >= 20,
  `${res.body?.account?.permissions?.length} permissões`);

console.log('\n== 4. clube ==');
res = await call('/api/club');
check('clube retorna dados persistidos', res.body?.club?.officialName === 'Juventus Futebol Clube');
check('categorias criadas no onboarding', (res.body?.teams ?? []).length === 3);
check('configuração financeira gravada', res.body?.settings?.defaultMonthlyFee === 180);
const teams = res.body.teams;
const profissional = teams.find((t) => t.name === 'Profissional');

console.log('\n== 5. pessoas ==');
res = await call('/api/people', {
  method: 'POST',
  body: { fullName: 'Diego Marchetti', nickname: 'Diego', phone: '(11) 98515-2288', city: 'São Bernardo do Campo', status: 'ativo' },
});
check('cria pessoa', res.status === 201 && res.body?.data?.fullName === 'Diego Marchetti', JSON.stringify(res.body));
const personId = res.body?.data?.id;

res = await call('/api/people', { method: 'POST', body: { fullName: '' } });
check('rejeita pessoa sem nome', res.status === 400 && res.body?.error?.code === 'bad_request');

res = await call('/api/people');
check('lista pessoas persistidas', res.body?.data?.length === 2, `${res.body?.data?.length} pessoas`);

console.log('\n== 6. vínculo de jogador ==');
res = await call('/api/squad/players', {
  method: 'POST',
  body: {
    personId,
    position: 'Meia',
    shirtNumber: 10,
    teamId: profissional.id,
    joinedAt: '2026-01-15',
    monthlyFee: 200,
    dueDay: 15,
    status: 'ativo',
  },
});
check('vincula pessoa como jogador', res.status === 201 && res.body?.data?.name === 'Diego Marchetti', JSON.stringify(res.body));
const playerId = res.body?.data?.id;
check('jogador herda equipe pelo id', res.body?.data?.team === 'Profissional');

res = await call('/api/squad/players', { method: 'POST', body: { personId, position: 'Meia' } });
check('impede jogador duplicado para a mesma pessoa', res.status === 409, `status ${res.status}`);

res = await call('/api/people');
const diego = res.body.data.find((p) => p.id === personId);
check('pessoa passa a exibir o vínculo jogador', diego?.roles?.includes('jogador') === true, JSON.stringify(diego?.roles));

res = await call(`/api/people/${personId}`, { method: 'DELETE' });
check('bloqueia exclusão de pessoa com vínculo', res.status === 409);

console.log('\n== 7. edição e persistência ==');
res = await call(`/api/squad/players/${playerId}`, {
  method: 'PUT',
  body: {
    personId, fullName: 'Diego Marchetti', position: 'Meia', secondaryPosition: 'Ponta',
    shirtNumber: 10, teamId: profissional.id, joinedAt: '2026-01-15',
    monthlyFee: 220, dueDay: 15, status: 'ativo',
  },
});
check('edita jogador', res.status === 200 && res.body?.data?.monthlyFee === 220);

res = await call(`/api/squad/players/${playerId}`);
check('leitura posterior mantém o valor editado', res.body?.data?.monthlyFee === 220);
check('posição secundária persistida', res.body?.data?.secondaryPosition === 'Ponta');

console.log('\n== 8. financeiro ==');
res = await call('/api/finance/dues', {
  method: 'POST',
  body: { personId, referenceMonth: '2026-09', dueDate: '2026-09-15', expectedAmount: 220, paidAmount: 220, paidAt: '2026-09-10', method: 'Pix' },
});
check('lança mensalidade paga', res.status === 201 && res.body?.data?.status === 'pago', JSON.stringify(res.body));
check('mensalidade traz o nome da pessoa', res.body?.data?.personName === 'Diego Marchetti');

res = await call('/api/finance/dues', {
  method: 'POST',
  body: { personId, referenceMonth: '2026-09', dueDate: '2026-09-15', expectedAmount: 220 },
});
check('impede mensalidade duplicada no mesmo mês', res.status === 409);

res = await call('/api/finance/income', {
  method: 'POST',
  body: { date: '2026-09-05', description: 'Patrocínio Grimaldi', category: 'Patrocínio', source: 'Grimaldi Materiais', amount: 3500, method: 'Transferência', responsible: 'Marcus Valério' },
});
check('lança entrada', res.status === 201);

res = await call('/api/finance/expenses', {
  method: 'POST',
  body: { date: '2026-09-06', description: 'Arbitragem da rodada', category: 'Arbitragem', supplier: 'Sindicato dos Árbitros', amount: 520, method: 'Pix', responsible: 'Marcus Valério' },
});
check('lança saída', res.status === 201);

res = await call('/api/finance/cash-flow?months=6');
const last = res.body?.points?.[res.body.points.length - 1];
check('fluxo de caixa calculado do banco', last?.income === 3500 && last?.expense === 520,
  JSON.stringify(last));
check('saldo acumulado correto', last?.balance === 2980, `saldo ${last?.balance}`);

console.log('\n== 9. estoque ==');
res = await call('/api/inventory/items', {
  method: 'POST',
  body: { name: 'Bola de campo oficial', category: 'Bolas', quantity: 10, unit: 'un', minQuantity: 12, location: 'Depósito' },
});
check('cria item', res.status === 201);
check('situação derivada do saldo', res.body?.data?.status === 'baixo', res.body?.data?.status);
const itemId = res.body?.data?.id;

res = await call('/api/inventory/movements', {
  method: 'POST',
  body: { itemId, type: 'entrada', quantity: 5, date: '2026-09-07', reason: 'Compra', responsible: 'Marcus Valério' },
});
check('registra entrada de estoque', res.status === 201);

res = await call('/api/inventory/items');
const bola = res.body.data.find((i) => i.id === itemId);
check('saldo atualizado junto com a movimentação', bola?.quantity === 15, `quantidade ${bola?.quantity}`);
check('situação recalculada', bola?.status === 'disponivel', bola?.status);

res = await call('/api/inventory/movements', {
  method: 'POST',
  body: { itemId, type: 'saida', quantity: 999, date: '2026-09-07', reason: 'Teste de saldo' },
});
check('impede saída maior que o saldo', res.status === 400, `status ${res.status}`);

console.log('\n== 10. dashboard real ==');
res = await call('/api/dashboard/summary');
check('dashboard conta jogadores reais', res.body?.activePlayers === 1, `${res.body?.activePlayers}`);
check('dashboard conta pessoas reais', res.body?.totalPeople === 2, `${res.body?.totalPeople}`);
check('dashboard calcula saldo real', res.body?.balance === 2980, `${res.body?.balance}`);
check('dashboard aponta estoque em alerta', res.body?.lowStockCount === 0, `${res.body?.lowStockCount}`);
check('taxa de arrecadação calculada', res.body?.dues?.collectionRate === 100, `${res.body?.dues?.collectionRate}`);

res = await call('/api/dashboard/overview');
check('atividade recente vem do banco', (res.body?.activity ?? []).length > 0, `${res.body?.activity?.length} eventos`);

console.log('\n== 11. autorizações ==');
res = await call('/api/people', {
  method: 'POST',
  body: { fullName: 'Renata Colombo', phone: '(11) 99334-8812', status: 'ativo' },
});
const limitedPersonId = res.body?.data?.id;

res = await call('/api/accounts', {
  method: 'POST',
  body: { personId: limitedPersonId, username: 'renata', password: 'secretaria2026', permissions: ['dashboard.view', 'people.view'] },
});
check('cria conta com autorizações limitadas', res.status === 201, JSON.stringify(res.body));

res = await call('/api/accounts', {
  method: 'POST',
  body: { personId: limitedPersonId, username: 'outra', password: 'x', permissions: [] },
});
check('recusa senha fraca', res.status === 400 && !!res.body?.error?.details?.password, JSON.stringify(res.body?.error));

res = await call('/api/people', { method: 'POST', body: { fullName: 'Jorge Antunes', status: 'ativo' } });
const otherPersonId = res.body?.data?.id;
res = await call('/api/accounts', {
  method: 'POST',
  body: { personId: otherPersonId, username: 'jorge', password: 'valida2026', permissions: ['inventado.total'] },
});
check('recusa autorização inexistente', res.status === 400, `status ${res.status}`);

res = await call('/api/auth/login', { method: 'POST', body: { username: 'renata', password: 'secretaria2026' }, session: 'limited' });
check('login da conta limitada', res.status === 200, JSON.stringify(res.body));

res = await call('/api/people', { session: 'limited' });
check('conta limitada lê pessoas (tem permissão)', res.status === 200);

res = await call('/api/people', {
  method: 'POST',
  body: { fullName: 'Não deveria entrar' },
  session: 'limited',
});
check('conta limitada não cria pessoa (403)', res.status === 403 && res.body?.error?.code === 'forbidden', `status ${res.status}`);

res = await call('/api/finance/income', { session: 'limited' });
check('conta limitada não acessa financeiro (403)', res.status === 403);

res = await call('/api/exports/jogadores', { session: 'limited', raw: true });
check('conta limitada não exporta (403)', res.status === 403);

console.log('\n== 12. credenciais inválidas ==');
res = await call('/api/auth/login', { method: 'POST', body: { username: 'marcus', password: 'errada' }, session: 'bad' });
check('senha errada é rejeitada', res.status === 401 && res.body?.error?.code === 'invalid_credentials');
check('erro não revela existência do usuário', res.body?.error?.message === 'Usuário ou senha incorretos.');

res = await call('/api/auth/login', { method: 'POST', body: { username: 'inexistente', password: 'qualquer' }, session: 'bad' });
check('usuário inexistente devolve a mesma mensagem', res.body?.error?.message === 'Usuário ou senha incorretos.');

console.log('\n== 13. exportação XLSX ==');
for (const kind of ['jogadores', 'pessoas', 'mensalidades', 'financeiro', 'futebol', 'estoque']) {
  const { status, response } = await call(`/api/exports/${kind}`, { raw: true });
  const buffer = new Uint8Array(await response.arrayBuffer());
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b;
  check(
    `exporta ${kind}.xlsx`,
    status === 200 && isZip && buffer.length > 500 &&
      response.headers.get('content-type')?.includes('spreadsheetml'),
    `status ${status}, ${buffer.length} bytes`,
  );
  if (status === 200) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(`${process.env.OUT_DIR ?? '/tmp'}/${kind}.xlsx`, buffer);
  }
}

console.log('\n== 14. logout e nova sessão ==');
res = await call('/api/auth/logout', { method: 'POST' });
check('logout responde ok', res.status === 200);

res = await call('/api/people');
check('sessão revogada perde acesso', res.status === 401, `status ${res.status}`);

res = await call('/api/auth/login', { method: 'POST', body: { username: 'marcus', password: 'juventus2026' } });
check('novo login funciona', res.status === 200);

res = await call('/api/squad/players');
check('dados continuam no banco após novo login', res.body?.data?.[0]?.monthlyFee === 220,
  JSON.stringify(res.body?.data?.[0]?.monthlyFee));

console.log(`\n${passed} verificações passaram, ${failures.length} falharam.`);
if (failures.length > 0) {
  console.log('\nFalhas:');
  failures.forEach((failure) => console.log(`  - ${failure}`));
  process.exit(1);
}
