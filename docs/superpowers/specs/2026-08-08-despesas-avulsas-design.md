# Despesas Avulsas (Financeiro / Prestação de Contas) — Design

**Data:** 2026-08-08
**Autor:** Mateus Santos (Supervisor de Futebol Profissional — Juventus)
**Status:** Em revisão

## Contexto

A Prestação de Contas (`/financeiro`, ver `docs/superpowers/specs/2026-07-14-prestacao-contas-financeiro-design.md`)
hoje só cobre gastos ligados a um jogo específico (`gastos_jogo`, lançados dentro da aba Financeiro
de cada jogo). Ficou de fora, de propósito, qualquer despesa que não pertence a um jogo — folha de
pagamento, manutenção do CT, despesas administrativas gerais. Este documento adiciona essa parte:
"despesas avulsas".

## Objetivo

Permitir lançar despesas que não pertencem a nenhum jogo (ou que são compartilhadas entre vários
jogos, ex: um ônibus que serve duas partidas fora), com o mesmo fluxo de orçamento previsto x
efetuado já usado nos gastos de jogo — tudo dentro da área da Prestação de Contas, sem misturar com
o resumo financeiro de nenhum jogo individual.

## Decisões (via perguntas de esclarecimento)

- **Onde mora:** dentro de `/financeiro` (Prestação de Contas) — não é um módulo novo.
- **Como soma:** os totais do topo (previsto/efetuado/diferença) e a tabela "Por categoria" somam
  gastos de jogo + despesas avulsas juntos — um número só do clube inteiro.
- **Fluxo:** mesmo modelo previsto → efetuado dos gastos de jogo (previsto obrigatório, efetuado
  opcional, preenchido depois).
- **Vínculo com jogos:** uma despesa avulsa pode, opcionalmente, ser relacionada a nenhum, um ou
  vários jogos (ex: orçamento de uma viagem que cobre 2 jogos fora). Esse vínculo é só uma
  etiqueta/referência — **não entra no resumo previsto/efetuado de nenhum jogo individual**, nem na
  aba Financeiro do jogo. O resumo "Por jogo" em `/financeiro` continua exatamente como está hoje,
  só com gastos de `gastos_jogo`.
- **Onde lançar:** tela própria `/financeiro/despesas-avulsas`, com formulário + lista, acessada por
  um botão em `/financeiro` (já que a tela geral hoje é só leitura/resumo).
- **Data:** cada despesa avulsa tem uma data própria (não tem jogo pra herdar a data). Lista única
  ordenada por data (mais recente primeiro), sem filtro de período nesta versão.
- **PDF:** entram tanto no relatório geral (`/financeiro/pdf`, seção nova "Despesas Avulsas") quanto
  num relatório dedicado só delas — "Gerar Relatório de Despesas Avulsas", pedido explicitamente pelo Mateus,
  mesmo padrão do PDF "Orçamento Previsto" que cada jogo já tem, mas para o conjunto de despesas
  avulsas.
- **Excel:** a exportação geral (`/financeiro/export`) ganha as despesas avulsas também, pelo mesmo
  motivo do PDF geral — manter a exportação batendo com os totais da tela.

## Fora de escopo (fica para depois, se fizer falta)

- Filtro por mês/período na lista de despesas avulsas (útil pra algo recorrente como folha de
  pagamento, mas não pedido nesta leva — lista única por enquanto).
- Anexo de comprovante/nota fiscal (mesmo fora de escopo já definido para gastos de jogo).
- Edição/exclusão de categorias do catálogo (`categorias_gasto`) — só criar novas, mesmo padrão já
  usado em todo o sistema.
- Divisão automática de valor entre os jogos vinculados — o vínculo é só referência, o valor da
  despesa avulsa não é rateado nem exibido em nenhum jogo individual.

## Modelo de dados

### Nova tabela: `despesas_avulsas`

Mesmo formato de `gastos_jogo`, sem `jogo_id` obrigatório:

- `id uuid primary key default gen_random_uuid()`
- `categoria_id uuid not null references categorias_gasto(id)` (reaproveita o catálogo já existente)
- `descricao text` (opcional)
- `data date` (opcional — igual ao padrão já usado em `gastos_jogo.data`, ver migração `0048`)
- `valor_previsto numeric(10,2) not null default 0`
- `valor_efetuado numeric(10,2)` (nulo até ser preenchido)
- `created_by uuid references auth.users(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()` (trigger `set_updated_at`, mesmo padrão das outras
  tabelas do módulo)

