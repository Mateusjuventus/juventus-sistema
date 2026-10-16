# Atleta — Dados Esportivos (ajustes) e novo sub-sistema de Dados de Contrato

## Contexto

Continuação do mesmo pedido do Mateus coberto em
`docs/superpowers/specs/2026-10-16-atleta-dados-pessoais-design.md`:

> "DADOS ESPORTIVOS: Pode remover: nº FPF, Tipo de contrato, Data de início, Data de término.
> Acrescentar dados do Empresário: Telefone e email; Acrescentar tamanho do uniforme. DADOS DE
> CONTRA[TO]: Contrato Vigente: Tipo de contrato (se empréstimo, clube de origem); Vigência
> (início/término); Salário CTPS, Direito de Imagem, Bonificação, Auxílio Moradia, Outros (R$ cada);
> Valor total (soma automática), com % de cada rubrica; histórico de contratos anteriores ao
> renovar; botão 'Novo contrato'."

Hoje (campos reais encontrados em `atleta-form.tsx`/`atletaCamposBase`) "Dados esportivos" tem:
Posição, Número da camisa, Número CBF, **Número FPF**, Pé dominante, Status, **Tipo de contrato**
(Definitivo/Empréstimo/Amador/Formação, + Iniciação só na Base), Data de início no clube, **Data de
início do contrato**, **Data de término do contrato**, Empresário/representante (só nome).

Esta spec remove os campos em negrito do formulário (mantendo as colunas no banco, sem dropar —
ver "Decisões de design" abaixo), acrescenta telefone/e-mail do empresário e tamanho de uniforme, e
cria o sub-sistema de Dados de Contrato que passa a ser dono de tipo de contrato/vigência/
remuneração daqui pra frente.

## Decisões confirmadas com o Mateus

- Escopo: Profissional (`atletas`) e Base (`atletas_base`) — contrato salarial estruturado existe
  pros dois (a Base já tem tipos de contrato "Amador"/"Formação"/"Iniciação", que são vínculos legais
  reais com atletas menores de idade).
- "Data de início" a remover é só **Data de início do contrato**. "Data de início no clube" (quando
  o atleta entrou no Juventus) continua existindo — é uma informação diferente, sobre o período de
  vínculo com o clube, não sobre o contrato.
- Atletas que já têm Tipo de contrato/datas preenchidos hoje ganham, na migração, um "Contrato
  Vigente" inicial automático com esses dados (rubricas de valor ficam zeradas).
- Ao clicar "Novo contrato", o contrato vigente atual é encerrado automaticamente (vira histórico) e
  o recém-criado passa a ser o único vigente — sempre existe no máximo um vigente por atleta.
- Tamanho de uniforme é uma lista fixa (PP/P/M/G/GG/XG), não texto livre.
- Percentual de cada rubrica é só exibição, calculado a partir dos valores em R$ — não é um campo
  armazenado.

## Decisões de design (minhas, a confirmar com você)

- **Não vou apagar as colunas antigas do banco** (`numero_fpf`, `tipo_contrato`,
  `data_inicio_contrato`, `data_fim_contrato`, `possui_contrato_formacao`) nesta rodada — só saem do
  formulário. Mesmo princípio já usado em outros lugares do sistema (ex.: `endereco_atual`): manter
  colunas legadas é mais seguro do que dropar, caso algum relatório ainda dependa delas ou a migração
  precise ser conferida depois. Se quiser que eu limpe essas colunas de vez, dá pra fazer numa
  migração futura separada, sem pressa.
- **Valor total não fica salvo no banco** — é somado nas rubricas sempre que a tela é exibida (mesmo
  padrão já usado nos subtotais do Financeiro). Menos uma coisa que pode ficar desatualizada.
- **"Novo contrato" vira uma página própria** (`.../contrato/novo`), no mesmo padrão já usado em
  outras telas de criar um registro (ex.: `/atletas/novo`) — a tela principal de Contrato
  (`.../contrato`) fica só leitura (contrato vigente + histórico) com um botão que leva pra lá.

## Modelo de dados

Migração `0137_atleta_contrato.sql`:

