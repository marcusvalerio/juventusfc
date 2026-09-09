/**
 * Drives the required end-to-end journey through the real interface:
 * onboarding → login → CRUD → persistence across a reload → logout → export.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.UI_BASE ?? 'http://127.0.0.1:8787';
const SHOTS = process.env.SHOTS ?? '/tmp/ui';
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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));

const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}.png` });

console.log('\n== portal e onboarding ==');
// On an unconfigured instance the root leads straight to first access; the
// editorial portal returns once the club exists (covered in first-access.e2e).
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
check('raiz leva ao primeiro acesso', new URL(page.url()).pathname === '/onboarding', page.url());
check(
  'primeiro acesso apresenta a configuração',
  (await page.locator('body').innerText()).includes('Identidade do clube'),
);
await shot('01-primeiro-acesso');

// A protected route must bounce to onboarding while no club exists.
await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
check('rota protegida redireciona para onboarding', page.url().includes('/onboarding'));
await shot('02-onboarding-1');

await page.getByLabel('Nome oficial').fill('Juventus Futebol Clube');
await page.getByLabel('Nome curto').fill('Juventus F.C.');
await page.getByLabel('Ano de fundação').fill('1934');
await page.getByLabel('Cidade').fill('São Paulo');
await page.getByLabel('Estado').fill('SP');
await page.getByLabel('Estádio ou campo principal').fill('Estádio Rua Javari');
await page.getByRole('button', { name: 'Continuar' }).click();
await page.waitForTimeout(700);
check('etapa 2 — estrutura esportiva', await page.getByRole('heading', { name: 'Estrutura esportiva' }).isVisible());
await shot('03-onboarding-2');

await page.getByRole('button', { name: 'Continuar' }).click();
await page.waitForTimeout(700);
await page.getByLabel('Mensalidade padrão').fill('180');
await page.getByRole('button', { name: 'Continuar' }).click();
await page.waitForTimeout(700);
await page.getByRole('button', { name: 'Continuar' }).click();
await page.waitForTimeout(700);
check('etapa 5 — primeiro administrador', await page.getByLabel('Usuário').isVisible());

// Password rules are enforced before the request leaves the browser.
await page.getByLabel('Nome completo').fill('Marcus Valério');
await page.getByLabel('Usuário').fill('marcus');
await page.getByLabel(/^Senha\*?$/).fill('123');
await page.getByLabel('Confirmar senha').fill('123');
await page.getByRole('button', { name: 'Concluir configuração' }).click();
await page.waitForTimeout(600);
check('valida senha fraca no formulário', await page.getByText(/ao menos 8 caracteres/i).isVisible());
await shot('04-onboarding-validacao');

await page.getByLabel(/^Senha\*?$/).fill('juventus2026');
await page.getByLabel('Confirmar senha').fill('outrasenha1');
await page.getByRole('button', { name: 'Concluir configuração' }).click();
await page.waitForTimeout(600);
check('valida confirmação de senha', await page.getByText(/não conferem/i).isVisible());

await page.getByLabel('Confirmar senha').fill('juventus2026');
await page.getByRole('button', { name: 'Concluir configuração' }).click();
await page.waitForURL(/\/app$/, { timeout: 15000 });
await page.waitForTimeout(2000);
check('onboarding conclui e entra na plataforma', page.url().endsWith('/app'));
await shot('05-dashboard-vazio');

console.log('\n== dashboard com banco vazio ==');
// innerText applies text-transform, so section labels come back uppercased.
const bodyText = (await page.locator('body').innerText()).toLowerCase();
check('dashboard mostra checklist de primeiros passos', bodyText.includes('primeiros passos'));
check('jogadores zerados, sem número inventado', /jogadores ativos\s*0\s/.test(bodyText), 'não encontrou 0 jogadores');
check('saudação usa o nome real do administrador', bodyText.includes('marcus'));
check('nome do clube aparece no painel', bodyText.includes('juventus f.c.'));

console.log('\n== cadastro de pessoa ==');
await page.goto(`${BASE}/app/pessoas`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.getByRole('button', { name: 'Nova pessoa' }).first().click();
await page.waitForTimeout(600);
await page.getByLabel('Nome completo').fill('Diego Marchetti');
await page.getByLabel('Apelido').fill('Diego');
await page.getByLabel('Telefone').fill('(11) 98515-2288');
await page.getByRole('button', { name: 'Salvar' }).click();
await page.waitForTimeout(1800);
check('pessoa aparece na tabela', (await page.locator('tbody').innerText()).includes('Diego Marchetti'));
await shot('06-pessoas');

console.log('\n== vínculo de jogador ==');
await page.goto(`${BASE}/app/jogadores`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
check('elenco começa vazio', (await page.locator('body').innerText()).includes('Nenhum jogador'));
await page.getByRole('button', { name: 'Novo jogador' }).first().click();
await page.waitForTimeout(600);
await page.getByLabel(/^Nome\*?$/).fill('Rafael Corsini');
await page.getByLabel('Número da camisa').fill('1');
await page.getByLabel('Data de entrada').fill('2026-01-15');
await page.getByLabel('Valor mensal').fill('180');
await page.getByRole('button', { name: 'Salvar' }).click();
await page.waitForTimeout(1800);
const squadText = await page.locator('body').innerText();
check('jogador cadastrado aparece no elenco', squadText.includes('Rafael Corsini'));
check('contador do elenco reflete o cadastro', /1 ativos/.test(squadText) || /1 no total/.test(squadText), squadText.slice(0, 200));
await shot('07-jogadores');

console.log('\n== persistência após recarregar ==');
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1800);
check('dados continuam após refresh', (await page.locator('body').innerText()).includes('Rafael Corsini'));

await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1800);
const dash = (await page.locator('body').innerText()).toLowerCase();
check('dashboard passa a contar 1 jogador', /jogadores ativos\s*1\s/.test(dash), 'contador não atualizou');
check('atividade recente registra as ações', dash.includes('jogador cadastrado') || dash.includes('pessoa cadastrada'));
await shot('08-dashboard-com-dados');

console.log('\n== lançamento financeiro ==');
await page.goto(`${BASE}/app/entradas`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.getByRole('button', { name: 'Nova entrada' }).first().click();
await page.waitForTimeout(600);
await page.getByLabel(/^Data\*?$/).fill('2026-09-05');
await page.getByLabel(/^Valor\*?$/).fill('3500');
await page.getByRole('textbox', { name: 'Descrição' }).fill('Patrocínio Grimaldi');
await page.getByRole('textbox', { name: 'Origem' }).fill('Grimaldi Materiais');
await page.getByRole('button', { name: 'Salvar' }).click();
await page.waitForTimeout(1800);
check('entrada registrada', (await page.locator('body').innerText()).includes('Patrocínio Grimaldi'));
await shot('09-entradas');

console.log('\n== exportação Excel ==');
await page.goto(`${BASE}/app/relatorios`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
await page.getByRole('button', { name: 'Exportar Excel' }).first().click();
const download = await downloadPromise;
check('download do .xlsx dispara pela interface', download.suggestedFilename().endsWith('.xlsx'),
  download.suggestedFilename());
await download.saveAs(`${SHOTS}/${download.suggestedFilename()}`);
await shot('10-relatorios');

console.log('\n== autorizações na interface ==');
await page.goto(`${BASE}/app/configuracoes`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.getByRole('tab', { name: 'Acesso' }).click();
await page.waitForTimeout(1200);
check('lista de contas carrega', (await page.locator('body').innerText()).includes('marcus'));
await page.getByRole('button', { name: 'Nova conta' }).click();
await page.waitForTimeout(700);
await page.getByLabel('Pessoa').selectOption({ label: 'Diego Marchetti' });
await page.getByLabel('Usuário').fill('diego');
await page.getByLabel(/^Senha\*?$/).fill('atleta2026');
await page.getByRole('button', { name: 'Visualizar' }).first().click();
await page.getByRole('button', { name: 'Salvar' }).click();
await page.waitForTimeout(1800);
check('conta limitada criada', (await page.locator('body').innerText()).includes('diego'));
await shot('11-contas');

console.log('\n== logout e novo login ==');
await page.locator('header button[aria-label="Conta"]').click();
await page.waitForTimeout(500);
await page.getByRole('menuitem', { name: 'Sair' }).click();
await page.waitForURL(/\/entrar/, { timeout: 10000 });
await page.waitForTimeout(1200);
check('logout leva à tela de login', page.url().includes('/entrar'));
await shot('12-login');

await page.goto(`${BASE}/app/pessoas`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
check('rota protegida exige login', page.url().includes('/entrar'));

await page.getByLabel('Usuário').fill('diego');
await page.getByLabel(/^Senha\*?$/).fill('atleta2026');
await page.getByRole('button', { name: 'Entrar' }).click();
await page.waitForTimeout(2500);
const limitedText = await page.locator('body').innerText();
check('conta limitada entra no sistema', page.url().includes('/app'));
check('menu esconde seções sem autorização', !limitedText.includes('Fluxo de Caixa'), 'financeiro visível');
check('menu mantém a seção autorizada', limitedText.includes('Pessoas'));
await shot('13-conta-limitada');

await page.goto(`${BASE}/app/fluxo-de-caixa`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
check('acesso direto sem autorização é bloqueado',
  (await page.locator('body').innerText()).includes('Sem autorização'));
await shot('14-sem-autorizacao');

console.log('\n== mobile ==');
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
mobile.on('pageerror', (error) => pageErrors.push(`mobile: ${error.message}`));
await mobile.goto(`${BASE}/entrar`, { waitUntil: 'domcontentloaded' });
await mobile.waitForTimeout(1200);
await mobile.getByLabel('Usuário').fill('marcus');
await mobile.getByLabel('Senha').fill('juventus2026');
await mobile.getByRole('button', { name: 'Entrar' }).click();
await mobile.waitForTimeout(2500);
await mobile.goto(`${BASE}/app/jogos`, { waitUntil: 'domcontentloaded' });
await mobile.waitForTimeout(1800);

const overflow = await mobile.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
);
check('sem overflow horizontal a 390px', overflow <= 0, `overflow ${overflow}px`);
await mobile.screenshot({ path: `${SHOTS}/15-mobile-jogos.png`, fullPage: false });

// The reported bug: short badges such as "Casa"/"Fora" wrapping on narrow screens.
await mobile.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
await mobile.waitForTimeout(2000);
const badgeWrap = await mobile.evaluate(() => {
  const badges = [...document.querySelectorAll('span')].filter((el) =>
    ['Casa', 'Fora'].includes(el.textContent?.trim() ?? ''),
  );
  return badges.map((el) => {
    const style = getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight) || 20;
    return { text: el.textContent?.trim(), height: el.getBoundingClientRect().height, lineHeight };
  });
});
check(
  'badges Casa/Fora não quebram em duas linhas',
  badgeWrap.every((badge) => badge.height <= badge.lineHeight + 6),
  JSON.stringify(badgeWrap),
);
await mobile.screenshot({ path: `${SHOTS}/16-mobile-dashboard.png` });

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
