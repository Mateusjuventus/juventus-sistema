# Prestação de Contas (Financeiro) — Design

**Data:** 2026-07-14
**Autor:** Mateus Santos (Supervisor de Futebol Profissional — Juventus)
**Status:** Aprovado

## Contexto

Quinto módulo do roadmap definido em `2026-07-08-fundacao-cadastros-elenco-design.md`: controle
financeiro por jogo, com orçamento previsto x efetuado e um painel geral comparando todos os jogos.
Hoje esse módulo aparece só como o card "Prestação de Contas" em "Em breve" na tela
`/profissional` — este documento o substitui por um módulo funcional.

## Objetivo

Permitir que, para cada jogo, Mateus lance os gastos previstos (orçamento planejado antes do jogo)
e, conforme acontecem, preencha o valor efetivamente gasto — sem precisar lançar tudo de uma vez;
o previsto fica salvo e o efetuado é preenchido depois, no mesmo lançamento. A partir disso: (1) uma
aba "Financeiro" dentro de cada jogo mostra a comparação previsto x efetuado x diferença daquele
jogo, com um PDF do orçamento previsto para aprovação; (2) um painel geral novo soma todos os jogos,
comparando previsto x efetuado por categoria e listando o resumo financeiro de cada jogo.

## Fora de escopo (fica para módulos futuros)

- Anexo de comprovante/nota fiscal em cada gasto (só valor e descrição por enquanto).
- Financeiro fora do contexto de jogo (folha de pagamento, manutenção do CT, despesas
  administrativas gerais) — este módulo cobre só gastos ligados a um jogo específico.
- PDF comparativo previsto x efetuado (o PDF gerado mostra só o previsto, para aprovação antes do
  jogo; um PDF de prestação de contas pós-jogo pode vir depois, se necessário).
- Edição/exclusão de categorias já cadastradas — só é possível criar novas (mesmo padrão já usado
  no catálogo de funções do Staff Operacional).
- Alçada/aprovação (fluxo de quem aprova o orçamento previsto) — o PDF serve como documento de
  apoio, não há aprovação dentro do sistema.

## Modelo de dados

### Nova tabela: `categorias_gasto`

Catálogo de categorias de gasto, extensível (mesmo padrão de `staff_funcoes_catalogo`):

- `id uuid primary key default gen_random_uuid()`
- `nome text not null unique`
- `created_at timestamptz not null default now()`

Seed inicial: Hospedagem, Transporte/Ônibus, Alimentação, Arbitragem, Material Esportivo,
Segurança, Doping, Credenciamento, Ambulância, Outros.

### Nova tabela: `gastos_jogo`

- `id uuid primary key default gen_random_uuid()`
- `jogo_id uuid not null references jogos(id) on delete cascade`
- `categoria_id uuid not null references categorias_gasto(id)`
- `descricao text` (opcional — detalhe do gasto, ex: "Ônibus 2 — viagem de volta")
- `valor_previsto numeric(10,2) not null default 0`
- `valor_efetuado numeric(10,2)` (nulo até ser preenchido)
- `created_by uuid references auth.users(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()` (com trigger `set_updated_at`, mesmo padrão de
  `recibos_jogo`)

RLS: mesma política `authenticated_full_access` usada em todas as outras tabelas do sistema.

## Telas / Fluxo

### Aba "Financeiro" dentro do jogo (`/jogos/[id]/financeiro`)

Nova aba no `JogoTabs`, ao lado de Dados do jogo, Convocação, Logística, Credenciamento e Recibo de
Pagamento.

- Formulário de novo gasto: categoria (`<select>` com as opções do catálogo + "+ Cadastrar nova
  categoria..." no final, revelando um campo de texto — mesmo padrão já usado no função do Staff
  Operacional), descrição (opcional), valor previsto, valor efetuado (opcional).
- Tabela dos gastos já lançados: Categoria | Descrição | Previsto | Efetuado | Diferença, com
  botões de editar/excluir por linha (reaproveita o padrão de `DeleteButton` já usado no resto do
  sistema) e uma linha de totais no rodapé.
- Botão "Gerar PDF do Orçamento Previsto".

### PDF "Orçamento Previsto" (`/jogos/[id]/financeiro/pdf`)

Segue o mesmo padrão visual dos outros documentos oficiais (cabeçalho com os escudos do confronto
via `DocumentoHeader`, rodapé de identidade via `DocumentoFooter`, ambos de `lib/pdf/logistica-shared.tsx`):
tabela com Categoria | Descrição | Valor Previsto, agrupada/ordenada por categoria, com o total
geral no final.

### Painel geral "Prestação de Contas" (`/financeiro`, substitui o card "Em breve")

Novo módulo de topo, com link próprio na tela `/profissional` (sai de "Em breve", vira card ativo
igual aos outros).

- Três números-resumo no topo: total previsto, total efetuado e diferença, somando todos os jogos.
- Tabela por categoria: soma do previsto x efetuado x diferença de cada categoria, somando todos os
  jogos.
- Lista de jogos (mais recente primeiro) com o resumo financeiro de cada um (previsto/efetuado/
  diferença daquele jogo), cada um linkando para a aba Financeiro do jogo correspondente.

## Testes / verificação

- Criar uma categoria nova direto no formulário de gasto (fluxo "+ Cadastrar nova categoria...") e
  confirmar que fica disponível nos lançamentos seguintes.
- Lançar um gasto só com previsto, salvar, depois editar o mesmo lançamento para incluir o
  efetuado, e confirmar que o previsto não se perde.
- Editar e excluir um gasto já lançado.
- Gerar o PDF do orçamento previsto de um jogo com gastos lançados e conferir os valores.
- Conferir que os totais (por jogo e no painel geral) somam corretamente previsto, efetuado e
  diferença, incluindo quando o efetuado ainda não foi preenchido (tratar como zero na soma, sem
  quebrar o cálculo).
- Verificar responsividade da aba Financeiro e do painel geral em tela de celular.
