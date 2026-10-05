# Programação Semanal e Calendário para o Futebol Profissional

## Contexto

Desde 30/08, o Início do Futebol de Base e da Área do Treinador não é mais um painel de atalhos —
é direto a Programação Semanal (grade por dia, com horários de treino, "+ Nova Atividade",
Exportar PDF, Copiar Dia, ver `docs/superpowers/specs/2026-08-30-area-treinador-programacao-
design.md`). O Futebol Profissional nunca teve isso: seu Início é um painel diferente, construído
em 07/08 (`docs/superpowers/specs/2026-08-07-redesign-visual-painel-financeiro-design.md`) —
calendário do mês, Mural de avisos, card de Próximo Jogo, Contratos Vencendo e uma fileira de
números-resumo no topo.

Pedido do Mateus, mostrando a sidebar do Profissional: *"essa parte do inicio, ali fica a
programação - Coloca Programação"*. Em seguida, mostrando a Programação da Base e um sistema de
referência (ProSoccer) como exemplo visual: quer o mesmo conceito de grade semanal também no
Profissional.

Perguntas de confirmação (resumo das respostas):
- O item "Programação" **substitui** o Início (não é um item solto separado) — a grade semanal
  abre direto ali.
- O painel atual (calendário/mural/próximo jogo/contratos) muda de lugar: vira **"Calendário"**,
  um item novo na sidebar, mas **só com o calendário em si** — Mural, Próximo Jogo, Contratos
  Vencendo e a fileira de números do topo saem de circulação (não vão para nenhum outro lugar do
  sistema por enquanto).
- Fora isso, nada muda na Base: "Início" continua com esse nome e esse conteúdo lá.

## Objetivo

- Sidebar do Profissional: primeiro item ("Início") passa a se chamar **Programação** e abre a
  grade semanal — o mesmo componente que a Base já usa, aplicado a um único "grupo": o time
  Profissional.
- Logo abaixo, um item novo **Calendário**, só com o calendário do mês (sem os outros widgets).
- Mural, Próximo Jogo, Contratos Vencendo e os números do topo saem da navegação.
- Sidebar da Base: sem nenhuma mudança (continua "Início", com o conteúdo de sempre).

## Decisões já confirmadas com o Mateus

- Programação vira o Início do Profissional (não um item adicional).
- O antigo painel vira "Calendário", mostrando só o calendário — sem Mural/Próximo Jogo/Contratos
  Vencendo e sem a fileira de números-resumo.
- Mesma regra de permissão de hoje: quem acessa `/profissional` acessa a Programação e o Calendário,
  sem checkbox extra em `/usuarios` (é como a Programação da Base já funciona).

## Fora de escopo

- Qualquer mudança na Programação da Base ou da Área do Treinador (`CategoriaBase`, telas,
  permissões) — continuam exatamente como estão.
- Trazer Mural, Próximo Jogo, Contratos Vencendo ou os números-resumo de volta em outro lugar do
  sistema — não foi pedido agora. O código desses widgets continua no histórico do git (dá pra
  recuperar depois, se for pedido).
- A Programação por jogo que já existe (concentração/dia de jogo, em `/jogos/[id]/programacao`) —
  não é afetada, continua existindo em paralelo. É a mesma dualidade "Programação semanal" +
  "Programação do jogo" que a Base já tem hoje, sem conflito.
- Pré-cadastrar um catálogo de atividades pro Profissional — começa vazio; o Mateus cadastra pelo
  próprio "+ Nova Subatividade" conforme for precisando, igual uma categoria nova da Base começaria.

## Abordagem

### 1. Tipo e schema

`CategoriaBase` (`lib/auth/categorias-base.ts`) não muda — continua as 7 categorias da Base,
usado por Atletas, Jogos e Comissão Técnica. Em vez de forçar o Profissional pra dentro desse tipo,
entra um tipo novo, só pro módulo de Programação:

```ts
// lib/programacao/categoria-programacao.ts (novo)
export type CategoriaProgramacao = CategoriaBase | "profissional";
```

As assinaturas que hoje recebem `categoria: CategoriaBase` dentro do módulo de Programação trocam
pra `CategoriaProgramacao`: `lib/programacao/queries.ts`, `actions.ts`, `microciclo-data.ts`,
`programacao-geral-data.ts`, `permissoes.ts`, e os componentes `ProgramacaoView`,
`AtividadeDetalheModal`, `AtividadeFormModal` (nova-atividade-modal.tsx), `CopiarDiaModal`,
`MicrocicloTextoEditor`. Nenhum arquivo é duplicado — só o tipo do parâmetro muda.

Migration nova (`supabase/migrations/0110_programacao_profissional.sql`): altera os 3 CHECK
constraints que hoje travam `categoria` nas 7 categorias da Base (`programacao_atividades`,
`programacao_catalogo_subatividades`, `configuracoes_programacao_base`) pra aceitar também
`'profissional'`, e insere a linha de configuração de época/microciclo pra `'profissional'` em
`configuracoes_programacao_base` (mesmo padrão do insert original da migration 0094).

### 2. Permissão

Nova função em `lib/programacao/permissoes.ts`, ao lado de `resolverCategoriasProgramacao`:

