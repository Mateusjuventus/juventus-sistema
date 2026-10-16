# Fase (Pré-jogo / Pós-jogo) nos gastos de jogo

Data: 2026-10-14
Departamentos: Futebol Profissional e Futebol de Base
Status: Aprovado pelo usuário, pendente de implementação

## Contexto

O Financeiro de cada jogo (`/jogos/[id]/financeiro` no Profissional, `/base/jogos/[id]/financeiro`
na Base) já lança gastos (`gastos_jogo`/`gastos_jogo_base`) com uma categoria do catálogo
compartilhado `categorias_gasto` (Hospedagem, Transporte/Ônibus, Arbitragem, Ambulância etc.). Hoje
existem dois PDFs de resumo financeiro do jogo:

- **Orçamento Previsto (Pré Jogo)** — `lib/pdf/orcamento-document.tsx`, todos os gastos, valor
  previsto.
- **Relatório de Despesas (Pós Jogo)** — `lib/pdf/relatorio-despesas-document.tsx`, só os gastos com
  valor efetuado preenchido.

**Atenção a uma armadilha de nomenclatura**: "Pré Jogo"/"Pós Jogo" nesses dois nomes de botão
descrevem apenas QUANDO cada documento costuma ser gerado (antes ou depois da partida) — não
classificam gasto nenhum. Isso é completamente diferente do conceito novo deste documento: uma
classificação por-gasto de "esse gasto específico foi uma despesa de pré-jogo ou de pós-jogo".

O usuário mandou um print de um Relatório de Despesas real (Base, Sub-20, Juventus x Grêmio
Prudente) no layout desejado: os gastos aparecem agrupados primeiro por uma seção "PRÉ-JOGO"/
"PÓS-JOGO" (cada uma com seu subtotal), e dentro de cada fase, as caixas de categoria de sempre
(cada uma com seu próprio subtotal), terminando em "TOTAL EFETUADO". Hoje o código **não tem** esse
agrupamento por fase — é uma caixa de categoria por categoria, sem nível superior. O usuário
confirmou explicitamente que isso é uma feature nova para ser desenhada e implementada, não um
ajuste de um comportamento que já existe:

> "hoje isso não tem no sistema. Foi uma sugestão que quero que você faça e implemente por favor."

## Objetivo

1. Cada gasto de jogo (Profissional e Base) passa a ter um campo **fase**: `pre_jogo` ou
   `pos_jogo`.
2. O Relatório de Despesas e o Orçamento Previsto (os dois PDFs de resumo financeiro do jogo, nos
   dois departamentos) passam a agrupar os gastos por fase, com subtotal de cada fase, mantendo o
   agrupamento por categoria (com seu subtotal) que já existe dentro de cada fase.
3. O documento final continua cabendo numa única folha A4.

## Decisões confirmadas com o usuário

- **Obrigatoriedade**: o campo fase é obrigatório em todo gasto novo ou editado a partir de agora.
  Gastos já lançados hoje (sem fase) aparecem no relatório numa seção extra **"Sem fase definida"**,
  com seu próprio subtotal.
- **Escopo dos documentos**: o agrupamento por fase vale para os **dois** PDFs de resumo (Orçamento
  Previsto e Relatório de Despesas), não só o que estava no print.
- **Departamentos**: vale para Profissional e Base (`gastos_jogo` e `gastos_jogo_base`).
- **Tela de listagem** (`/jogos/[id]/financeiro` e espelho Base): **não** ganha uma coluna de fase —
  a fase só importa para os PDFs.

## Modelo de dados

Nova migração `supabase/migrations/0135_gastos_jogo_fase.sql`:

```sql
alter table public.gastos_jogo
  add column if not exists fase text check (fase in ('pre_jogo', 'pos_jogo'));

alter table public.gastos_jogo_base
  add column if not exists fase text check (fase in ('pre_jogo', 'pos_jogo'));
```

