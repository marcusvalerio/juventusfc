# Juventus F.C. — Plataforma de Gestão

Primeira etapa do produto: **frontend completo, com dados mockados**.
Sem banco de dados, sem autenticação, sem login, sem persistência real — por decisão de escopo.
O objetivo desta entrega é validar visualmente a experiência antes de conectar dados reais.

## Rodando o projeto

```bash
npm install
npm run dev      # ambiente de desenvolvimento
npm run build    # build de produção
npm run preview  # serve o build
npm run lint     # checagem de tipos
```

## Stack

| Camada | Escolha | Motivo |
| --- | --- | --- |
| Build | Vite + React 18 + TypeScript | rápido, tipado, sem acoplamento a framework de servidor |
| Estilo | Tailwind CSS com design tokens próprios | design system consistente sem CSS solto |
| Motion | Framer Motion | um vocabulário único de movimento (`src/lib/motion.ts`) |
| Rotas | React Router | rotas por módulo, com code-splitting por página |
| Gráficos | SVG próprio | controle total da estética e nenhum peso de biblioteca |
| Ícones | lucide-react | traço fino, coerente com a tipografia |

## Arquitetura

```
src/
  app/          App, rotas e configuração de navegação
  components/
    brand/      marca (brasão, wordmark)
    charts/     gráficos em SVG (área, barras, rosca, sparkline)
    data/       DataTable, StatCard, ChartCard, FilterBar, FormModal, DetailList
    motion/     PageTransition, Stagger, AnimatedNumber
    ui/         design system (Button, Field, Modal, Drawer, Dropdown, Toast…)
  data/         dados mockados, realistas e ancorados na data atual
  hooks/        useAsync, useTableState, useDisclosure, useMeasure…
  layouts/      AppLayout, Sidebar, Header, PageHeader, CommandPalette
  lib/          formatação, datas, motion, utilitários
  modules/      composições de módulo reaproveitadas entre páginas
  pages/        uma página por rota, agrupadas por área
  services/     repositórios assíncronos + leituras derivadas (analytics)
  styles/       CSS base e tokens
  types/        modelo de domínio
```

### Preparação para a próxima fase

O ponto central da arquitetura é que **as telas nunca importam de `src/data`**.
Elas consomem `src/services`, que hoje é um repositório em memória com latência
simulada e a mesma assinatura assíncrona que uma API terá:

```ts
list(query?) · get(id) · create(input) · update(id, patch) · remove(id)
```

Trocar o mock por API real é substituir o corpo desses módulos (usando
`services/http.ts`, já preparado para headers de autenticação) — nenhuma
página precisa mudar.

O modelo de domínio (`src/types/domain.ts`) já expressa a hierarquia planejada:

```
Pessoa → Vínculo → Jogador / Diretoria / Comissão → Conta de acesso → Autorizações
```

Toda entidade carrega `id`, `createdAt` e `updatedAt`, e relações são
representadas por ids — nunca por objetos aninhados —, espelhando linhas de
banco relacional.

## Design system

**Paleta.** O preto é a base (`onyx #08090B`, `graphite #111318`,
`elevated #181B21`); a profundidade vem de níveis de cinza, não de sombras
pesadas. O dourado (`#C9A227` / `#E0BE55`) aparece apenas em identidade,
estado ativo, indicadores e números importantes. A ação primária é clara
(`#F4F4F2` sobre preto), justamente para não transformar a interface em
preto-e-dourado literal.

**Tipografia.**

- **Sentient** — identidade: nome do clube, títulos institucionais, a Home.
- **Geist** — títulos e headings de interface (mesma linguagem do FADE.OS).
- **Inter** — informação: tabelas, formulários, labels, textos de apoio.

**Motion.** Durações curtas (140–360 ms) e um easing único
(`cubic-bezier(0.22, 1, 0.36, 1)`). O movimento serve à hierarquia: transição
de página, entrada escalonada de cards, sublinhado que acompanha a aba,
indicador da sidebar com `layoutId`, contagem de números, desenho progressivo
dos gráficos. `prefers-reduced-motion` é respeitado globalmente.

**Estados.** Toda tela cobre carregamento (skeletons com a forma do conteúdo
final), vazio, erro com nova tentativa, foco, hover, seleção e desabilitado.

## Módulos

Dashboard · Pessoas · Diretoria · Jogadores · Comissão Técnica · Calendário ·
Jogos · Campeonatos · Treinamentos · Escalações · Mensalidades · Entradas ·
Saídas · Fluxo de Caixa · Estoque · Relatórios · Configurações

Atalho **⌘K / Ctrl+K** abre a busca rápida (seções, jogadores e jogos).

## Fora do escopo desta etapa

Banco de dados · autenticação · login · contas de usuário · permissões reais ·
persistência · camisa 3D. A Home já reserva o espaço central onde o asset 3D
entrará (`data-slot="shirt-3d"`), sem necessidade de refazer a composição.
