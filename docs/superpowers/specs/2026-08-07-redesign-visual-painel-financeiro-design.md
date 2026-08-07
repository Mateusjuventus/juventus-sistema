# Redesign visual do sistema + Painel (calendário/mural) + Dashboard financeiro — Design

**Data:** 2026-08-07
**Autor:** Mateus Santos (Supervisor de Futebol Profissional — Juventus)
**Status:** Aprovado (mockups iterados e aprovados em conversa — ver `mockup-sidebar-v8.html` como referência visual)

## Contexto

Dois pedidos relacionados, decididos em conjunto pelo usuário como "visual geral primeiro,
financeiro depois" (mas que na prática nasceram juntos, porque o financeiro mora dentro do mesmo
shell visual):

1. "Melhorar o visual da tela principal e do sistema, deixar mais profissional."
2. "Na parte financeira, colocar gráfico financeiro, comparativos (dashboard) dentro da prestação
   de contas."

O visual atual (grená/dourado, cabeçalho horizontal, cards com ícone colorido por módulo) já era
funcional, mas o usuário achou que podia ficar mais "painel administrativo" — menu lateral em vez
de barra no topo, sem fundo bege, tipografia mais cuidada, gráficos de verdade em vez de listas de
barra CSS. O processo de design foi inteiramente iterativo: 8 rounds de mockup HTML estático
(`mockup-sidebar-v1` a `v8`, entregues por chat) até convergir no layout aprovado.

## Objetivo

Redesenhar o "chrome" visual do sistema (cabeçalho/menu, paleta, tipografia, componentes
compartilhados) de forma que a mudança se propague pras ~40 telas do sistema sem precisar redesenhar
cada uma individualmente — e, dentro desse novo visual, reconstruir a tela `/profissional` (Início)
como um painel de verdade (calendário editável, mural de avisos, próximo jogo, contratos vencendo)
e a tela `/financeiro` (Prestação de Contas) com gráficos reais em vez de tabelas puras.

## Fora de escopo (fica para módulos futuros)

- **Módulo "Temporada"** (cadastrar campeonatos, regras de cartão/suspensão automática por acúmulo,
  classificação/tabela) — ideia levantada pelo próprio usuário durante o brainstorming, explicitamente
  marcada por ele como "um ajuste depois". Vira spec própria quando chegar a vez.
  - Isso inclui a lógica de "atleta com 3 cartões amarelos fica suspenso" — hoje o sistema não
    modela cartão acumulado por competição, só os eventos de uma súmula isolada.
- **Painel/calendário equivalente para o Futebol de Base** — os mockups e esta spec cobrem só
  `/profissional` e `/financeiro` (Profissional). O `AppShell` (sidebar) passa a valer pros dois
  departamentos automaticamente (é componente compartilhado), mas o painel Início da Base
  (`/base`) e o financeiro da Base (`/base/financeiro`) continuam como estão hoje — podem ganhar o
  mesmo tratamento depois, em spec separada.
- **Notificação de verdade fora do sistema** (e-mail, WhatsApp, push). O sistema hoje não manda
  nada pra fora — o "Mural" usa o mesmo mecanismo que `/avisos` já usa (item aparece
  automaticamente quando a data está a ≤10 dias), só que num card na tela de Início. Perguntado
  explicitamente ao usuário, que confirmou esse caminho.
- **Redesenho de telas internas de módulo** (formulários e listagens de Atletas, Comissão Técnica,
  Jogos etc.) além do que a mudança de tokens/componentes compartilhados já alcança automaticamente.
  Se alguma tela específica precisar de ajuste fino depois, vira item avulso.
- **Anexos/comprovantes nos gastos, aprovação de orçamento** — já estava fora de escopo do módulo
  financeiro original e continua.

## Sistema visual (aplica-se ao sistema inteiro via componentes compartilhados)

### Paleta — sem bege

O usuário rejeitou explicitamente um fundo bege (`#F7EFD9`/`#E9E4DF`) usado numa iteração inicial.
Tokens finais, em `lib/theme.ts`:

