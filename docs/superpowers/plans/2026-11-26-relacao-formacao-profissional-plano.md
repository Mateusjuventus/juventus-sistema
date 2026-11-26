# Plano de implementação — Relação de Atletas (Formação e Profissional) para Financeiro/Controladoria

Baseado em `docs/superpowers/specs/2026-11-26-relacao-formacao-profissional-design.md`, aprovada
pelo Mateus. Ordem: migration → tipos → lib pura (com testes) → actions → tela → PDF → Excel →
verificação final.

**Achado importante da exploração, não estava na spec original e já foi corrigido nela**: desde a
Unificação de Atletas (28/10/2026, `0150_unificacao_atletas.sql`), não existem mais tabelas
separadas `atletas_base`/`atleta_base_contratos` — foram renomeadas `_old` (backup, sem uso). Hoje
há uma única `atletas` (coluna `categoria`: `"profissional"` ou uma das 7 categorias de Base) e um
único `atleta_contratos`. Todo o plano abaixo já usa as tabelas unificadas.

## 1. Migration SQL (`0169_atleta_relacao_formacao_profissional_excecoes.sql`)

Mesmos moldes de `0158_atleta_contrato_extensoes.sql` (RLS `authenticated_full_access` + grants):

```sql
create table public.atleta_relacao_formacao_profissional_excecoes (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  tipo text not null check (tipo in ('incluir', 'excluir')),
  criado_por_perfil_id uuid references public.perfis(id) on delete set null,
  criado_por_nome text,
  created_at timestamptz not null default now(),
  unique (atleta_id)
);

create index atleta_relacao_formacao_profissional_excecoes_atleta_id_idx
  on public.atleta_relacao_formacao_profissional_excecoes (atleta_id);

alter table public.atleta_relacao_formacao_profissional_excecoes enable row level security;

create policy "authenticated_full_access" on public.atleta_relacao_formacao_profissional_excecoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atleta_relacao_formacao_profissional_excecoes to authenticated;

notify pgrst, 'reload schema';
```

`unique (atleta_id)` garante que um upsert por `atleta_id` sempre substitui a exceção anterior do
mesmo atleta (nunca duas linhas pro mesmo atleta).

## 2. Tipos TypeScript (`lib/supabase/types.ts`)

Novo tipo, ao lado de `AtletaContratoEvolucaoSalarialRow`:

```ts
export type AtletaRelacaoFormacaoProfissionalExcecaoTipo = "incluir" | "excluir";

/** Exceção manual persistente da Relação Formação/Profissional (ver docs/superpowers/specs/
 * 2026-11-26-relacao-formacao-profissional-design.md) — um atleta só pode ter uma por vez
 * (`unique (atleta_id)` no banco). */
export interface AtletaRelacaoFormacaoProfissionalExcecaoRow {
  id: string;
  atleta_id: string;
  tipo: AtletaRelacaoFormacaoProfissionalExcecaoTipo;
  criado_por_perfil_id: string | null;
  criado_por_nome: string | null;
  created_at: string;
}
```

## 3. Lib pura (`lib/futebol/relacao-formacao-profissional.ts`, novo módulo)

Mesmo espírito de `lib/futebol/relacao-atletas-base.ts` e `lib/futebol/atletas-filtro.ts`: zero
Supabase aqui, só funções puras testáveis com `vitest`. A página/rotas buscam os dados crus e
chamam este módulo pra decidir quem entra, como agrupar e como calcular os totais.

### 3.1 Tipos de entrada

```ts
import type { AtletaRow, AtletaContratoRow, AtletaContratoEvolucaoSalarialRow } from "@/lib/supabase/types";
import { atletaVisivelPorAtivo } from "./atletas-filtro";

/** Só os campos que este módulo realmente usa, de `AtletaRow` + o contrato vigente já achado. */
export interface AtletaParaRelacao {
  id: string;
  nomeCompleto: string;
  cpf: string;
  dataNascimento: string;
  status: string;
  ativo: boolean;
  categoria: string;
  contratoVigente: AtletaContratoRow | null;
}

export type TipoExcecao = "incluir" | "excluir";
export interface ExcecaoRelacao {
  atletaId: string;
  tipo: TipoExcecao;
}
```

### 3.2 Candidatos automáticos

```ts
const TIPOS_CONTRATO_RELACAO = ["formacao", "definitivo", "emprestimo"] as const;

/** Critério automático (ver spec, "Decisões"): categoria de Base, contrato vigente de Formação/
 * Definitivo/Empréstimo, status diferente de "dispensado" e `ativo === true`. Reusa
 * `atletaVisivelPorAtivo` (mesma regra que já esconde inativos em todo o resto do sistema) em vez de
 * checar `ativo` à mão aqui. */
export function atletaEhCandidatoAutomatico(atleta: AtletaParaRelacao): boolean {
  if (atleta.categoria === "profissional") return false;
  if (atleta.status === "dispensado") return false;
  if (!atletaVisivelPorAtivo(atleta.ativo, false)) return false;
  const tipo = atleta.contratoVigente?.tipo_contrato;
  return tipo != null && (TIPOS_CONTRATO_RELACAO as readonly string[]).includes(tipo);
}
```