O campo é **nullable** no banco — é assim que um gasto legado (lançado antes desta feature) fica
representado como "sem fase definida". A obrigatoriedade é imposta na camada de validação
(zod/formulário), não no banco, exatamente como já é feito hoje para outros campos "obrigatórios na
prática, mas sem `not null`" do sistema (ex.: `status_dia` da Fisioterapia).

Não há necessidade de dado semeado nem de tocar `despesas_avulsas`/`despesas_avulsas_base` (essas
tabelas não têm jogo e ficam fora de escopo — a classificação por fase só faz sentido para um gasto
amarrado a um jogo específico).

## Validação (`lib/validation/schemas.ts`)

`gastoJogoSchema` ganha o campo `fase`, obrigatório:

```ts
export const FASE_GASTO_OPTIONS = [
  { value: "pre_jogo", label: "Pré-jogo" },
  { value: "pos_jogo", label: "Pós-jogo" },
] as const;

export const gastoJogoSchema = z
  .object({
    categoriaId: z.string().min(1, { message: "Categoria é obrigatória" }),
    novaCategoriaNome: z.string().optional().or(z.literal("")),
    descricao: z.string().optional().or(z.literal("")),
    valorPrevisto: z.coerce.number().nonnegative({ message: "Valor previsto não pode ser negativo" }),
    valorEfetuado: z.coerce.number().nonnegative().optional().nullable(),
    data: z.string().optional().or(z.literal("")),
    fase: z.enum(["pre_jogo", "pos_jogo"], { errorMap: () => ({ message: "Fase é obrigatória" }) }),
  })
  .refine(/* regra da nova categoria, sem alteração */);
```

`despesaAvulsaSchema`/`despesaAvulsaBaseSchema` **não** mudam — despesa avulsa não tem jogo, fora de
escopo (ver Objetivo).

## Formulário (`gasto-form.tsx` e `gasto-form-base.tsx`)

Novo campo usando o `SelectField` que já existe em `components/fields.tsx` (mesmo padrão já usado
para `status_dia` da Fisioterapia), com uma opção vazia/desabilitada força a escolha mesmo em
edição de um gasto legado sem fase:

```tsx
<SelectField label="Fase" name="fase" required defaultValue={values.fase} error={errors.fase}>
  <option value="" disabled>
    Selecione a fase
  </option>
  {FASE_GASTO_OPTIONS.map((f) => (
    <option key={f.value} value={f.value}>
      {f.label}
    </option>
  ))}
</SelectField>
```

Posicionado depois da Categoria e antes da Descrição, nos dois formulários (Profissional e Base).

## Actions (`actions.ts` e `app/base/.../actions.ts`)

`parseForm` passa a ler `fase` do FormData; `createGasto`/`updateGasto` e os equivalentes Base
gravam `fase: data.fase` no insert/update. Sem mudança de assinatura pública, mesmo padrão dos
outros campos.

## PDFs — estrutura de dados

Tanto `OrcamentoDocument` quanto `RelatorioDespesasDocument` trocam a prop `categorias` por `fases`,
um nível acima do que já existe:

```ts
export type FaseGasto = "pre_jogo" | "pos_jogo" | null;

export interface RelatorioDespesasPdfFase {
  fase: FaseGasto;
  categorias: RelatorioDespesasPdfCategoria[]; // tipo existente, sem mudança
}
```

(O mesmo para `OrcamentoPdfFase`/`OrcamentoPdfCategoria`, espelhando a estrutura já existente.)

Rótulo de cada fase: "Pré-jogo" → `PRÉ-JOGO`, "Pós-jogo" → `PÓS-JOGO`, `null` → `SEM FASE DEFINIDA`.
Ordem sempre fixa: Pré-jogo, depois Pós-jogo, depois Sem fase definida (essa última só aparece se
houver pelo menos um gasto legado sem fase — não aparece para jogos cujos gastos foram todos
lançados depois desta feature).

## PDFs — layout

