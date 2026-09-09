# Testes

Ambos os testes rodam contra o Worker e o banco D1 reais — não há mock nem stub.

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
npm run test:api        # API end-to-end (64 verificações)
node tests/ui.e2e.mjs   # jornada pela interface com Playwright
```

Variáveis opcionais: `API_BASE`, `UI_BASE` (padrão `http://127.0.0.1:8787`) e
`SHOTS` (diretório das capturas de tela do teste de UI).

Cada roteiro precisa de um banco recém-criado, porque começa verificando o
estado inicial sem clube. Rode `npm run db:reset` e reinicie o Worker entre
execuções.
