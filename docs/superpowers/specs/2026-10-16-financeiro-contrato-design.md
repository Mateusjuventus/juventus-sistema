# Financeiro — Contabilização do Contrato do Atleta (Profissional e Base)

## Contexto

O cadastro de Contrato do Atleta (migração `0137_atleta_contrato.sql`) já guarda, por atleta, um
contrato "vigente" por vez (`atleta_contratos` no Profissional, `atleta_base_contratos` na Base),
com 5 rubricas de remuneração (Salário CTPS, Direito de Imagem, Bonificação, Auxílio Moradia,
Outros). Esses valores ainda não aparecem em nenhum lugar do módulo Financeiro — o pedido do
Mateus foi "contabilizar" esses valores e reaproveitar a geração de documentos (PDF) que o
Financeiro já tem.

O Financeiro da Base já tem uma aba "Geral da Base" (`/base/financeiro?aba=geral`,
`GeralBaseView` + `calcularGeralBase` em `lib/futebol/financeiro-base.ts`) que soma salário da
Comissão Técnica + custo dos atletas + despesas avulsas, com PDF em `/base/financeiro/pdf-geral`.
Essa aba hoje usa sempre `atletas_base.valor_ajuda_custo` como custo de cada atleta, seja qual for
o `tipo_contrato`. O Financeiro do Profissional (`/financeiro`, página única) não tem nenhum
equivalente — só Prestação de Contas por jogo + despesas avulsas.

## Decisões já confirmadas com o usuário

1. **Formato**: resumo ao vivo (como a aba "Geral da Base" já funciona hoje) — nada de lançamento
   manual nem um registro histórico separado dos valores.
2. **Fallback na Base**: o custo de cada atleta passa a ser o total do contrato vigente; só quem
   não tem contrato cadastrado continua usando `valor_ajuda_custo`.
3. **Escopo**: os dois departamentos — Profissional e Base.
4. **Estrutura no Profissional**: nova aba "Geral" em `/financeiro` (mesma navegação por abas que a
   Base já tem), **sem** despesas avulsas nela — a aba "Jogos" (Prestação de Contas) continua
   exatamente como está hoje, sem nenhuma mudança nos totais de previsto/efetuado.

## Mudança 1 — Base: `calcularGeralBase` passa a usar o contrato vigente

`lib/futebol/financeiro-base.ts` ganha um novo parâmetro com os contratos vigentes da Base
(`atleta_base_contratos` filtrados por `vigente = true`, buscados em `GeralBaseView` junto com
`comissao`/`atletas`/`despesas`). A assinatura passa de

```ts
calcularGeralBase(comissao, atletas, despesas)
```

para

```ts
calcularGeralBase(comissao, atletas, despesas, contratosVigentes)
```

Internamente, construo um `Map<atleta_id, totalContrato>` a partir de `contratosVigentes` (total =
soma das 5 rubricas) e troco a linha:

```ts
const custoAtletas = atletas.reduce((soma, a) => soma + (a.valor_ajuda_custo ?? 0), 0);
```

por uma função auxiliar `custoAtletaBase(atleta, contratoPorAtleta)` que retorna o total do
contrato vigente quando existe um, e `valor_ajuda_custo ?? 0` como fallback quando não existe —
reaproveitada tanto na soma total quanto na quebra "por categoria" (`linhasCategoria`) e na listagem
nominal de atletas (hoje em `geral-base-view.tsx`, que também precisa trocar
`a.valor_ajuda_custo ?? 0` por essa mesma função).

O rótulo (Salário/Ajuda de custo/Empréstimo/Sem contrato) continua vindo de
`tipoPagamentoAtletaBase(atleta.tipo_contrato)`, sem mudança — esse campo já é sincronizado
automaticamente pela função de banco `criar_contrato_atleta_base` a cada novo contrato, então
continua refletindo o tipo correto mesmo depois da troca do valor usado.

O PDF (`/base/financeiro/pdf-geral`) já chama `calcularGeralBase` com os mesmos dados da tela — só
precisa passar o novo parâmetro de contratos vigentes também, sem mudar o layout do PDF.

**Zero mudança de schema** — essa mudança é só de cálculo, em cima de tabelas que já existem.

## Mudança 2 — Profissional: nova aba "Geral" em `/financeiro`

### Estrutura de página