```ts
export const juventusTheme = {
  grena: "#5C0A35",        // preenchimento de área grande (sidebar, marcas de categoria "jogo")
  grenaEscuro: "#3F0724",  // só texto/acentos pequenos — nunca preenchimento de área grande
  dourado: "#B98F1E",      // acento pontual (item ativo do menu, botões de destaque, categoria "reunião")
  cinzaPagina: "#EEF0F2",  // fundo da página — cinza neutro frio, não bege
  linha: "#E3E5E8",        // bordas/hairlines
  contexto: "#C7C9CD",     // barras "de referência" (previsto, dia sem evento) — nunca a cor de destaque
} as const;
```

Regra que vale pro sistema inteiro: **grená-escuro nunca preenche uma área grande** (foi o que deu
o efeito "muito escuro" numa iteração da sidebar) — só título de página, texto de destaque, badge
pequeno. Áreas grandes (sidebar, marcas fortes) usam `grena` (o tom mais claro).

### Tipografia

`app/layout.tsx` hoje declara uma variável CSS `--font-geist-sans` mas nunca importa uma fonte de
verdade — cai no fallback `system-ui`. Trocar por uma fonte real via `next/font/google` (Inter,
pesos 400/500/600/700/800), carregada uma vez no root layout. Sem custo de rede adicional
perceptível (self-hosted pelo Next) e resolve a aparência "sistema operacional" que os mockups sem
fonte carregada tinham.

### Componentes compartilhados (`app/globals.css`, `tailwind.config.ts`)

Ajustar os tokens já usados por `.card`, `.btn-primary`, `.btn-secondary`, `.field-input` etc. —
como toda tela do sistema já usa essas classes (`@layer components`), a atualização de cor/raio/
sombra se propaga sozinha. Nenhuma tela precisa ser tocada individualmente só por causa da paleta.

### `components/app-shell.tsx` — de barra no topo pra sidebar

Essa é a mudança estrutural que atinge as ~40 telas do sistema de uma vez, porque é o componente
compartilhado que todas elas já usam.

- **Sidebar fixa à esquerda**, 232px, fundo `grena` (não `grena-escuro`), com:
  - Logo + nome do clube no topo.
  - Lista de módulos do departamento atual (reaproveita `NAV_LINKS`/`NAV_LINKS_BASE` e
    `getModulosPermitidos`/`getModulosBasePermitidos` que já existem — só muda o componente visual,
    não a lógica de permissão), com rótulo de seção ("Futebol Profissional" / "Futebol de Base").
  - **Item ativo do menu recebe destaque em dourado** (`box-shadow: inset 3px 0 0 dourado` +
    fundo levemente mais claro) — hoje isso não existe (o menu no topo não indica página atual).
  - Seção "Geral" com Avisos (só Profissional, como já é hoje) e Tarefas.
  - Rodapé com avatar (iniciais) + e-mail/nome do usuário logado — reaproveita o que
    `PerfilMenu` já busca.
- **Faltavam no menu lateral, em relação aos cards que existiam em `/profissional`:** Usuários e
  Relatório Avulso. Ambos entram na sidebar (achado durante a revisão do mockup — o usuário notou a
  ausência).
- Área de conteúdo (`<main>`) ganha uma barra superior fina (56px, branca) com breadcrumb
  ("Início / Nome do módulo") no lugar dos links soltos "← Voltar" espalhados por várias telas —
  mas **essa troca do breadcrumb é redesenho de UI de cada página**, então por ora só entra nas
  duas telas desta spec (`/profissional`, `/financeiro`); as demais continuam com seus próprios
  links de volta até serem tocadas.
- `nav="none"` (usado só na tela `/`, escolha de departamento) continua sem sidebar, como hoje.

## Painel Início (`app/profissional/page.tsx`)

Layout de duas colunas: coluna central (mais larga) com o conteúdo operacional, coluna lateral
direita estreita (224px) com o Mural — decisão tomada depois de duas rodadas de ajuste (o usuário
pediu primeiro pra tirar o Mural da coluna que empilhava e obrigava rolar a página, depois pediu
pra estreitar essa coluna porque estava competindo demais em destaque com os outros cards).

