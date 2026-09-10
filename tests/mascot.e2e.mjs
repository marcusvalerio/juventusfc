/**
 * Exercises the mascot layer against the real Worker and the real interface.
 *
 * The mascot is decoration, so most of what is checked here is what it must
 * NOT do: cover a control, swallow a click, move under reduced motion, or
 * download the 3D stack while there is no model to render. The one thing it
 * must do — answer the pointer, within its budget, and settle back — is
 * measured from the custom properties the motion engine publishes.
 */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const BASE = process.env.UI_BASE ?? 'http://127.0.0.1:8787';
const SHOTS = process.env.SHOTS ?? '/tmp/mascot';
mkdirSync(SHOTS, { recursive: true });

const USER = 'mascote.teste';
const PASSWORD = 'Mascote#2026';

/** Degrees the brief allows. Anything beyond this reads as a gimmick. */
const ROTATION_LIMIT = 6;

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

const overlaps = (a, b) =>
  Boolean(a && b) &&
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

const deg = (value) => Number.parseFloat(String(value).replace('deg', '')) || 0;

const readPose = (page) =>
  page.evaluate(() => {
    const stage = document.querySelector('[data-mascot-stage]');
    if (!stage) return null;
    const style = getComputedStyle(stage);
    return {
      rx: style.getPropertyValue('--mascot-rx').trim(),
      ry: style.getPropertyValue('--mascot-ry').trim(),
    };
  });

/** A real, minimal GLB — the model path is exercised, not simulated. */
const MODEL = readFileSync(new URL('./fixtures/minimal-model.glb', import.meta.url));

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

async function openContext({
  width,
  height,
  reducedMotion = false,
  blockWebGL = false,
  /** 'granted' | 'denied' installs an iOS-style permission gate before load. */
  orientationPermission = null,
} = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: width < 700,
    hasTouch: width < 700,
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
  });
  if (blockWebGL) {
    // A machine with no usable GPU context, from the page's point of view.
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
        if (String(kind).includes('webgl') || String(kind).includes('experimental')) return null;
        return original.call(this, kind, ...rest);
      };
    });
  }
  if (orientationPermission) {
    await context.addInitScript((outcome) => {
      // What Safari on iOS does: the sensor exists but stays shut until a
      // gesture asks for it.
      window.DeviceOrientationEvent.requestPermission = () => Promise.resolve(outcome);
    }, orientationPermission);
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  return { context, page, errors, requests };
}

/** Serves the fixture at the model path, so `Mascot3D` finds a real GLB. */
const serveModel = (page) =>
  page.route('**/models/juventus-mascot.glb', (route) =>
    route.fulfill({ status: 200, contentType: 'model/gltf-binary', body: MODEL }),
  );

/** Feeds one device-orientation reading, the way a handset would. */
const tilt = (page, beta, gamma) =>
  page.evaluate(
    ([b, g]) =>
      window.dispatchEvent(
        Object.assign(new Event('deviceorientation'), { alpha: 0, beta: b, gamma: g }),
      ),
    [beta, gamma],
  );

// ---------------------------------------------------------------- preparation