Dentro de cada seção de fase: cabeçalho da fase (título + subtotal da fase, no mesmo estilo visual
de destaque usado hoje pelo total geral, mas em escala menor) seguido pelas caixas de categoria
exatamente como já existem hoje (`categoriaBox`/`categoriaHeaderRow`/subtotal de categoria — sem
mudança nesse nível). O "Total Efetuado"/"Total Previsto" no fim do documento continua como está.

Para manter tudo numa folha A4 com o nível extra de agrupamento, aperto o espaçamento vertical já
existente (ex.: `categoriaBox.marginTop`/`padding`, `linha.paddingVertical`) em um fator pequeno —
suficiente para abrir espaço para os cabeçalhos de fase sem comprometer a legibilidade. Reaproveito
as mesmas cores (`CORES`) e padrão visual (`DocumentoHeader`/`DocumentoFooter`/`AssinaturasBlock`)
já estabelecidos em `lib/pdf/logistica-shared.tsx` — nenhum estilo novo "do zero".

Valido o encaixe em uma única página usando o harness local de renderização
(`@react-pdf/renderer` isolado, já usado nesta sessão para outro documento) com dados de exemplo
realistas: 2 fases, várias categorias em cada uma, e pelo menos uma categoria com várias linhas
(ex. Arbitragem com 4 itens, como no print). Se o resultado estourar uma página, aperto fonte/
espaçamento mais um pouco antes de considerar mudar o layout (ver alternativas B/C descartadas
abaixo).

## Rotas (`despesas/pdf/route.tsx` e `pdf/route.tsx`, Profissional e Base)

As 4 rotas (2 documentos × 2 departamentos) passam a agrupar em dois níveis: primeiro um
`Map<FaseGasto, Map<string, Categoria>>` por fase (chave `g.fase ?? null`), e dentro de cada fase, o
mesmo agrupamento por `categoria.nome` que já existe hoje. Sem mudança na query em si (`gastos_jogo`
já traz o campo `fase` assim que a migração rodar).

## Alternativas de layout descartadas

- Fundir fase+categoria num único cabeçalho (ex. "PRÉ-JOGO · Arbitragem") sem caixa de seção
  separada: mais compacto, mas perde a separação visual clara de fase que aparece no print do
  usuário.
- Duas colunas lado a lado (Pré-jogo à esquerda, Pós-jogo à direita): ganha espaço vertical, mas
  categorias com várias linhas (ex. Arbitragem) ficam apertadas e a descrição pode quebrar mal.

Fica como plano B caso o aperto de espaçamento da abordagem escolhida não seja suficiente.

## Arquivos afetados

- `supabase/migrations/0135_gastos_jogo_fase.sql` (novo)
- `lib/validation/schemas.ts` — `gastoJogoSchema` + novo `FASE_GASTO_OPTIONS`
- `app/jogos/[id]/financeiro/gasto-form.tsx` e `app/base/jogos/[id]/financeiro/gasto-form-base.tsx`
- `app/jogos/[id]/financeiro/actions.ts` e `app/base/jogos/[id]/financeiro/actions.ts`
- `lib/pdf/relatorio-despesas-document.tsx` e `lib/pdf/orcamento-document.tsx`
- `app/jogos/[id]/financeiro/despesas/pdf/route.tsx` e espelho Base
- `app/jogos/[id]/financeiro/pdf/route.tsx` e espelho Base

Fora de escopo: `despesas_avulsas`/`despesas_avulsas_base`, a tela de listagem
(`/jogos/[id]/financeiro`), `lib/pdf/relatorio-financeiro-document.tsx` (relatório consolidado,
documento diferente, sem fase).

## Plano de verificação

- `npx tsc --noEmit`, `npx vitest run`, `npx eslint` nos arquivos tocados, `npx next build`.
- Renderização de exemplo via harness local confirmando 1 página para os dois documentos, nos dois
  departamentos, com dados realistas (fases com múltiplas categorias, categoria com múltiplas
  linhas).
- Migração colada no chat para o usuário rodar manualmente no SQL Editor do Supabase (sem acesso a
  banco a partir do sandbox).