A grade de cards de atalho pros módulos (Atletas, Comissão Técnica, Estoque, Usuários...) **sai**
da tela de Início — ela virou redundante assim que a sidebar passou a listar os mesmos módulos
permanentemente. Isso foi um achado do próprio usuário durante a revisão ("não tem lógica ficar
mostrando todas a função se já aparecem na lateral").

### Barra de resumo (topo)

Quatro números, iguais em espírito ao que já existe hoje, com um ajuste: o quarto número passa a
ser "dias até o próximo jogo" (calculado, não uma data crua) e entra um novo — contratos vencendo:

| Card | Fonte |
|---|---|
| Atletas ativos | `count(atletas) where status = 'ativo'` (já existe) |
| Staff ativo | `count(staff_operacional) where ativo = true` (já existe) |
| Contratos vencendo (90 dias) | `count(atletas) where data_fim_contrato between hoje e hoje+90d` — **novo** |
| Dias até o próximo jogo | `min(jogos.data_jogo) where data_jogo >= hoje` menos hoje, em dias |

### Widget "Calendário" (o maior da coluna central)

Grade mensal (não é uma lib de calendário — grid CSS simples, 7 colunas). Cada célula de dia:

- **Dias com jogo:** pega os dados de `jogos` (`adversario_logo_path`, `horario`, `local_estadio`,
  `mandante`) do mês corrente e desenha, dentro do próprio quadrado da data, dois escudos pequenos
  (Juventus + adversário, na ordem certa conforme `mandante`) e o horário — pedido explícito do
  usuário ("que venha os jogos nos dias com o confronto (logos) horário e local, no quadrado da
  data"). O local completo não cabe no quadrado pequeno; fica no hover (`title`) e na lista
  detalhada abaixo do calendário.
- **Dias com evento manual:** ponto colorido pela categoria (ver tabela abaixo) + título abreviado.
- **Legenda de cores** abaixo da grade, uma por categoria.
- **Lista detalhada** abaixo da legenda: todos os eventos do mês (jogos + manuais), em ordem de
  data, com nome completo, horário e local — o que não coube no quadrado pequeno.
- **Botão "+ Adicionar"** no cabeçalho do widget, abre formulário inline (categoria, título, data,
  horário opcional, observação opcional) — grava em `eventos_calendario` (tabela nova, ver Modelo
  de dados) via Server Action `criarEventoCalendario` em `app/profissional/calendario-actions.ts`
  (arquivo novo). Componente cliente do formulário: `app/profissional/calendario-form.tsx`.
- **Botão "Gerar PDF"** no cabeçalho, chama a rota nova `app/profissional/calendario/pdf/route.tsx`,
  que gera o PDF do mês corrente (mesmo padrão visual dos outros documentos do sistema —
  `DocumentoHeader`/`DocumentoFooter` de `lib/pdf/logistica-shared.tsx`) listando jogos + eventos
  manuais do mês em ordem de data.

Categorias de evento manual, com cor fixa:

| Categoria | Cor | Uso |
|---|---|---|
| Treino | `#1E7A4C` (verde) | |
| Viagem | `#2F6FA3` (azul) | |
| Reunião | `#B98F1E` (dourado) | |
| Prazo administrativo | `#B4232C` (vermelho) | |
| Outro | `#8A8D91` (cinza) | |
| *(Jogo — automático, não editável aqui)* | `#5C0A35` (grená) | vem de `jogos`, não de `eventos_calendario` |

### Widget "Próximo jogo"

Igual ao que já existia nos mockups anteriores — escudos, competição, data/horário, local. Sem
mudança de dados em relação ao que `/jogos` já expõe.

### Widget "Contratos vencendo"

Lista os atletas com `data_fim_contrato` mais próxima (janela de 90 dias), nome, posição, e um
badge com "faltam N dias" — vermelho se ≤30 dias, amarelo se ≤90. Consulta em `atletas` (campo
`data_fim_contrato` já existe, ver `lib/supabase/types.ts`).

### Widget "Mural" (coluna lateral direita, 224px)

Reaproveita a mesma regra que `/avisos` já usa pra tarefas/solicitações (`DIAS_PRAZO_CURTO = 10`
dias) — aplicada aos itens de `eventos_calendario` **e também** aos jogos do `jogos` (mesma janela
de 10 dias, mesma fonte de dados do widget "Calendário" acima) — as duas fontes entram na mesma
lista ordenada por proximidade, sem exceção; um jogo em 5 dias e uma reunião em 3 dias aparecem
juntos, ordenados por data. Badge de urgência: vermelho ≤2 dias, amarelo ≤5, verde até 10.
**Decisão explícita do usuário**, perguntada porque o sistema não tem e-mail/push: "quero que
apareça na tela, na direita, tipo um mural" — confirma que o canal de aviso continua sendo só
dentro do sistema, sem infraestrutura de envio nova.

## Prestação de Contas (`app/financeiro/page.tsx`)

Mantém a barra de resumo existente (total previsto/efetuado/diferença) e acrescenta um quarto
número (% do orçamento usado = efetuado/previsto). Duas mudanças de gráfico, depois de duas
tentativas anteriores rejeitadas pelo usuário ("quero outros gráficos, esses eu não gostei" —
achou as duas primeiras versões (lista de barra horizontal cinza/grená e ranking ordenado) parecidas
demais entre si e pouco "gráfico"):

- **Donut de participação por categoria** (não pizza — segue a prática de dobrar categorias menores
  num "Demais categorias" pra manter só 5 fatias legíveis: as 4 maiores por valor efetuado + resto
  agrupado). Paleta restrita à marca (grená, um tom de rosa/malva, dourado, um tom terroso claro, e
  cinza pro "Demais categorias") — não usa cores fora da identidade visual do clube. Rótulo central
  com o valor total efetuado.
- **Gráfico de colunas verticais** Previsto (cinza `contexto`) x Efetuado (grená), com eixo, grade
  horizontal sutil e legenda — as 6 categorias de maior valor (as demais continuam na tabela
  detalhada logo abaixo, sem corte de informação).
- Ambos são SVG desenhado à mão (sem nova dependência de gráfico) seguindo as práticas internas de
  visualização de dados: eixo/grid recessivo, barras com ponta arredondada, cor nunca carregando
  texto, legenda sempre presente com 2+ séries.
- **Tabela "Por categoria" (detalhada)** continua igual — os gráficos resumem visualmente, a tabela
  mantém o dado completo linha a linha.
- **Lista "Por jogo" continua existindo** (tinha sumido numa iteração intermediária do mockup — o
  usuário pediu de volta explicitamente: "quero que contenha os valores gastos gerais de todos os
  jogos e os jogos embaixo caso eu queira selecionar pra ver individual"). Cada card linka pra
  `/jogos/[id]/financeiro`, como já é hoje.

## Modelo de dados

### Nova tabela: `eventos_calendario`

```sql
create table public.eventos_calendario (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('treino', 'viagem', 'reuniao', 'prazo', 'outro')),
  titulo text not null,
  data date not null,
  horario time,
  observacao text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
```

RLS: mesma política `authenticated_full_access` usada em todas as outras tabelas do sistema.
Sem coluna de departamento por enquanto — a tela que lê/escreve essa tabela é só `/profissional`
(ver "Fora de escopo" sobre a Base).

### `atletas` — sem mudança de schema

`data_fim_contrato` já existe (`lib/supabase/types.ts`); só passa a ser consultado numa consulta
nova (contratos vencendo em 90 dias) que ainda não existia em nenhuma tela.

## Testes / verificação

- `npx tsc --noEmit`, `npx vitest run`, `npm run build` limpos, como em toda entrega anterior.
- Criar um evento de cada categoria pelo formulário "+ Adicionar" e confirmar: aparece no dia
  certo do calendário com a cor certa, aparece na lista detalhada abaixo do calendário, e aparece
  no Mural só se a data estiver a ≤10 dias de hoje (e some do Mural depois que a data passa).
  - Regra de mesmos-dados-num-dia: dois eventos no mesmo dia (ex: jogo + reunião) aparecem os dois
    na célula, sem um sobrescrever o outro.
- Consulta de contratos vencendo: atleta com `data_fim_contrato` em 89 dias aparece; em 91 dias,
  não aparece; badge fica vermelho quando faltam ≤30 dias.
- "Gerar PDF" do calendário abre um PDF com os jogos e eventos do mês corrente, no padrão visual
  dos outros documentos do sistema.
- Comparar visualmente `/profissional` e `/financeiro` renderizados contra `mockup-sidebar-v8.html`
  (a referência aprovada) — checar que não sobrou nenhum tom bege/creme em nenhum widget novo.
- Sidebar: confirmar que Usuários e Relatório Avulso aparecem no menu (não só na home antiga), e
  que o item ativo é destacado corretamente em cada rota.
- `npx tsc` já cobre a tipagem da tabela nova depois de regenerar `lib/supabase/types.ts`.