```sql
-- Dados Esportivos: empresário (telefone + e-mail) e tamanho de uniforme.
alter table public.atletas add column if not exists empresario_telefone text;
alter table public.atletas add column if not exists empresario_email text;
alter table public.atletas add column if not exists tamanho_uniforme text
  check (tamanho_uniforme is null or tamanho_uniforme in ('PP', 'P', 'M', 'G', 'GG', 'XG'));

-- atletas_base já tem empresario_telefone (ver 0076_captacao_alojamento_base.sql) — só falta e-mail
-- e tamanho de uniforme.
alter table public.atletas_base add column if not exists empresario_email text;
alter table public.atletas_base add column if not exists tamanho_uniforme text
  check (tamanho_uniforme is null or tamanho_uniforme in ('PP', 'P', 'M', 'G', 'GG', 'XG'));

-- Dados de Contrato — histórico completo por atleta, um "vigente" por vez (garantido pelo índice
-- único parcial abaixo). Mesmo espírito de atletas_status_historico (0125): tabela de
-- histórico/auditoria própria, atleta não perde o controle principal.
create table public.atleta_contratos (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  vigente boolean not null default true,
  tipo_contrato text not null check (tipo_contrato in ('definitivo', 'emprestimo', 'amador', 'formacao')),
  -- Só preenchido quando tipo_contrato = 'emprestimo'.
  clube_origem text,
  vigencia_inicio date,
  vigencia_fim date,
  salario_ctps numeric(12, 2) not null default 0,
  direito_imagem numeric(12, 2) not null default 0,
  bonificacao numeric(12, 2) not null default 0,
  auxilio_moradia numeric(12, 2) not null default 0,
  outros numeric(12, 2) not null default 0,
  criado_por_perfil_id uuid references public.perfis(id) on delete set null,
  criado_por_nome text,
  created_at timestamptz not null default now(),
  encerrado_em timestamptz
);

-- Garante no máximo um vigente por atleta.
create unique index atleta_contratos_vigente_unico_idx
  on public.atleta_contratos (atleta_id) where vigente;

create index atleta_contratos_atleta_id_idx on public.atleta_contratos (atleta_id);

alter table public.atleta_contratos enable row level security;

create policy "authenticated_full_access" on public.atleta_contratos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atleta_contratos to authenticated;

create table public.atleta_base_contratos (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas_base(id) on delete cascade,
  vigente boolean not null default true,
  tipo_contrato text not null
    check (tipo_contrato in ('definitivo', 'emprestimo', 'amador', 'formacao', 'iniciacao')),
  clube_origem text,
  vigencia_inicio date,
  vigencia_fim date,
  salario_ctps numeric(12, 2) not null default 0,
  direito_imagem numeric(12, 2) not null default 0,
  bonificacao numeric(12, 2) not null default 0,
  auxilio_moradia numeric(12, 2) not null default 0,
  outros numeric(12, 2) not null default 0,
  criado_por_perfil_id uuid references public.perfis(id) on delete set null,
  criado_por_nome text,
  created_at timestamptz not null default now(),
  encerrado_em timestamptz
);

create unique index atleta_base_contratos_vigente_unico_idx
  on public.atleta_base_contratos (atleta_id) where vigente;

create index atleta_base_contratos_atleta_id_idx on public.atleta_base_contratos (atleta_id);

alter table public.atleta_base_contratos enable row level security;

create policy "authenticated_full_access" on public.atleta_base_contratos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atleta_base_contratos to authenticated;

-- Backfill: atleta que já tem tipo_contrato preenchido hoje ganha um Contrato Vigente inicial
-- (rubricas zeradas, pra você completar depois).
insert into public.atleta_contratos (atleta_id, tipo_contrato, vigencia_inicio, vigencia_fim, criado_por_nome)
select id, tipo_contrato, data_inicio_contrato, data_fim_contrato, 'Migração do sistema'
from public.atletas
where tipo_contrato is not null;

insert into public.atleta_base_contratos (atleta_id, tipo_contrato, vigencia_inicio, vigencia_fim, criado_por_nome)
select id, tipo_contrato, data_inicio_contrato, data_fim_contrato, 'Migração do sistema'
from public.atletas_base
where tipo_contrato is not null;

-- Função de banco pra "Novo contrato": encerra o vigente atual (se existir) e insere o novo, como
-- uma operação atômica só (evita a janela entre "encerrar" e "inserir" que duas chamadas separadas
-- do supabase-js teriam). Chamada via supabase.rpc(...) nas actions. Também sincroniza
-- `tipo_contrato`/`data_fim_contrato` de volta na linha do atleta — essas duas colunas continuam
-- sendo lidas direto por `AtletasResumoFiltros` (filtros/contadores da listagem de
-- `app/atletas/page.tsx`), então sem isso a listagem ficaria desatualizada depois de uma renovação.
create function public.criar_contrato_atleta(
  p_atleta_id uuid,
  p_tipo_contrato text,
  p_clube_origem text,
  p_vigencia_inicio date,
  p_vigencia_fim date,
  p_salario_ctps numeric,
  p_direito_imagem numeric,
  p_bonificacao numeric,
  p_auxilio_moradia numeric,
  p_outros numeric,
  p_criado_por_perfil_id uuid,
  p_criado_por_nome text
) returns public.atleta_contratos
language plpgsql
as $$
declare
  novo public.atleta_contratos;
begin
  update public.atleta_contratos
  set vigente = false, encerrado_em = now()
  where atleta_id = p_atleta_id and vigente;

  insert into public.atleta_contratos (
    atleta_id, tipo_contrato, clube_origem, vigencia_inicio, vigencia_fim,
    salario_ctps, direito_imagem, bonificacao, auxilio_moradia, outros,
    criado_por_perfil_id, criado_por_nome
  ) values (
    p_atleta_id, p_tipo_contrato, p_clube_origem, p_vigencia_inicio, p_vigencia_fim,
    p_salario_ctps, p_direito_imagem, p_bonificacao, p_auxilio_moradia, p_outros,
    p_criado_por_perfil_id, p_criado_por_nome
  ) returning * into novo;

  update public.atletas
  set tipo_contrato = p_tipo_contrato, data_fim_contrato = p_vigencia_fim
  where id = p_atleta_id;

  return novo;
end;
$$;

grant execute on function public.criar_contrato_atleta to authenticated;

-- Mesma função, pra atleta_base_contratos (idêntica sincronização com atletas_base).
create function public.criar_contrato_atleta_base(
  p_atleta_id uuid,
  p_tipo_contrato text,
  p_clube_origem text,
  p_vigencia_inicio date,
  p_vigencia_fim date,
  p_salario_ctps numeric,
  p_direito_imagem numeric,
  p_bonificacao numeric,
  p_auxilio_moradia numeric,
  p_outros numeric,
  p_criado_por_perfil_id uuid,
  p_criado_por_nome text
) returns public.atleta_base_contratos
language plpgsql
as $$
declare
  novo public.atleta_base_contratos;
begin
  update public.atleta_base_contratos
  set vigente = false, encerrado_em = now()
  where atleta_id = p_atleta_id and vigente;

  insert into public.atleta_base_contratos (
    atleta_id, tipo_contrato, clube_origem, vigencia_inicio, vigencia_fim,
    salario_ctps, direito_imagem, bonificacao, auxilio_moradia, outros,
    criado_por_perfil_id, criado_por_nome
  ) values (
    p_atleta_id, p_tipo_contrato, p_clube_origem, p_vigencia_inicio, p_vigencia_fim,
    p_salario_ctps, p_direito_imagem, p_bonificacao, p_auxilio_moradia, p_outros,
    p_criado_por_perfil_id, p_criado_por_nome
  ) returning * into novo;

  update public.atletas_base
  set tipo_contrato = p_tipo_contrato, data_fim_contrato = p_vigencia_fim
  where id = p_atleta_id;

  return novo;
end;
$$;

grant execute on function public.criar_contrato_atleta_base to authenticated;

notify pgrst, 'reload schema';
```

