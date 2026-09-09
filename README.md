# Juventus F.C. — Plataforma de Gestão

Sistema de gestão de clube de futebol: elenco, calendário, financeiro e patrimônio.
Frontend em React sobre uma API em Cloudflare Workers com banco Cloudflare D1.

**Fase 1** entregou a experiência visual com dados mockados.
**Fase 2** (esta) substituiu os mocks por banco de dados, API, autenticação real,
sessões, autorizações granulares, onboarding e exportação em Excel.

## Sumário

- [Arquitetura](#arquitetura)
- [Stack](#stack)
- [Instalação](#instalação)
- [Execução local](#execução-local)
- [Banco de dados](#banco-de-dados)
- [Configuração no Cloudflare](#configuração-no-cloudflare)
- [Deploy](#deploy)
- [API](#api)
- [Autenticação e sessões](#autenticação-e-sessões)
- [Autorizações](#autorizações)
- [Onboarding](#onboarding)
- [Exportação Excel](#exportação-excel)
- [Testes](#testes)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Decisões relevantes](#decisões-relevantes)

## Arquitetura

```
Navegador (React SPA)
        │  cookie HttpOnly de sessão
        ▼
Cloudflare Worker  ──  Hono, validação Zod, autorização
        │
        ▼
Cloudflare D1  ──  SQLite gerenciado, migrations versionadas
```

O mesmo Worker serve a SPA (binding `assets`, com fallback SPA para rotas
client-side) e responde em `/api/*`. Nenhuma lógica de autenticação ou acesso a
banco existe no cliente.

Preparado, ainda não habilitado: bucket **R2** para escudo, fotos e documentos.
O binding está comentado em `wrangler.jsonc` e o campo `clubs.crest_key` já existe
no schema.

## Stack

| Camada | Escolha |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion |
| API | Cloudflare Workers + Hono |
| Validação | Zod (server-side, sempre) |
| Banco | Cloudflare D1 (SQLite) |
| Senhas | PBKDF2-HMAC-SHA256 via WebCrypto |
| Planilhas | Escritor .xlsx próprio, sem dependências |
| Testes | Node + Playwright, contra Worker e D1 reais |

## Instalação

Requisitos: Node 20+ e uma conta Cloudflare (apenas para o deploy).

```bash
npm install
npm run db:migrate      # cria o banco local e aplica as migrations
```

## Execução local

```bash
npm run dev
```

Sobe dois processos em paralelo:

- **Vite** em `http://localhost:5173` — a interface, com HMR
- **Wrangler** em `http://localhost:8787` — a API e o banco D1 local

O Vite faz proxy de `/api` para o Worker, então o frontend em desenvolvimento
conversa com o banco real. Use `http://localhost:5173`.

Para validar o build exatamente como em produção (Worker servindo a SPA):

```bash
npm run preview         # build + wrangler dev em http://localhost:8787
```

> O `wrangler dev` lê `dist/` na inicialização. Depois de um novo `npm run build`,
> reinicie o processo para servir os assets atualizados.

### Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | Vite + Worker em paralelo |
| `npm run build` | Typecheck e build de produção |
| `npm run lint` | Typecheck do frontend e do Worker |
| `npm run db:migrate` | Aplica migrations no banco local |
| `npm run db:migrate:remote` | Aplica migrations no banco de produção |
| `npm run db:reset` | Apaga o banco local e recria do zero |
| `npm run test:api` | Teste end-to-end da API |
| `npm run deploy` | Build e deploy no Cloudflare |

## Banco de dados

Migrations versionadas em `migrations/`, aplicadas pelo Wrangler em ordem.
Para evoluir o schema, crie `migrations/0002_descricao.sql` — nunca edite uma
migration já aplicada.

```bash
npm run db:migrate                                        # local
npm run db:migrate:remote                                 # produção
npx wrangler d1 execute DB --local --command "select ..."  # consulta ad hoc
```

### Modelo de dados

```
clubs ──┬── club_settings          parâmetros financeiros e preferências
        ├── teams                  categorias e equipes
        ├── people ──┬── players           vínculo de atleta
        │            ├── board_members     vínculo de diretoria
        │            ├── staff_members     vínculo de comissão técnica
        │            └── accounts ── account_permissions, sessions
        ├── competitions ── matches ── lineups ── lineup_entries, lineup_staff
        ├── trainings ── training_participants
        ├── monthly_dues, income_entries, expense_entries
        ├── inventory_items ── inventory_movements
        └── activity_log
```

Regras que o schema garante:

- **Pessoa e conta são conceitos distintos.** Uma pessoa existe sem acesso ao
  sistema; a conta é opcional e aponta para ela.
- **Uma pessoa, vários vínculos.** Jogador, diretor e membro da comissão são
  linhas separadas apontando para a mesma pessoa — os dados pessoais nunca são
  duplicados. Editar a pessoa atualiza todos os vínculos.
- **Todo registro pertence a um clube** (`club_id`), então uma segunda
  organização não exige reescrita.
- **Timestamps** `created_at` e `updated_at` em toda entidade.
- **Chaves estrangeiras** com `ON DELETE` explícito, além de índices nos campos
  usados em filtro e ordenação.

Valores derivados não são armazenados: o saldo do caixa é somado do razão, e a
situação do estoque (`disponível`/`baixo`/`esgotado`) é calculada a partir da
quantidade. A exceção deliberada é `inventory_items.quantity`, que é o saldo
corrente e só muda na mesma transação da movimentação que o alterou.

## Configuração no Cloudflare

1. **Criar o banco:**

   ```bash
   npx wrangler d1 create juventusfc
   ```

2. **Copiar o `database_id`** retornado para `wrangler.jsonc`, nos dois lugares
   onde aparece `REPLACE_WITH_REAL_D1_ID` (raiz e `env.production`).

3. **Aplicar as migrations em produção:**

   ```bash
   npm run db:migrate:remote
   ```

4. **Secrets:** nenhum é necessário hoje — a sessão é assinada pelo próprio
   banco e não há chave de terceiros. Quando houver, use
   `npx wrangler secret put NOME` e leia por `env.NOME` no Worker. Nunca coloque
   segredo em `wrangler.jsonc` nem em variável `VITE_*`, que vai para o bundle
   do navegador.

5. **R2 (opcional, fase seguinte):** crie o bucket e descomente o binding
   `FILES` em `wrangler.jsonc`.

Ambientes: a raiz de `wrangler.jsonc` é o desenvolvimento; `env.production` é o
deploy. Use bancos D1 distintos para cada um.

## Deploy

```bash
npm run deploy
```

Faz o build e publica o Worker com os assets. Depois de qualquer alteração de
schema, rode `npm run db:migrate:remote` antes.

## API

Todas as respostas são JSON. Erros seguem um envelope único:

```json
{ "error": { "code": "bad_request", "message": "Dados inválidos.", "details": { "campo": "..." } } }
```

| Método | Rota | Autorização |
| --- | --- | --- |
| GET | `/api/bootstrap` | pública — diz se falta onboarding e quem está logado |
| POST | `/api/onboarding` | pública, uso único |
| POST | `/api/auth/login` | pública |
| POST | `/api/auth/logout` | sessão |
| GET | `/api/auth/session` | sessão |
| POST | `/api/auth/logout-all` | sessão |
| GET/PUT | `/api/club`, `/api/club/settings` | `settings.view` / `settings.edit` |
| POST/DELETE | `/api/club/teams`, `/api/club/teams/:id` | `settings.edit` |
| GET/POST/PUT/DELETE | `/api/people` | `people.*` |
| GET/POST/PUT/DELETE | `/api/squad/players`, `/api/squad/board`, `/api/squad/staff` | `squad.*` |
| GET/POST/PUT/DELETE | `/api/football/competitions`, `/matches`, `/trainings`, `/lineups` | `football.*` |
| GET/POST/PUT/DELETE | `/api/finance/dues`, `/income`, `/expenses` | `finance.*` |
| POST | `/api/finance/dues/generate` | `finance.create` |
| GET | `/api/finance/cash-flow?months=6` | `finance.view` |
| GET/POST/PUT/DELETE | `/api/inventory/items`, `/api/inventory/movements` | `inventory.*` |
| GET | `/api/dashboard/summary`, `/api/dashboard/overview` | `dashboard.view` |
| GET/POST/PUT/DELETE | `/api/accounts` | `accounts.view` / `accounts.manage` |
| GET | `/api/exports/:tipo` | `reports.export` |

O `club_id` sempre vem da sessão, nunca do payload: uma requisição não consegue
endereçar dados de outra organização. Ids são gerados no servidor.

## Autenticação e sessões

- Login por **usuário e senha** — e-mail não é exigido.
- Senha armazenada como `pbkdf2$sha256$210000$<salt>$<hash>`, com salt aleatório
  por conta e comparação em tempo constante. O número de iterações fica no
  próprio hash, então o custo pode subir depois sem invalidar as senhas antigas.
- A sessão é um token de 32 bytes entregue em cookie **HttpOnly**, **SameSite=Lax**
  e **Secure em produção**. No banco fica apenas o SHA-256 do token — um vazamento
  do banco não vira login.
- Expiração de 12 horas, renovada por uso (no máximo uma escrita a cada 30 min).
- Revogação: logout encerra a sessão; trocar a senha encerra todas as outras.
- Erros de login são sempre idênticos ("Usuário ou senha incorretos."), e uma
  verificação de senha também roda quando o usuário não existe, para não vazar
  por tempo de resposta quais usuários são válidos.

## Autorizações

Não existem perfis fixos. Cada conta recebe capacidades no formato
`<módulo>.<ação>`, definidas em `src/shared/permissions.ts` e usadas tanto pelo
Worker quanto pela interface:

```
dashboard.view
people.view | create | edit | delete
squad.view | create | edit | delete
football.view | create | edit | delete
finance.view | create | edit | delete
inventory.view | create | move | delete
reports.view | export
settings.view | edit
accounts.view | manage
```

O backend valida em toda rota. A interface esconde o que a conta não pode usar —
por conveniência, não como controle: acessar a URL diretamente devolve uma tela
de "sem autorização", e a API responde 403 de qualquer forma.

A conta criada no onboarding é proprietária e detém todas as capacidades.

## Onboarding

### Primeiro acesso

Toda tela pública espera `/api/bootstrap` responder antes de decidir o que
mostrar. Só então o destino é escolhido:

```
abertura → GET /api/bootstrap
              │
   ┌──────────┼───────────────┬─────────────────┐
needsOnboarding      autenticado         nem um nem outro
   │                     │                      │
/onboarding            /app                 /entrar
```

- `/` na instalação limpa leva direto ao `/onboarding`; com o clube já criado
  mantém o portal, cujo botão aponta para `/entrar` ou `/app`.
- `/entrar` na instalação limpa não mostra formulário de login — não existe
  conta que pudesse funcionar. Mostra **Primeiro acesso** com o botão
  *Configurar clube*, e deixa explícito que não há credenciais padrão.
- `/entrar` num clube já configurado mostra o login normal, com uma nota
  discreta orientando quem procura primeiro acesso a pedir uma conta à
  administração. Nunca oferece cadastro.
- `/onboarding` num clube já configurado mostra **Clube já configurado** e
  devolve para `/entrar` ou `/app`, em vez de redirecionar em silêncio.
- Se o bootstrap falhar, a aplicação diz que não conseguiu falar com o
  servidor e oferece nova tentativa — não trata a falha como falta de
  configuração nem apresenta um login inútil.

Nenhum usuário ou senha padrão é criado em momento algum: quem configura
define as próprias credenciais na última etapa.

### Etapas

São cinco: identidade do clube, estrutura esportiva, financeiro, identidade
visual e primeiro administrador.

Ao concluir, em um único lote são criados o clube, as configurações, as
categorias, a pessoa do administrador, a conta e suas autorizações — e a sessão
já entra autenticada. O endpoint é de uso único: com um clube existente, responde
409.

A quantidade de jogadores informada na etapa 2 **não é armazenada**. Ela apenas
orienta a configuração; o número exibido no sistema é sempre contado a partir dos
jogadores realmente cadastrados.

## Exportação Excel

Botão **Exportar Excel** em Relatórios. O arquivo é gerado no servidor, a partir
dos dados atuais, e exige `reports.export`.

| Arquivo | Abas |
| --- | --- |
| `jogadores.xlsx` | Jogadores |
| `pessoas.xlsx` | Pessoas |
| `mensalidades.xlsx` | Mensalidades |
| `financeiro.xlsx` | Resumo, Entradas, Saídas, Mensalidades, Fluxo de Caixa |
| `futebol.xlsx` | Jogos, Campeonatos, Treinamentos, Escalações |
| `estoque.xlsx` | Itens, Movimentações |

O escritor `.xlsx` é próprio (`worker/src/lib/xlsx.ts`): um arquivo xlsx é um ZIP
de XMLs, e escrevê-los diretamente evita as bibliotecas de planilha, que no
Worker ou dependem de APIs do Node ou carregam vulnerabilidades de parser que
nunca usaríamos — este código apenas escreve. Valores monetários saem como número
com formato de moeda, não como texto.

## Testes

```bash
npm run lint                # typecheck do frontend e do Worker
npm run test:api            # API end-to-end contra Worker + D1 reais
npm run test:first-access   # fluxo de primeiro acesso (casos A–G)
npm run test:ui             # jornada completa pela interface
```

Os testes de UI precisam do Worker rodando (`npm run preview`) e usam o banco
local — rode `npm run db:reset` antes, porque o roteiro começa do estado sem
clube.

`tests/api.e2e.mjs` cobre o fluxo obrigatório: estado inicial vazio, onboarding
(inclusive a recusa de uma segunda execução), sessão, CRUD, regras de negócio
(mensalidade duplicada, saldo negativo de estoque, exclusão de pessoa com
vínculo), agregações do dashboard, autorizações negadas, exportação e novo login
com os dados persistidos.

`tests/first-access.e2e.mjs` cobre o primeiro acesso de ponta a ponta: banco
vazio levando ao onboarding, entrada automática após a configuração, recusa de
um segundo clube, instância já configurada, login posterior com a senha criada
e falha de bootstrap. Vários passos atrasam `/api/bootstrap` de propósito,
porque o defeito que essa suíte protege era justamente telas decidindo o que
renderizar antes dessa resposta.

`tests/ui.e2e.mjs` percorre a mesma jornada pela interface, verifica estados
vazios, validação de formulário, o menu filtrado por autorização, o bloqueio ao
acessar uma rota sem permissão, e checa a 390px que não há overflow horizontal
nem quebra de linha nos badges.

## Estrutura do projeto

```
migrations/            schema versionado do D1
worker/src/
  index.ts             roteamento e entrega da SPA
  lib/                 sessão, senha, permissões, validação, erros, xlsx
  routes/              um arquivo por domínio da API
src/
  app/                 rotas, guards, contexto de sessão, navegação
  components/          design system, gráficos, tabelas, motion
  layouts/             shell da aplicação
  pages/               uma página por rota
  modules/             composições reaproveitadas entre páginas
  services/            cliente HTTP e repositórios por recurso
  shared/              catálogo de permissões (Worker + SPA)
  types/               modelo de domínio
tests/                 end-to-end de API e de interface
```

## Decisões relevantes

**Nenhum dado fictício no produto.** Os mocks da fase 1 foram removidos. Com o
banco vazio, os números são zero de verdade e o dashboard mostra um checklist de
primeiros passos em vez de preencher a tela com valores inventados. Falha de API
vira mensagem de erro com opção de tentar novamente, nunca uma lista vazia
silenciosa.

**A API devolve os nomes já resolvidos.** Uma mensalidade traz `playerName`, uma
partida traz `competitionName`. Assim as tabelas renderizam sem precisar resolver
chave estrangeira no cliente, e o servidor continua sendo a única fonte da
verdade.

**PBKDF2 em vez de bcrypt/argon2.** São as opções que o Workers realmente
suporta: bcrypt, scrypt e argon2 exigem binário nativo ou WASM que o runtime não
carrega, enquanto SHA-256 puro seria sem salt e barato demais para força bruta.

**A camada de serviços da fase 1 foi preservada.** As telas continuam chamando
`list/get/create/update/remove`; só a implementação saiu de arrays em memória
para HTTP. Foi por isso que a troca não exigiu reescrever as páginas.
