# Testes

Todos os roteiros rodam contra o Worker e o banco D1 reais — não há mock nem stub.

## Preparação

```bash
npm run build          # os testes de UI usam os assets servidos pelo Worker
npm run db:reset       # os roteiros começam do estado sem clube
npx wrangler dev --port 8787 --local
```

> O `wrangler dev` lê `dist/` na inicialização; depois de um novo build,
> reinicie o processo.

## Execução

```bash
npm run test:api            # API end-to-end (68 verificações)
npm run test:ui             # jornada pela interface com Playwright (31)
npm run test:first-access   # fluxo de primeiro acesso, casos A–G (38)
npm run test:mascot         # mascote: movimento, fallbacks e acessibilidade (72)
npm run test:password-reset # recuperação de senha, ponta a ponta (55)
```

O roteiro do mascote cobre a Home e o Login em desktop e mobile, o limite de
rotação e o retorno ao repouso, `prefers-reduced-motion`, ausência de WebGL,
ausência de GLB (nenhum chunk 3D é baixado), um GLB válido subindo para a camada
3D, a perda do contexto WebGL e um GLB inválido caindo para a composição
estática, os sensores de orientação com e sem pedido de permissão, navegação por
teclado e o login real. O modelo usado é `fixtures/minimal-model.glb`, um GLB
mínimo porém válido — a camada 3D é exercitada de verdade, não simulada.

O roteiro de recuperação de senha exercita solicitação, indistinguibilidade das
respostas, ciclo de vida do token (válido, invalidado, expirado, reutilizado),
política de senha, revogação de sessões, limite de solicitações e a jornada pela
interface. Ele lê a caixa de entrada abrindo o arquivo SQLite local direto: o
sink de e-mail de desenvolvimento não tem rota HTTP. Duas verificações precisam
da saída do Worker:

```bash
npx wrangler dev --port 8787 --local > /tmp/worker.log 2>&1 &
WORKER_LOG=/tmp/worker.log npm run test:password-reset
```

Sem `WORKER_LOG` o roteiro falha essas duas verificações em vez de pulá-las.

Variáveis opcionais: `API_BASE`, `UI_BASE` (padrão `http://127.0.0.1:8787`) e
`SHOTS` (diretório das capturas de tela do teste de UI).

Cada roteiro precisa de um banco recém-criado, porque começa verificando o
estado inicial sem clube. Rode `npm run db:reset` e reinicie o Worker entre
execuções.