Novos tipos em `lib/supabase/types.ts`: `AtletaContratoRow`/`AtletaBaseContratoRow` (espelhando as
colunas acima) e `TAMANHO_UNIFORME_OPTIONS`.

## Formulário — Dados Esportivos

Removidos de `atleta-form.tsx`/`atleta-base-form.tsx`: campo Número FPF, Tipo de contrato (+
checkbox "Possui contrato de formação"), Data de início do contrato, Data de término do contrato.
`parseForm`/`gastoAtleta...` deixam de ler esses campos do FormData (continuam existindo no banco,
só não são mais gravados por aqui).

Acrescentados: `TelefoneField` "Telefone do empresário" (reaproveitando `telefoneFieldValidado` no
Profissional — a Base já usa `telefoneField` texto livre pro empresário hoje; mantenho cada um como
já está, só acrescentando o e-mail do lado), `TextField` (`type="email"`) "E-mail do empresário", e
`SelectField` "Tamanho do uniforme" com as opções PP/P/M/G/GG/XG.

## Dados de Contrato — nova aba

Nova aba "Contrato" em `AtletaTabs`/`AtletaTabsBase`, ao lado de Dados Pessoais/Documentação/Dados
de Jogo.

**`app/atletas/[id]/contrato/page.tsx`** (e espelho em
`app/base/atletas/[categoria]/[id]/contrato/page.tsx`) — só leitura:
- Se existe contrato vigente: card com Tipo de contrato (+ Clube de origem quando Empréstimo),
  Vigência (início – término), as 5 rubricas em R$, Valor total (soma) e o % de cada rubrica ao
  lado. Botão "Novo contrato" leva pra `.../contrato/novo`.
