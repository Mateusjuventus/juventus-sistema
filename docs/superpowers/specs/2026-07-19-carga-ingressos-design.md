# Carga de Ingressos — Design

**Data:** 2026-07-19
**Autor:** Mateus Santos (Supervisor de Futebol Profissional — Juventus)
**Status:** Aprovado

## Contexto

Mateus recebe, para cada jogo, uma quantidade de ingressos (a "carga"). Ao longo dos dias que
antecedem o jogo, pessoas vão pedindo ingresso e ele vai atendendo aos poucos — nem sempre entrega
a quantidade exata pedida. Hoje isso é controlado fora do sistema (de cabeça ou em papel/planilha
avulsa), sem visibilidade de quanto ainda resta disponível. Este módulo é o análogo, para
ingressos, do que o módulo de Estoque (`estoque_entradas` / `estoque_saidas`) já faz para material
esportivo/médico: registrar entradas (cargas recebidas) e saídas (solicitações atendidas) com saldo
sempre visível.

## Objetivo

Dentro de cada jogo, permitir que Mateus: (1) lance uma ou mais cargas de ingressos recebidas; (2)
lance cada solicitação nomeada, com quantidade pedida e quantidade efetivamente atendida; (3) veja
a qualquer momento o saldo disponível (total recebido − total atendido); (4) edite ou exclua
qualquer lançamento (carga ou solicitação); (5) gere um relatório (a própria tela, mais um PDF no
mesmo padrão dos outros módulos) com tudo isso.

## Fora de escopo

- Painel geral consolidando ingressos de todos os jogos (diferente do painel geral que existe para
  Financeiro) — cada jogo é independente por enquanto; pode virar um módulo futuro se for útil.
- Catálogo/cadastro de solicitantes recorrentes (autocomplete de nomes já usados) — o nome é só um
  campo de texto livre a cada solicitação, sem vínculo com cadastro de pessoas.
- Categorização do tipo de ingresso (setor, arquibancada, cadeira etc.) — a carga e as solicitações
  são só quantidade, sem subdivisão por tipo/local do ingresso.
- Notificação automática (ex: avisar o solicitante quando atendido) — o controle é só interno, de
  uso do próprio Mateus.
- Aprovação/alçada sobre as solicitações — qualquer lançamento é imediato, sem fluxo de aprovação.

## Modelo de dados

Nova migration `supabase/migrations/0030_ingressos.sql`.

### Nova tabela: `ingressos_cargas`

Cada linha é uma remessa de ingressos recebida para aquele jogo. Pode haver mais de uma por jogo
(ex: chegou mais depois da carga inicial) — o saldo soma todas.

```sql
create table public.ingressos_cargas (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogos(id) on delete cascade,
  quantidade integer not null check (quantidade > 0),
  data date not null default current_date,
  observacoes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ingressos_cargas_set_updated_at
  before update on public.ingressos_cargas
  for each row execute function set_updated_at();

create index ingressos_cargas_jogo_id_idx on public.ingressos_cargas (jogo_id);
```

### Nova tabela: `ingressos_solicitacoes`

Cada linha é um pedido nomeado. `quantidade_atendida` pode ser menor que `quantidade_solicitada`
(atendimento parcial) e começa em 0 até Mateus preencher quanto de fato entregou.

```sql
create table public.ingressos_solicitacoes (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogos(id) on delete cascade,
  nome_solicitante text not null,
  quantidade_solicitada integer not null check (quantidade_solicitada > 0),
  quantidade_atendida integer not null default 0 check (quantidade_atendida >= 0),
  observacoes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ingressos_solicitacoes_set_updated_at
  before update on public.ingressos_solicitacoes
  for each row execute function set_updated_at();

create index ingressos_solicitacoes_jogo_id_idx on public.ingressos_solicitacoes (jogo_id);
```

RLS: mesma política `authenticated_full_access` usada em todas as outras tabelas do sistema, em
ambas as tabelas.

Saldo disponível **não** é uma coluna guardada — é sempre `soma(ingressos_cargas.quantidade) −
soma(ingressos_solicitacoes.quantidade_atendida)` daquele jogo, calculado no carregamento da
página e reconferido no servidor a cada lançamento (mesmo espírito do previsto/efetuado/diferença
em Financeiro, que também são somados on-the-fly em vez de guardados).

## Telas / Fluxo

### Nova aba "Carga de Ingressos" (`/jogos/[id]/ingressos`)

Adicionada ao `JogoTabs`, ao lado de Financeiro.

- Três números-resumo no topo: **Total recebido**, **Total atendido**, **Saldo disponível**
  (destacado em vermelho se, por alguma razão, ficar zero/baixo — normalmente não deveria ficar
  negativo, ver regra de bloqueio abaixo).
- Seção "Cargas recebidas": lista (data, quantidade, observação) + botão "+ Nova carga";
  editar/excluir cada uma (`DeleteButton`, mesmo padrão do resto do sistema).
- Seção "Solicitações": tabela (Nome, Solicitado, Atendido, Observação, Ações) + botão "+ Nova
  solicitação"; editar/excluir cada uma.
- Botão "Gerar PDF".

### Formulário de carga

Segue o padrão já usado em Programação: formulário sempre visível acima da lista (sem navegação
para outra página), que ao editar uma linha existente troca para modo edição no lugar.

Campos: quantidade (obrigatório, > 0), data (default hoje), observações (opcional).

### Formulário de solicitação

Campos: nome do solicitante (obrigatório), quantidade solicitada (obrigatório, > 0), quantidade
atendida (opcional, default 0, ≥ 0), observações (opcional).

**Regra de bloqueio de saldo:** ao salvar (criar ou editar) uma solicitação, o server action
recalcula o saldo disponível daquele jogo (somando todas as cargas menos todo o atendido de outras
solicitações, excluindo a própria linha em edição) e, se o novo valor de `quantidade_atendida`
tornar esse saldo negativo, rejeita a operação com uma mensagem de erro explícita (ex: "Saldo
insuficiente: restam X ingressos disponíveis") — mesmo padrão `useFormState` com
`{error?, fieldErrors?, values?}` já usado em `financeiro/actions.ts` e corrigido em
`programacao/actions.ts`.

### PDF (`/jogos/[id]/ingressos/pdf`)

Mesmo padrão visual dos outros documentos oficiais (`DocumentoHeader`/`DocumentoFooter` de
`lib/pdf/logistica-shared.tsx`): resumo (recebido/atendido/saldo) no topo, tabela de cargas
recebidas, tabela de solicitações (nome, solicitado, atendido), tudo em uma página A4.

## Testes / verificação

- Lançar duas cargas no mesmo jogo e confirmar que o total recebido soma as duas.
- Lançar uma solicitação com atendido menor que o solicitado (atendimento parcial) e confirmar que
  só o atendido desconta do saldo.
- Tentar lançar/editar uma solicitação com quantidade atendida maior que o saldo disponível e
  confirmar que é bloqueado com mensagem clara, sem salvar.
- Editar uma solicitação já existente reduzindo o atendido e confirmar que o saldo volta a subir
  corretamente (a validação de bloqueio deve excluir o valor antigo da própria linha do cálculo).
- Excluir uma carga e uma solicitação e confirmar que os totais recalculam.
- Gerar o PDF com cargas e solicitações lançadas e conferir os valores batendo com a tela.
- Verificar responsividade da aba em tela de celular.