`app/financeiro/page.tsx` é reestruturado para aceitar `?aba=jogos|geral` (igual
`app/base/financeiro/page.tsx`), com a barra de abas "Jogos" / "Geral". Todo o conteúdo atual da
página (stat cards de previsto/efetuado, Por categoria, Por jogo, Despesas avulsas) é extraído para
uma função `JogosView` dentro do mesmo arquivo — sem nenhuma mudança de comportamento, só uma
extração de função para abrir espaço para a aba nova. A aba "Geral" renderiza um novo componente
`GeralProfissionalView`.

### Cálculo

Novo arquivo `lib/futebol/financeiro.ts` (Profissional, paralelo a `financeiro-base.ts`), com uma
função `calcularGeralProfissional(comissao, atletas, contratosVigentes)`:

```ts
export interface GeralProfissionalResumo {
  custoComissao: number;
  custoAtletas: number;
  totalGeral: number;
}

export function calcularGeralProfissional(
  comissao: ComissaoTecnicaRow[],
  atletas: AtletaRow[],
  contratosVigentes: AtletaContratoRow[],
): GeralProfissionalResumo {
  const custoComissao = comissao.reduce((soma, c) => soma + (c.valor_salario ?? 0), 0);
  const totalContratoPorAtleta = new Map(
    contratosVigentes.map((c) => [
      c.atleta_id,
      c.salario_ctps + c.direito_imagem + c.bonificacao + c.auxilio_moradia + c.outros,
    ]),
  );
  const custoAtletas = atletas.reduce(
    (soma, a) => soma + (totalContratoPorAtleta.get(a.id) ?? 0),
    0,
  );
  return { custoComissao, custoAtletas, totalGeral: custoComissao + custoAtletas };
}
```

Sem fallback (o Profissional não tem `valor_ajuda_custo`) e sem quebra "por categoria" (o
Profissional não tem categorias de idade como a Base) — por isso o resumo é mais simples que o da
Base.

### Tela

`GeralProfissionalView` (Server Component, mesmo padrão de `GeralBaseView`):
- Busca `comissao_tecnica`, `atletas` e `atleta_contratos` (filtrados por `vigente = true`) em
  paralelo, mais a checagem `podeVerCampoSensivel(supabase, "salario")` — mesma trava de permissão
  que a Base já usa para esconder valores sensíveis de quem não pode ver.
- Stat cards: "Custo mensal fixo" (Comissão + Atletas) e "Total geral" — mesmo visual dos cards da
  Base, sem o card de despesas avulsas (que não entra aqui).
- Gráfico `DonutComposicao` com 2 fatias (Comissão Técnica / Atletas) em vez de 3.
- Tabela "Comissão Técnica" (nome, função, salário) — igual à da Base, sem a coluna
  "Categoria(s)" (não existe no Profissional).
- Tabela "Atletas" com nome, tipo de contrato (rótulo a partir de `atletas.tipo_contrato`, mesmo
  padrão de `tipoPagamentoAtletaBase`, mas sem os casos `amador`/`iniciacao` que só existem na
  Base) e valor do contrato vigente — sem agrupamento por categoria, uma lista única.

### PDF

Novo `/financeiro/pdf-geral`, copiando o padrão exato de `/base/financeiro/pdf-geral` (mesma
função de cálculo, mesmo layout com assinatura configurável de `configuracoes_financeiro`) —
fecha o pedido de "gerar aqueles documentos" sem nenhum mecanismo novo de geração de PDF.

## Fora de escopo

- Qualquer lançamento manual ou histórico de "quanto foi pago quando" — o resumo é sempre o
  instantâneo atual (contrato vigente + salário cadastrado agora), igual ao que a Base já faz hoje.
- Mudança nos totais de previsto/efetuado da aba "Jogos" do Profissional — ela continua
  exatamente como está.
- O pedido antigo, ainda não esclarecido, de "remoção de previsto/efetuado" (de uma frente de
  trabalho anterior) — não tem relação com esta spec e não é tocado aqui.

## Testes

- `calcularGeralBase`: caso com contrato vigente (usa o total do contrato), caso sem contrato
  (usa `valor_ajuda_custo`), caso sem contrato e sem `valor_ajuda_custo` (zero).
- `calcularGeralProfissional`: caso com contrato vigente, caso sem contrato (zero, sem fallback).
- Verificação visual das duas telas (Base e Profissional) e dos dois PDFs depois da mudança.