console.log('\n== preparação ==');
const bootstrap = await fetch(`${BASE}/api/bootstrap`).then((r) => r.json());
if (bootstrap.needsOnboarding) {
  const created = await fetch(`${BASE}/api/onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
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
        fullName: 'Jefferson Souza',
        username: USER,
        password: PASSWORD,
        confirmPassword: PASSWORD,
      },
    }),
  });
  check('clube configurado para o roteiro', created.ok, String(created.status));
} else {
  // The suite signs in for real, so it needs the account it created itself.
  console.log(
    'FAIL  instância já configurada — rode `npm run db:reset` e reinicie o Worker.',
  );
  await browser.close();
  process.exit(1);
}

// --------------------------------------------------------------- home desktop

console.log('\n== home — desktop ==');
{
  const { context, page, errors, requests } = await openContext({ width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const mascot = page.locator('[data-mascot="home"]');
  check('mascote presente na home', await mascot.isVisible());
  check(
    'arte do mascote carregada',
    await page.locator('[data-mascot="home"] img').evaluate((img) => img.naturalWidth > 0),
  );

  // The figure now spans the right half of the page as a background layer, so
  // comparing element boxes proves nothing: an element's box is wider than the
  // glyphs it paints, and the mascot's box is wider than the art inside it
  // (object-contain letterboxes it). What matters is where ink actually lands,
  // so both sides are measured as painted rectangles.
  const art = await page.evaluate(() => {
    const img = document.querySelector('[data-mascot="home"] img');
    const box = img.getBoundingClientRect();
    const ratio = img.naturalWidth / img.naturalHeight;
    let { width, height } = box;
    if (width / height > ratio) width = height * ratio;
    else height = width / ratio;
    // object-contain with object-bottom: centred across, sitting on the base.
    return { x: box.x + (box.width - width) / 2, y: box.y + (box.height - height), width, height };
  });
  const textRect = (selector) =>
    page.evaluate((sel) => {
      const range = document.createRange();
      range.selectNodeContents(document.querySelector(sel));
      const r = range.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }, selector);

  check('mascote não cobre o título', !overlaps(art, await textRect('h1')));
  check('mascote não cobre a chamada', !overlaps(art, await textRect('h1 + div p, section p')));
  check(
    'mascote não cobre o CTA',
    !overlaps(art, await page.getByRole('link', { name: /Acessar a plataforma/ }).boundingBox()),
  );

  // The figure passes behind the header, as the reference composition does.
  // What has to hold is the painting order, not separation.
  const stacking = await page.evaluate(() => {
    const z = (el) => Number(getComputedStyle(el).zIndex) || 0;
    return {
      mascot: z(document.querySelector('[data-slot="mascot-3d"]')),
      header: z(document.querySelector('header')),
      statement: z(document.querySelector('h1').closest('div')),
    };
  });
  check(
    'mascote pinta atrás do cabeçalho e do texto',
    stacking.mascot < stacking.header && stacking.mascot < stacking.statement,
    JSON.stringify(stacking),
  );

  check(
    'palco não recebe ponteiro',
    (await page.locator('[data-mascot-stage]').first().evaluate((el) => getComputedStyle(el).pointerEvents)) ===
      'none',
  );
  const beneath = await page.evaluate(() => {
    const stage = document.querySelector('[data-mascot="home"]');
    const rect = stage.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return hit ? hit.closest('[data-mascot]') !== null : false;
  });
  check('clique atravessa o mascote', beneath === false);

  check('home sem erros de página', errors.length === 0, errors.join(' | '));
  check(
    'nenhum chunk 3D é baixado sem GLB',
    !requests.some((url) => /MascotScene|three/i.test(url)),
  );
  check(
    'mascote fica no modo estático sem GLB',
    (await mascot.getAttribute('data-mascot-mode')) === 'still',
  );

  console.log('\n== movimento — mouse ==');
  await page.mouse.move(200, 700);
  await page.waitForTimeout(1200);
  const left = await readPose(page);
  await page.mouse.move(1380, 120);
  await page.waitForTimeout(1200);
  const right = await readPose(page);

  check('mascote reage ao mouse', deg(left.ry) !== deg(right.ry), `${left.ry} → ${right.ry}`);
  check(
    'acompanha o lado do cursor',
    deg(left.ry) < deg(right.ry),
    `esquerda ${left.ry}, direita ${right.ry}`,
  );
  check(
    'inclinação vertical acompanha o cursor',
    deg(left.rx) < deg(right.rx),
    `baixo ${left.rx}, cima ${right.rx}`,
  );
  check(
    `rotação respeita o limite de ${ROTATION_LIMIT}°`,
    Math.abs(deg(right.ry)) <= ROTATION_LIMIT && Math.abs(deg(right.rx)) <= ROTATION_LIMIT,
    `${right.rx} / ${right.ry}`,
  );

  // The pointer stops; the figure eases back instead of holding the last angle.
  await page.waitForTimeout(5200);
  const settled = await readPose(page);
  check(
    'volta à posição natural quando o mouse para',
    Math.abs(deg(settled.ry)) < 0.6 && Math.abs(deg(settled.rx)) < 0.6,
    `${settled.rx} / ${settled.ry}`,
  );

  await page.screenshot({ path: `${SHOTS}/home-desktop.png` });
  await context.close();
}

// ------------------------------------------------------------------- teclado

console.log('\n== navegação por teclado ==');
{
  const { context, page } = await openContext({ width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const reached = [];
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press('Tab');
    reached.push(await page.evaluate(() => document.activeElement?.textContent?.trim() ?? ''));
  }
  check('teclado alcança o acesso do topo', reached.some((text) => text === 'Acessar'));
  check(
    'teclado alcança o CTA principal',
    reached.some((text) => text.includes('Acessar a plataforma')),
  );
  check(
    'mascote nunca recebe foco',
    await page.evaluate(() => !document.activeElement?.closest('[data-mascot]')),
  );
  await context.close();
}

// -------------------------------------------------------------- reduced motion

console.log('\n== reduced motion ==');
{
  const { context, page, errors } = await openContext({
    width: 1440,
    height: 900,
    reducedMotion: true,
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.mouse.move(1380, 120);
  await page.waitForTimeout(1200);
  const first = await readPose(page);
  await page.mouse.move(120, 800);
  await page.waitForTimeout(1200);
  const second = await readPose(page);

  check(
    'mascote fica imóvel com reduced motion',
    deg(first.ry) === 0 && deg(second.ry) === 0 && deg(first.rx) === 0 && deg(second.rx) === 0,
    JSON.stringify({ first, second }),
  );
  check(
    'figura não recebe transform com reduced motion',
    (await page.evaluate(() => {
      const stage = document.querySelector('[data-mascot-stage]');
      return getComputedStyle(stage.lastElementChild).transform;
    })) === 'none',
  );
  check('mascote continua visível com reduced motion', await page.locator('[data-mascot] img').first().isVisible());
  check('reduced motion sem erros', errors.length === 0, errors.join(' | '));
  await context.close();
}

// ------------------------------------------------------------ webgl ausente

console.log('\n== WebGL indisponível ==');
{
  const { context, page, errors, requests } = await openContext({
    width: 1440,
    height: 900,
    blockWebGL: true,
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  check('home continua de pé sem WebGL', await page.getByRole('heading', { level: 1 }).isVisible());
  check('composição estática assume sem WebGL', await page.locator('[data-mascot] img').first().isVisible());
  check('nenhum chunk 3D é baixado sem WebGL', !requests.some((url) => /MascotScene|three/i.test(url)));
  check('sem WebGL não gera erro', errors.length === 0, errors.join(' | '));
  await context.close();
}

// ----------------------------------------------------------- GLB disponível

console.log('\n== GLB disponível ==');
{
  const { context, page, errors, requests } = await openContext({ width: 1440, height: 900 });
  await serveModel(page);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const mascot = page.locator('[data-mascot="home"]');
  check(
    'camada 3D é baixada quando o modelo existe',
    requests.some((url) => /MascotScene/i.test(url)),
  );
  check('mascote passa para o modo modelo', (await mascot.getAttribute('data-mascot-mode')) === 'model');
  check('cena WebGL é montada', (await page.locator('[data-mascot="home"] canvas').count()) === 1);
  check('GLB válido não gera erro', errors.length === 0, errors.join(' | '));
  check(
    'palco continua sem receber ponteiro com o modelo',
    (await page.locator('[data-mascot-stage]').first().evaluate((el) => getComputedStyle(el).pointerEvents)) ===
      'none',
  );

  // The same engine has to drive the mesh: the pose is published either way.
  await page.mouse.move(200, 700);
  await page.waitForTimeout(1200);
  const left = await readPose(page);
  await page.mouse.move(1380, 120);
  await page.waitForTimeout(1200);
  const right = await readPose(page);
  check('modelo responde ao mouse pelo mesmo motor', deg(left.ry) < deg(right.ry), `${left.ry} → ${right.ry}`);
  check(
    `modelo respeita o limite de ${ROTATION_LIMIT}°`,
    Math.abs(deg(right.ry)) <= ROTATION_LIMIT && Math.abs(deg(right.rx)) <= ROTATION_LIMIT,
  );

  console.log('\n== contexto WebGL perdido ==');
  await page.evaluate(() => {
    const canvas = document.querySelector('[data-mascot="home"] canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    // The extension is how a driver reset is reproduced from script.
    const lose = context?.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    else canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  });
  await page.waitForTimeout(1500);

  check(
    'perda de contexto volta para a composição estática',
    (await mascot.getAttribute('data-mascot-mode')) === 'still',
  );
  check('composição estática reaparece após a perda', await page.locator('[data-mascot] img').first().isVisible());
  check('perda de contexto não quebra a página', await page.getByRole('heading', { level: 1 }).isVisible());
  check('perda de contexto não deixa erro', errors.length === 0, errors.join(' | '));
  await context.close();
}

// ------------------------------------------------------- GLB presente e inválido

console.log('\n== GLB presente ==');
{
  const { context, page, errors, requests } = await openContext({ width: 1440, height: 900 });
  // Stands in for a published model: the probe sees a real binary content type,
  // so the 3D layer is fetched — and the payload is deliberately unusable, so
  // the fallback path is exercised at the same time.
  await page.route('**/models/juventus-mascot.glb', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'model/gltf-binary',
      body: Buffer.from('glTF nao e um modelo valido'),
    }),
  );
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  check(
    'camada 3D é buscada quando o modelo existe',
    requests.some((url) => /MascotScene/i.test(url)),
  );
  check(
    'GLB inválido não quebra a página',
    await page.getByRole('heading', { level: 1 }).isVisible(),
  );
  check(
    'GLB inválido volta para a composição estática',
    await page.locator('[data-mascot] img').first().isVisible(),
  );
  check(
    'GLB inválido não deixa erro na página',
    errors.length === 0,
    errors.join(' | '),
  );
  await context.close();
}

// ------------------------------------------------------------------- sensores

console.log('\n== sensores ==');
{
  const { context, page, errors } = await openContext({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  check(
    'sem pedido de permissão o controle não aparece',
    (await page.getByRole('button', { name: /Ativar movimento/i }).count()) === 0,
  );

  // The first reading is what "level" means for this visitor.
  await tilt(page, 0, 0);
  await page.waitForTimeout(900);
  const neutral = await readPose(page);
  await tilt(page, 0, 22);
  await page.waitForTimeout(1200);
  const right = await readPose(page);
  await tilt(page, 0, -22);
  await page.waitForTimeout(1200);
  const left = await readPose(page);

  check('mascote reage à inclinação do aparelho', deg(right.ry) !== deg(left.ry), `${left.ry} vs ${right.ry}`);
  check('inclinação acompanha o lado do aparelho', deg(left.ry) < deg(right.ry));
  check(
    'a primeira leitura vira o repouso',
    Math.abs(deg(neutral.ry)) < 1,
    neutral.ry,
  );
  check(
    `sensor respeita o limite de ${ROTATION_LIMIT}°`,
    Math.abs(deg(right.ry)) <= ROTATION_LIMIT && Math.abs(deg(left.ry)) <= ROTATION_LIMIT,
  );

  await tilt(page, 12, 0);
  await page.waitForTimeout(1200);
  const forward = await readPose(page);
  check('inclinação frente/trás move o eixo vertical', deg(forward.rx) !== deg(neutral.rx), forward.rx);
  check('sensores sem erros', errors.length === 0, errors.join(' | '));
  await context.close();
}

console.log('\n== permissão de sensor ==');
{
  const { context, page, errors } = await openContext({
    width: 390,
    height: 844,
    orientationPermission: 'granted',
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const chip = page.getByRole('button', { name: /Ativar movimento/i });
  check('permissão exigida oferece um controle discreto', await chip.isVisible());

  // Before the gesture the sensor must be inert. The idle breathing is ±0.5°,
  // so anything under a degree means nothing but the drift is moving.
  await tilt(page, 0, 25);
  await page.waitForTimeout(1200);
  check(
    'sensor fica inerte antes do gesto',
    Math.abs(deg((await readPose(page)).ry)) < 1.2,
    (await readPose(page)).ry,
  );
  // The control is the one thing inside the mascot that takes a click.
  await chip.click();
  await page.waitForTimeout(800);
  check('controle some depois de concedida', (await chip.count()) === 0);

  await tilt(page, 0, 0);
  await page.waitForTimeout(700);
  await tilt(page, 0, 22);
  await page.waitForTimeout(1200);
  check('sensor passa a mover o mascote após a permissão', Math.abs(deg((await readPose(page)).ry)) > 2);
  check('permissão concedida sem erros', errors.length === 0, errors.join(' | '));
  await context.close();
}

{
  const { context, page, errors } = await openContext({
    width: 390,
    height: 844,
    orientationPermission: 'denied',
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const chip = page.getByRole('button', { name: /Ativar movimento/i });
  check('recusa também parte de um controle', await chip.isVisible());
  await chip.click();
  await page.waitForTimeout(800);
  check('recusa não insiste', (await chip.count()) === 0);
  check('recusa mantém o mascote visível', await page.locator('[data-mascot] img').first().isVisible());
  check('recusa mantém a página utilizável', await page.getByRole('heading', { level: 1 }).isVisible());
  await tilt(page, 0, 25);
  await page.waitForTimeout(1200);
  check(
    'sem permissão o mascote fica no repouso',
    Math.abs(deg((await readPose(page)).ry)) < 1.2,
    (await readPose(page)).ry,
  );
  check('recusa sem erros', errors.length === 0, errors.join(' | '));
  await context.close();
}

{
  const { context, page } = await openContext({ width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  check(
    'no desktop o controle de sensor não é oferecido',
    (await page.getByRole('button', { name: /Ativar movimento/i }).count()) === 0,
  );
  await context.close();
}

// --------------------------------------------------------------------- login

console.log('\n== login ==');
{
  const { context, page, errors } = await openContext({ width: 1440, height: 900 });
  await page.goto(`${BASE}/entrar`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const mascot = page.locator('[data-mascot="login"]');
  check('mascote presente no login', await mascot.isVisible());
  const form = await page.locator('form').boundingBox();
  check('mascote não cobre o formulário', !overlaps(await mascot.boundingBox(), form));

  await page.getByLabel('Usuário').fill(USER);
  await page.getByLabel(/^Senha\*?$/).fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/\/app/, { timeout: 15000 });
  check('login real continua funcionando', new URL(page.url()).pathname.startsWith('/app'));
  check('login sem erros de página', errors.length === 0, errors.join(' | '));
  await page.screenshot({ path: `${SHOTS}/login-desktop.png` });
  await context.close();
}

// -------------------------------------------------------------------- mobile

console.log('\n== mobile ==');
{
  const { context, page, errors } = await openContext({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  check(
    'home mobile sem overflow horizontal',
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  );
  const mascotBox = await page.locator('[data-mascot="home"]').boundingBox();
  const headingBox = await page.getByRole('heading', { level: 1 }).boundingBox();
  check('mascote não cobre o texto no mobile', !overlaps(mascotBox, headingBox));
  await page.screenshot({ path: `${SHOTS}/home-mobile.png` });

  await page.goto(`${BASE}/entrar`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  check(
    'login mobile sem overflow horizontal',
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  );
  check('mascote presente no login mobile', await page.locator('[data-mascot]').first().isVisible());
  // Effective opacity: the mascot inherits it from an ancestor, not from itself.
  const opacity = await page.evaluate(() => {
    let node = document.querySelector('[data-mascot]');
    let value = 1;
    while (node && node !== document.body) {
      value *= Number(getComputedStyle(node).opacity);
      node = node.parentElement;
    }
    return value;
  });
  check('mascote fica ao fundo no login mobile', opacity <= 0.2, String(opacity));
  check('formulário continua utilizável no mobile', await page.getByLabel('Usuário').isEditable());
  check('mobile sem erros de página', errors.length === 0, errors.join(' | '));
  await page.screenshot({ path: `${SHOTS}/login-mobile.png` });
  await context.close();
}

await browser.close();

console.log(`\n${passed} verificações passaram, ${failures.length} falharam.`);
if (failures.length) {
  console.log(failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