### 3.3 Aplicação das exceções

```ts
/** `(candidatos automáticos ∪ exceções 'incluir') − exceções 'excluir'` — ver spec, "Mecanismo de
 * exceções". `todosOsAtletas` precisa incluir TODO atleta candidato a uma exceção 'incluir' (não só
 * os candidatos automáticos), já que o objetivo é poder incluir alguém que o automático não pegaria
 * (outra categoria, outro tipo de contrato, até dispensado/inativo). */
export function calcularListaFinal(
  todosOsAtletas: AtletaParaRelacao[],
  excecoes: ExcecaoRelacao[],
): AtletaParaRelacao[] {
  const incluirIds = new Set(excecoes.filter((e) => e.tipo === "incluir").map((e) => e.atletaId));
  const excluirIds = new Set(excecoes.filter((e) => e.tipo === "excluir").map((e) => e.atletaId));
  return todosOsAtletas.filter(
    (a) => (atletaEhCandidatoAutomatico(a) || incluirIds.has(a.id)) && !excluirIds.has(a.id),
  );
}
```

### 3.4 Agrupamento e totais

```ts
export interface LinhaRelacao {
  atleta: AtletaParaRelacao;
  contrato: AtletaContratoRow;
  valorTotal: number;
}

function ehBlocoFormacao(contrato: AtletaContratoRow): boolean {
  return contrato.tipo_contrato === "formacao";
}

/** Soma as 5 rubricas — mesma conta que o formulário de Contrato já faz no client pra mostrar "Valor
 * total" (ver `ContratoForm`), replicada aqui em JS puro pro PDF/Excel. */
export function valorTotalContrato(c: AtletaContratoRow): number {
  return c.salario_ctps + c.direito_imagem + c.bonificacao + c.auxilio_moradia + c.outros;
}

/** Agrupa a lista final em Formação/Profissional, ordenado por nome dentro de cada bloco — atletas
 * sem `contratoVigente` não deveriam chegar aqui (já barrados em `atletaEhCandidatoAutomatico`),
 * mas uma exceção 'incluir' manual pode trazer alguém sem contrato vigente; esses ficam de fora dos
 * dois blocos (não tem rubrica nem tipo pra mostrar) — ver `atletasSemContratoParaAviso`. */
export function agruparPorBloco(lista: AtletaParaRelacao[]): { formacao: LinhaRelacao[]; profissional: LinhaRelacao[] } {
  const comContrato = lista.filter((a): a is AtletaParaRelacao & { contratoVigente: AtletaContratoRow } =>
    a.contratoVigente != null,
  );
  const linhas = comContrato.map((a) => ({
    atleta: a,
    contrato: a.contratoVigente,
    valorTotal: valorTotalContrato(a.contratoVigente),
  }));
  const porNome = (a: LinhaRelacao, b: LinhaRelacao) => a.atleta.nomeCompleto.localeCompare(b.atleta.nomeCompleto, "pt-BR");
  return {
    formacao: linhas.filter((l) => ehBlocoFormacao(l.contrato)).sort(porNome),
    profissional: linhas.filter((l) => !ehBlocoFormacao(l.contrato)).sort(porNome),
  };
}

/** Atletas que entraram pela exceção 'incluir' mas não têm contrato vigente nenhum — avisa na tela
 * em vez de simplesmente sumir da relação sem explicação (ver seção 5, "Exceções ativas"). */
export function atletasSemContratoParaAviso(lista: AtletaParaRelacao[]): AtletaParaRelacao[] {
  return lista.filter((a) => a.contratoVigente == null);
}
```

### 3.5 Evolução salarial (só bloco Profissional)

```ts
/** Próxima mudança agendada de cada rubrica pra um contrato, já formatada pra exibição — "a partir
 * de DD/MM/AAAA, Salário CTPS passa a R$ X" — ver spec: só mostrado no bloco Profissional. Mostra
 * TODAS as mudanças futuras agendadas (não só a próxima), uma por linha, ordenadas por data. */
export function evolucoesDoContrato(
  contratoId: string,
  todasEvolucoes: AtletaContratoEvolucaoSalarialRow[],
): AtletaContratoEvolucaoSalarialRow[] {
  return todasEvolucoes
    .filter((e) => e.contrato_id === contratoId)
    .sort((a, b) => a.data_vigencia.localeCompare(b.data_vigencia));
}
```

### 3.6 Testes (`relacao-formacao-profissional.test.ts`)

