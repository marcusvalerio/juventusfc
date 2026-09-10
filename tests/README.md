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
npm run test:players        # editar e retirar jogadores do elenco (61)
npm run test:dues           # mensalidades por pessoa, casos 1–10 (51)
npm run test:migration      # migração 0003 contra um banco descartável (20)
```

O roteiro de jogadores cobre a edição (mesma pessoa, mesmo registro, campo a
campo), a recusa da API para quem não tem `squad.edit`/`squad.delete`, e a saída
do elenco nos dois caminhos: remoção quando nada depende do jogador e inativação
quando há mensalidades, escalações ou treinos — verificando que esse histórico e
a pessoa continuam intactos. Inclui a jornada pela interface em desktop e
mobile.

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

O roteiro de mensalidades cobre quem pode ser cobrado — jogador, diretoria,
comissão e pessoa sem vínculo esportivo —, a pessoa com dois vínculos recebendo
uma única cobrança, a geração do mês respeitando `monthly_fee_enabled`, o bloqueio
de duplicidade, e o fato de editar ou excluir uma cobrança não tocar na pessoa
nem nos seus vínculos.

`test:migration` é o único roteiro que não precisa do Worker: ele executa os
arquivos de migration contra um SQLite descartável, semeia um clube no formato
antigo — com mensalidades presas ao jogador — e verifica que a 0003 não perde,
cria nem altera nenhuma cobrança ao movê-las para a pessoa.

Variáveis opcionais: `API_BASE`, `UI_BASE` (padrão `http://127.0.0.1:8787`) e
`SHOTS` (diretório das capturas de tela do teste de UI).

Cada roteiro precisa de um banco recém-criado, porque começa verificando o
estado inicial sem clube. Rode `npm run db:reset` e reinicie o Worker entre
execuções.
