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
npm run test:mascot         # mascote: movimento, fallbacks e acessibilidade (42)
```

O roteiro do mascote cobre a Home e o Login em desktop e mobile, o limite de
rotação e o retorno ao repouso, `prefers-reduced-motion`, ausência de WebGL,
ausência de GLB (nenhum chunk 3D é baixado), um GLB inválido caindo para a
composição estática, navegação por teclado e o login real.

Variáveis opcionais: `API_BASE`, `UI_BASE` (padrão `http://127.0.0.1:8787`) e
`SHOTS` (diretório das capturas de tela do teste de UI).

Cada roteiro precisa de um banco recém-criado, porque começa verificando o
estado inicial sem clube. Rode `npm run db:reset` e reinicie o Worker entre
execuções.