Cobrir: `atletaEhCandidatoAutomatico` (cada motivo de exclusão isoladamente — categoria profissional,
status dispensado, ativo false, tipo de contrato amador/iniciação/null, e o caso que passa);
`calcularListaFinal` (exceção incluir trazendo quem o automático não pegaria, exceção excluir
tirando quem o automático pegaria, nenhuma exceção); `valorTotalContrato`; `agruparPorBloco`
(separação correta + ordenação por nome); `atletasSemContratoParaAviso`; `evolucoesDoContrato`
(filtra pelo contrato certo e ordena por data).

## 4. Actions (`app/base/relatorios/formacao-profissional/actions.ts`)

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin"; // conferir o import real usado em app/usuarios/actions.ts
import { isMaster } from "@/lib/auth/role";
import { nomeDaContaAtual } from "@/lib/auth/perfis"; // conferir nome exato da função, usada em registrarAtivoAtleta

const CAMINHO = "/base/relatorios/formacao-profissional";

export async function criarExcecao(formData: FormData): Promise<void> {
  const supabase = createClient();
  if (!(await isMaster(supabase))) return;

  const atletaId = String(formData.get("atletaId") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  if (!atletaId || (tipo !== "incluir" && tipo !== "excluir")) return;

  const admin = createAdminClient();
  await admin.from("atleta_relacao_formacao_profissional_excecoes").upsert(
    {
      atleta_id: atletaId,
      tipo,
      criado_por_nome: await nomeDaContaAtual(supabase),
    },
    { onConflict: "atleta_id" },
  );
  revalidatePath(CAMINHO);
}

export async function removerExcecao(formData: FormData): Promise<void> {
  const supabase = createClient();
  if (!(await isMaster(supabase))) return;

  const atletaId = String(formData.get("atletaId") ?? "");
  if (!atletaId) return;

  const admin = createAdminClient();
  await admin.from("atleta_relacao_formacao_profissional_excecoes").delete().eq("atleta_id", atletaId);
  revalidatePath(CAMINHO);
}
```

Checagem de permissão sempre no servidor (nunca só esconder o botão no client) — mesmo princípio já
usado em `alternarUsuarioAtivo`/`salvarParecerCaptacao`. `createAdminClient` (`@/lib/supabase/
admin`) e `nomeDaContaAtual` (`@/lib/auth/perfis`) acima já são os imports reais, confirmados contra
`app/usuarios/actions.ts`/`lib/futebol/ativo-historico.ts`.

## 5. Tela (`app/base/relatorios/formacao-profissional/page.tsx`)

Server Component, master-only (mesmo padrão de `app/usuarios/page.tsx`):

```ts
const master = await isMaster(supabase);
if (!master) redirect("/base");
```

Busca em paralelo: `atletas` (`.neq("categoria", "profissional")`, todos os campos de
`AtletaParaRelacao`), `atleta_contratos` (`.eq("vigente", true)`, pra montar `contratoVigente` por
`atleta_id`), `atleta_contrato_evolucao_salarial` (todas — filtra pelo `contrato_id` certo depois,
em JS, via `evolucoesDoContrato`), e `atleta_relacao_formacao_profissional_excecoes` (join com
`atletas` pra mostrar nome na lista de exceções ativas).

Monta `AtletaParaRelacao[]` cruzando atletas + contrato vigente (por `atleta_id`), chama
`calcularListaFinal` → `agruparPorBloco`, e renderiza:

1. **Bloco Formação** e **Bloco Profissional** (`<FormSection>` ou cabeçalho de seção, mesmo
   padrão visual de `TabelaAtletas`/seções do sistema): tabela simples (não PDF, HTML) com Nome,
   Tipo de contrato, Vigência, Valor total, e um botão "Remover da relação" por linha —
   `<form action={criarExcecao}>` com `atletaId` + `tipo=excluir` ocultos.
2. Aviso (se `atletasSemContratoParaAviso` não for vazio): lista separada avisando "Incluído(a)
   manualmente, mas sem contrato vigente — não aparece no PDF/Excel".
3. **Adicionar atleta fora do padrão**: componente client novo (`adicionar-excecao-form.tsx`),
   mesmo padrão de busca por nome de `ListaSelecao` (ver `relatorio-avulso-form-base.tsx`, é uma
   function local ali, não um componente compartilhado — replicar o padrão, não importar), mas aqui
   cada linha tem um botão "Incluir" que já submete a exceção na hora (não um checkbox + submit
   único) — lista todos os atletas de Base que ainda não estão na relação final.
4. **Exceções ativas**: lista simples (nome do atleta + "Sempre incluir"/"Sempre excluir" + botão
   "Remover exceção" → `<form action={removerExcecao}>`).
5. Dois links no topo: **Baixar PDF** (`<a href="/base/relatorios/formacao-profissional/pdf">`) e
   **Baixar Excel** (`<a href="/base/relatorios/formacao-profissional/export">`).

## 6. PDF (`lib/pdf/relacao-formacao-profissional-document.tsx` + `app/base/relatorios/
   formacao-profissional/pdf/route.tsx`)

Modelo mais próximo: `lib/pdf/relacao-atletas-base-document.tsx` (`sharedStyles.page`,
`DepartamentoEyebrow`, `DocumentoFooter`, `formatDataBr`, de `./logistica-shared`) — mas aqui as
colunas são FIXAS (não escolhidas pelo usuário), então sem a lógica de `decidirOrientacao`/largura
dinâmica: usa `Page size="A4" orientation="landscape"` direto (tipo de contrato + vigência + 5
rubricas + total já enchem a largura retrato; Profissional ainda ganha a coluna de evolução).

Duas tabelas (uma por bloco, igual `TabelaAtletas`, mas com colunas fixas):

- Formação: Nome, CPF, Data de nascimento, Clube de origem (só quando `tipo_contrato = emprestimo`
  dentro do próprio bloco Formação — não deveria acontecer na prática, mas o campo existe no
  schema), Vigência (início–fim), as 5 rubricas, Valor total.
- Profissional: as mesmas colunas + uma coluna "Evolução salarial" (texto concatenado de
  `evolucoesDoContrato`, ex.: "01/03/2027: Salário CTPS → R$ 5.000,00"; `"—"` quando vazio).

Rota (`route.tsx`): checa `isMaster` no servidor (`403` se não for — não existe precedente de PDF
master-only no sistema hoje, então este é o primeiro; seguir o mesmo `return NextResponse.json(...,
{status:403})` que as actions já usam pra negar sem token), busca os mesmos dados da página,
monta `AtletaParaRelacao[]`, roda a mesma pipeline da lib (`calcularListaFinal` →
`agruparPorBloco`), renderiza com `renderToBuffer` (mesmo padrão de `app/base/relatorios/avulso/
pdf/route.tsx`).

## 7. Excel (`app/base/relatorios/formacao-profissional/export/route.ts`)

Mesmo padrão de `app/comissao-tecnica/export/route.ts`: `isMaster` no servidor, busca os mesmos
dados, roda a mesma pipeline da lib, monta duas listas de `linhas` (uma por bloco) com os mesmos
campos do PDF (`formatData`/`formatMoeda` locais, igual ao exemplo), e:

```ts
return buildXlsxResponse("relacao-formacao-profissional.xlsx", [
  { nome: "Formação", linhas: linhasFormacao },
  { nome: "Profissional", linhas: linhasProfissional },
]);
```

A coluna "Evolução salarial" no Excel é texto simples (mesma concatenação do PDF) — não vale a pena
uma aba à parte só pra isso.

## 8. Navegação (sidebar)

Nenhum relatório master-only tem entrada em `lib/auth/modulos-base.ts` hoje (esse arquivo é do
sistema de permissão por departamento/categoria, não serve pra algo restrito a master) — o
precedente é "Usuários" e o painel de Demandas do master, ambos ligados direto em
`components/app-sidebar.tsx`/`components/app-shell.tsx` por uma prop booleana calculada com
`isMaster` (ver `mostrarPainelDemandas`). Adicionar a Relação Formação/Profissional pelo mesmo
caminho: nova prop (`mostrarRelacaoFormacaoProfissional`, calculada em `AppShell` via `isMaster`),
novo item fixo no grupo "Futebol de Base" do sidebar, apontando pra
`/base/relatorios/formacao-profissional`. Localizar o ponto exato seguindo `mostrarPainelDemandas`
de ponta a ponta (`app-shell.tsx` → `app-sidebar.tsx`) antes de editar.

## 9. Verificação final

- `npx tsc --noEmit -p tsconfig.json`
- `npx vitest run lib/futebol/relacao-formacao-profissional.test.ts`
- `npx next build`
- Teste manual: nenhuma exceção (lista bate com o critério automático), criar exceção "excluir" num
  atleta que seria automático (some da lista e do PDF/Excel), criar exceção "incluir" num atleta
  Sub-15 com contrato Amador (aparece com aviso de "sem contrato vigente" se não tiver Formação/
  Definitivo/Empréstimo, ou aparece no bloco certo se tiver), remover as duas exceções (lista volta
  ao automático), baixar PDF e Excel e conferir que os dois batem com a tela, confirmar que um
  perfil não-master é redirecionado/recebe 403 nas 3 rotas (página, PDF, Excel).
- Entregar ao Mateus: arquivo de migration `0169_...sql` pra rodar no SQL Editor do Supabase (antes
  do deploy do código, mesma ordem de sempre), depois sincronizar os arquivos e passar os comandos
  de git.