```ts
export function resolverCategoriaProgramacaoProfissional(perfil: PerfilPermissoes | null): CategoriaProgramacao[] {
  if (!perfil) return [];
  if (perfil.role === "master") return ["profissional"];
  const departamentos = perfil.departamentos_permitidos ?? TODOS_DEPARTAMENTOS;
  return departamentos.includes("futebol_profissional") ? ["profissional"] : [];
}
```

Mesmo raciocínio de `resolverCategoriasProgramacao`, só que pro outro departamento — sem o
conceito de "treinador" (que é exclusivo da Base).

### 3. Telas

- **`app/profissional/page.tsx`**: perde todo o conteúdo atual (fileira de números, `CalendarioWidget`,
  `ProximoJogoWidget`, `MuralWidget`, `ProximosJogosWidget`, e todas as queries que só alimentavam
  esses widgets) e passa a buscar os dados da semana (mesmas funções que `/base` já usa:
  `buscarSemana`, `buscarCatalogo`, `buscarJogosParaSelecao`, `buscarMicrocicloTexto`) e renderizar
  `<ProgramacaoView categoriaAtiva="profissional" categoriasDisponiveis={["profissional"]} .../>`
  dentro do `AppShell` com `breadcrumb="Programação"` — mesmo padrão que acabamos de aplicar em
  `/base` (sem brasão grande, sem título "Futebol Profissional" centralizado).
- **`app/profissional/calendario/page.tsx`** (novo): monta as mesmas queries de calendário que
  `/profissional` tinha (jogos do mês + eventos do mês → `montarItensCalendario`/`agruparPorDia`/
  `gradeDoMes`), renderiza só `<CalendarioWidget />` dentro do `AppShell` com
  `breadcrumb="Calendário"`. A rota de exportação em PDF que já existe
  (`app/profissional/calendario/pdf/route.tsx`) não muda.
- Removidos (órfãos após a mudança): `app/profissional/mural-widget.tsx`,
  `proximo-jogo-widget.tsx`, `proximos-jogos-widget.tsx`, e as funções que só alimentavam esses 3
  (`itensMural`, `contratosParaMural` em `lib/futebol/calendario.ts`; a chamada a
  `carregarAvisosCompeticoes` sai dessa página — a função em si continua existindo em
  `lib/futebol/competicao-avisos.ts`, usada pela aba Alertas de cada competição).

### 4. Sidebar (`components/app-sidebar.tsx` + `components/app-shell.tsx`)

- `AppSidebar` ganha um prop novo `homeLabel?: string` (default `"Início"`), substituindo o texto
  hoje fixo em dois lugares (barra lateral expandida e barra inferior do celular).
- Prop novo opcional `itemExtra?: { href: string; label: string; icone: SidebarIconKey }`,
  renderizado logo abaixo do item de Início/Programação só quando vier preenchido.
- `AppShell`: quando `departamento === "futebol_profissional"`, passa
  `homeLabel="Programação"` e `itemExtra={{ href: "/profissional/calendario", label: "Calendário",
  icone: "calendario" }}`. Quando `"futebol_base"`, não passa nenhum dos dois — mantém "Início" e
  sem item extra, exatamente como é hoje.
- Ícone novo `"calendario"` no mapa de ícones da sidebar (`components/module-icons.tsx`), no mesmo
  estilo visual dos demais (linha única, sem preenchimento).

## Arquivos críticos

- `supabase/migrations/0110_programacao_profissional.sql` (novo)
- `lib/programacao/categoria-programacao.ts` (novo)
- `lib/programacao/queries.ts`, `actions.ts`, `microciclo-data.ts`, `programacao-geral-data.ts`,
  `permissoes.ts`
- `components/programacao/programacao-view.tsx`, `atividade-detalhe-modal.tsx`,
  `nova-atividade-modal.tsx`, `copiar-dia-modal.tsx`, `microciclo-texto-editor.tsx`
- `app/profissional/page.tsx` (reescrito), `app/profissional/calendario/page.tsx` (novo)
- `components/app-sidebar.tsx`, `components/app-shell.tsx`, `components/module-icons.tsx`
- Removidos: `app/profissional/mural-widget.tsx`, `proximo-jogo-widget.tsx`,
  `proximos-jogos-widget.tsx`

## Verificação

- `npx tsc --noEmit`, `npx vitest run`, `npx eslint`, `npx next build` limpos.
- Colar o SQL da migração 0110 completo no chat pro Mateus rodar no SQL Editor do Supabase antes de
  qualquer teste manual.
- Roteiro manual:
  - Abrir `/profissional` → item do menu já aparece como "Programação", grade semanal vazia (sem
    atividades/catálogo ainda), sem abas de categoria.
  - Cadastrar uma atividade de teste (ex. "Treino"), conferir Exportar PDF, Copiar Dia, Editar e
    Excluir funcionando igual à Base.
  - Abrir "Calendário" → só o calendário do mês, sem números/Mural/Próximo Jogo/Contratos Vencendo.
  - Conferir que a Base continua idêntica: "Início" com o nome e o conteúdo de sempre, sem item
    "Calendário" na sidebar.