### Nova tabela: `despesas_avulsas_jogos`

Vínculo N:N, só informativo (não usado em nenhum cálculo de jogo):

- `despesa_id uuid not null references despesas_avulsas(id) on delete cascade`
- `jogo_id uuid not null references jogos(id) on delete cascade`
- `primary key (despesa_id, jogo_id)`

RLS: mesma política `authenticated_full_access` de todas as outras tabelas do sistema, com os grants
correspondentes (`select, insert, update, delete` para `authenticated`).

## Telas / Fluxo

### `/financeiro/despesas-avulsas` (nova)

- Formulário de nova despesa: categoria (`<select>` com "+ Cadastrar nova categoria..." — mesmo
  padrão do formulário de gasto de jogo), descrição (opcional), data (opcional), valor previsto,
  valor efetuado (opcional), e um seletor múltiplo opcional "Jogos relacionados" (lista de jogos,
  mais recentes primeiro, com busca se a lista crescer muito).
- Tabela das despesas já lançadas: Categoria | Descrição | Data | Jogos relacionados (etiquetas) |
  Previsto | Efetuado | Diferença, com editar/excluir por linha e totais no rodapé.
- Botão "Gerar Relatório de Despesas Avulsas" (PDF só das despesas avulsas).
- Link "← Voltar" para `/financeiro`.

### `/financeiro` (atualização)

- Os 3 cards do topo (Total previsto / Total efetuado / Diferença) passam a somar `gastos_jogo` +
  `despesas_avulsas`.
- A tabela "Por categoria" também soma as duas fontes, por categoria.
- A seção "Por jogo" **não muda** — continua só com os gastos de `gastos_jogo`, como já funciona.
- Nova seção "Despesas avulsas" (abaixo de "Por jogo"): lista cada despesa avulsa (mesmo estilo de
  card usado em "Por jogo"), com as etiquetas dos jogos relacionados quando houver, linkando para
  `/financeiro/despesas-avulsas`.
- Novo botão "+ Despesa avulsa" na barra de ações do topo (ao lado de "Exportar para Excel" e
  "Gerar Relatório PDF"), linkando para `/financeiro/despesas-avulsas`.

### PDF "Relatório de Despesas Avulsas" (`/financeiro/despesas-avulsas/pdf`, novo)

Mesmo padrão visual dos outros documentos (cabeçalho/rodapé de `lib/pdf/logistica-shared.tsx`):
tabela com Categoria | Descrição | Data | Previsto | Efetuado, agrupada por categoria, com total
geral no final. Quando uma despesa tem jogos relacionados, eles aparecem como texto auxiliar abaixo
da descrição (ex: "Jogos: Juventus x Adversário (12/08), Juventus x Outro (19/08)").

### PDF geral (`/financeiro/pdf`, atualização)

Ganha uma seção nova "Despesas Avulsas", mesmo padrão de tabela das outras seções do relatório, para
os totais do PDF baterem com os totais da tela.

### Exportação Excel (`/financeiro/export`, atualização)

Ganha as despesas avulsas na planilha exportada (nova aba ou seção, seguindo o padrão já usado para
os gastos de jogo), pelo mesmo motivo do PDF geral.

## Testes / verificação

- Criar uma categoria nova direto no formulário de despesa avulsa e confirmar que fica disponível
  nos lançamentos seguintes (mesmo teste já feito para gastos de jogo).
- Lançar uma despesa avulsa só com previsto, salvar, depois editar para incluir o efetuado, e
  confirmar que o previsto não se perde.
- Lançar uma despesa avulsa vinculada a 2 jogos e confirmar que ela NÃO aparece no resumo financeiro
  de nenhum dos dois jogos (aba Financeiro do jogo continua batendo só com os gastos próprios dele).
- Editar e excluir uma despesa avulsa já lançada.
- Conferir que os totais do topo e a tabela "Por categoria" em `/financeiro` somam corretamente
  gastos de jogo + despesas avulsas, incluindo quando o efetuado ainda não foi preenchido (tratar
  como zero, sem quebrar o cálculo).
- Gerar o PDF "Relatório de Despesas Avulsas" com despesas lançadas (algumas com jogos relacionados, outras sem)
  e conferir os valores e a lista de jogos relacionados.
- Gerar o PDF geral e a exportação Excel e conferir que a seção/aba de despesas avulsas aparece e os
  totais batem com a tela.
- Verificar responsividade da tela `/financeiro/despesas-avulsas` e da nova seção em `/financeiro`
  em tela de celular.