- Se não existe: estado vazio ("Nenhum contrato cadastrado ainda") + botão "Novo contrato".
- Abaixo, "Histórico" — lista dos contratos com `vigente = false`, mesma estrutura em cartões mais
  compactos, ordenados do mais recente pro mais antigo, sem nenhuma ação (só consulta).

**`app/atletas/[id]/contrato/novo/page.tsx`** (e espelho Base) — formulário: Tipo de contrato
(mesmo `SelectField` de hoje); campo "Clube de origem" só aparece quando Tipo de contrato =
Empréstimo (mesmo padrão já usado pro "Possui contrato de formação" condicional); Vigência início/
término (`TextField type="date"`); as 5 rubricas com `CurrencyField`. Sem campo de percentual (só
texto explicativo "o percentual de cada rubrica aparece depois de salvar"). Ação de servidor
`criarContrato(atletaId, ...)` chama a função de banco `criar_contrato_atleta`/
`criar_contrato_atleta_base` (via `supabase.rpc(...)`, ver migração) — ela encerra o vigente atual
(se existir) e insere o novo numa operação atômica só, sem depender de duas chamadas separadas do
supabase-js. Redireciona pra `.../contrato` ao terminar.

## Alternativas descartadas

- **Guardar o valor total como coluna gerada (`generated always as`)** — descartado: o Postgres
  recalcula sozinho, mas adiciona complexidade de migração sem necessidade real (nada mais no
  sistema precisa consultar/filtrar por valor total; é só exibido numa tela).
- **"Novo contrato" como formulário inline na mesma página do vigente** (em vez de página própria)
  — descartado: o formulário tem bastante campo (tipo + condicional + vigência + 5 valores), fica
  mais claro como uma página dedicada, seguindo o padrão já usado em outras criações do sistema.

## Arquivos afetados

- `supabase/migrations/0137_atleta_contrato.sql` (novo)
- `lib/supabase/types.ts` — `AtletaRow`/`AtletaBaseRow` (empresario_telefone/email, tamanho_uniforme),
  `AtletaContratoRow`, `AtletaBaseContratoRow`
- `lib/validation/schemas.ts` — remove tipoContrato/dataInicioContrato/dataFimContrato/numeroFpf de
  `atletaCamposBase` (ou só deixa de exigir/exibir, mantendo compatibilidade de tipos onde preciso);
  novo `atletaContratoSchema`; `TAMANHO_UNIFORME_OPTIONS`
- `components/atleta-tabs.tsx`, `components/atleta-tabs-base.tsx` — nova aba "Contrato"
- `app/atletas/atleta-form.tsx`, `app/base/atletas/atleta-base-form.tsx`
- `app/atletas/actions.ts`, `app/base/atletas/actions.ts`
- `app/atletas/[id]/contrato/page.tsx`, `app/atletas/[id]/contrato/novo/page.tsx` (novos)
- `app/base/atletas/[categoria]/[id]/contrato/page.tsx`,
  `app/base/atletas/[categoria]/[id]/contrato/novo/page.tsx` (novos)

## Verificação

Checagem de sintaxe por esbuild em cada arquivo tocado. Sem PDF envolvido, então sem harness de
render necessário. Recomendo rodar `npm run typecheck`/`next build` no projeto real antes do
deploy — principalmente a ação `criarContrato`, que depende do índice único parcial pra garantir
que nunca fiquem dois contratos vigentes ao mesmo tempo (vale testar manualmente clicando "Novo
contrato" duas vezes num mesmo atleta depois de implementado).
