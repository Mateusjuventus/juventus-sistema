-- Unificação de Jogos/Convocação (Futebol Profissional + Futebol de Base) — Fase 2. Ver
-- docs/superpowers/specs/2026-10-29-unificacao-jogos-design.md e
-- docs/superpowers/plans/2026-10-29-unificacao-jogos-plano.md. Mesmo molde das unificações
-- anteriores (Comissão Técnica 0149, Atletas 0150, Staff Operacional 0155): `jogos` (Profissional)
-- continua sendo a tabela canônica; `jogos_base` e as 10 tabelas filhas + `configuracoes_
-- financeiro_base` são renomeadas pra `_old` no final, como backup — não são apagadas.
--
-- Pré-requisitos já resolvidos antes desta migration (ver spec):
--   0153 — fix de pessoa_id (atleta) em onibus/rooming-list da Base, remanescente da unificação de
--          Atletas.
--   0154 — remoção de convocacao_staff/convocacao_staff_base (tabelas nunca usadas).
--   0155 — unificação de Staff Operacional (bloqueava a Vagas de Staff, que referencia
--          staff_operacional via FK real).
--   0156 — fix de pessoa_id (staff) em recibos_jogo_base, remanescente da unificação de Staff
--          Operacional.
--
-- Diferente de Atletas/Comissão Técnica/Staff Operacional: não existe conceito de "jogo duplicado"
-- entre Profissional e Base (um jogo é sempre de um departamento só, nunca a mesma partida
-- cadastrada nos dois lados) — então não precisa de mapeamento por CPF/RG nem de tabela de
-- remapeamento de id. Todo `id` de `jogos_base` (e das tabelas filhas) é preservado tal como está
-- ao entrar em `jogos` — isso também significa que nenhuma tabela filha precisa reapontar
-- `jogo_id`/`convocacao_id`/`sumula_id`/`onibus_lista_id`/`rooming_list_id`/`quarto_id`/`vagas_id`/
-- `vaga_funcao_id`: os valores que já têm continuam batendo depois da migração.

begin;

-- =========================================================
-- 0) Checagem de sanidade: nenhum id de `jogos_base` pode já existir em `jogos` (colisão de UUID é
--    praticamente impossível, mas é barato conferir antes de confiar na preservação de id).
-- =========================================================
do $$
declare
  colisoes integer;
begin
  select count(*) into colisoes
  from public.jogos_base b
  where exists (select 1 from public.jogos a where a.id = b.id);

  if colisoes > 0 then
    raise exception 'Encontrados % id(s) de jogos_base que já existem em jogos — aborta antes de inserir.', colisoes;
  end if;
end $$;

-- =========================================================
-- 1) Colunas novas em `jogos` — nullable primeiro (categoria é preenchida e fechada depois do
--    passo 3, quando as linhas da Base também estiverem presentes).
-- =========================================================
alter table public.jogos add column if not exists categoria text;
update public.jogos set categoria = 'profissional' where categoria is null;

alter table public.jogos add column if not exists penaltis_pro integer;
alter table public.jogos add column if not exists penaltis_contra integer;

comment on column public.jogos.penaltis_pro is
  'Pênaltis marcados pelo Juventus na disputa (quando o jogo foi a pênaltis). Null = não houve disputa de pênaltis ou ainda não informado.';
comment on column public.jogos.penaltis_contra is
  'Pênaltis marcados pelo adversário na disputa. Null = não houve disputa de pênaltis ou ainda não informado.';

-- =========================================================
-- 2) `convocacao_atletas.numero_camisa` — hoje só existe em `convocacao_atletas_base` (0059).
-- =========================================================
alter table public.convocacao_atletas add column if not exists numero_camisa integer;

-- =========================================================
-- 3) `sumula_eventos.tempo` — a constraint original (0053) só aceita 'primeiro'/'segundo'; a Base
--    ganhou 'terceiro' em 0139 (3º tempo das categorias de formação), mas o lado Profissional nunca
--    foi atualizado porque nenhum jogo profissional usa isso hoje. Precisa aceitar 'terceiro' antes
--    de mesclar os eventos da Base que usam esse valor. Acha o nome da constraint em vez de
--    adivinhar (mesmo cuidado da 0139 pro lado Base).
-- =========================================================
do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
  from pg_constraint
  where conrelid = 'public.sumula_eventos'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%primeiro%'
    and pg_get_constraintdef(oid) ilike '%segundo%'
    and pg_get_constraintdef(oid) ilike '%tempo%';

  if v_constraint_name is not null then
    execute format('alter table public.sumula_eventos drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.sumula_eventos
  add constraint sumula_eventos_tempo_check check (tempo in ('primeiro', 'segundo', 'terceiro'));

-- =========================================================
-- 4) Migra as linhas de `jogos_base` pra `jogos` — preserva o `id` original (ver nota no topo).
-- =========================================================
insert into public.jogos (
  id, categoria, competicao, rodada_fase, adversario_nome, adversario_logo_path, data_jogo,
  horario, local_estadio, endereco, mandante, gols_pro, gols_contra, concentracao_data,
  concentracao_regras, dia_jogo_liberacao, fpf_link_sumula, penaltis_pro, penaltis_contra,
  created_by, created_at, updated_at
)
select
  id, categoria, competicao, rodada_fase, adversario_nome, adversario_logo_path, data_jogo,
  horario, local_estadio, endereco, mandante, gols_pro, gols_contra, concentracao_data,
  concentracao_regras, dia_jogo_liberacao, fpf_link_sumula, penaltis_pro, penaltis_contra,
  created_by, created_at, updated_at
from public.jogos_base;

-- Checagem de segurança: nenhum jogo pode ter sido perdido.
do $$
declare
  total_base integer;
  total_jogos_com_categoria_base integer;
begin
  select count(*) into total_base from public.jogos_base;
  select count(*) into total_jogos_com_categoria_base
    from public.jogos where categoria <> 'profissional';

  if total_jogos_com_categoria_base <> total_base then
    raise exception
      'Contagem não bateu: % jogo(s) em jogos_base, % jogo(s) com categoria de Base em jogos.',
      total_base, total_jogos_com_categoria_base;
  end if;

  raise notice 'OK: % jogo(s) da Base inserido(s) em jogos.', total_base;
end $$;

-- =========================================================
-- 5) Agora que toda linha (Profissional + Base) tem `categoria` preenchida, fecha a coluna.
-- =========================================================
alter table public.jogos alter column categoria set not null;
alter table public.jogos add constraint jogos_categoria_check
  check (categoria in ('profissional', 'sub20', 'sub17', 'sub15', 'sub14', 'sub13', 'sub12', 'sub11'));

create index if not exists jogos_categoria_idx on public.jogos (categoria);

-- =========================================================
-- 6) Mescla as tabelas filhas — todas preservam id (ver nota no topo), só copia linha a linha.
-- =========================================================

-- 6a) Checklist de preparação
insert into public.checklist_jogo_itens (id, jogo_id, item, concluido, prazo, ordem, created_at, updated_at)
select id, jogo_id, item, concluido, prazo, ordem, created_at, updated_at
from public.checklist_jogo_itens_base;

-- 6b) Convocação (jogo + atletas + comissão)
insert into public.convocacoes (id, jogo_id, capitao_atleta_id, created_by, created_at, updated_at)
select id, jogo_id, capitao_atleta_id, created_by, created_at, updated_at
from public.convocacoes_base;

insert into public.convocacao_atletas (convocacao_id, atleta_id, status, numero_camisa)
select convocacao_id, atleta_id, status, numero_camisa
from public.convocacao_atletas_base;

insert into public.convocacao_comissao (convocacao_id, comissao_id)
select convocacao_id, comissao_id
from public.convocacao_comissao_base;

-- 6c) Súmula (jogo + eventos)
insert into public.sumulas (
  id, jogo_id, duracao_primeiro_tempo, duracao_segundo_tempo, duracao_terceiro_tempo,
  acrescimo_primeiro_tempo, acrescimo_segundo_tempo, acrescimo_terceiro_tempo,
  created_by, created_at, updated_at
)
select
  id, jogo_id, duracao_primeiro_tempo, duracao_segundo_tempo, duracao_terceiro_tempo,
  acrescimo_primeiro_tempo, acrescimo_segundo_tempo, acrescimo_terceiro_tempo,
  created_by, created_at, updated_at
from public.sumulas_base;

insert into public.sumula_eventos (
  id, sumula_id, tipo, tempo, minuto, atleta_id, atleta_entrou_id, atleta_assistencia_id,
  ordem, nome_adversario, gol_contra_favor_juventus, created_by, created_at
)
select
  id, sumula_id, tipo, tempo, minuto, atleta_id, atleta_entrou_id, atleta_assistencia_id,
  ordem, nome_adversario, gol_contra_favor_juventus, created_by, created_at
from public.sumula_eventos_base;

-- 6d) Financeiro de jogo (gastos)
insert into public.gastos_jogo (
  id, jogo_id, categoria_id, descricao, valor_previsto, valor_efetuado, data, fase,
  created_by, created_at, updated_at
)
select
  id, jogo_id, categoria_id, descricao, valor_previsto, valor_efetuado, data, fase,
  created_by, created_at, updated_at
from public.gastos_jogo_base;

-- 6e) Ônibus (lista + passageiros)
insert into public.onibus_lista (id, jogo_id, onibus_numero, horario_saida, created_by, created_at)
select id, jogo_id, onibus_numero, horario_saida, created_by, created_at
from public.onibus_lista_base;

insert into public.onibus_passageiros (onibus_lista_id, pessoa_tipo, pessoa_id)
select onibus_lista_id, pessoa_tipo, pessoa_id
from public.onibus_passageiros_base;

-- 6f) Programação (Concentração / Dia de Jogo)
insert into public.jogo_programacao_itens (
  id, jogo_id, tipo, ordem, horario, atividade, local, eh_confronto, created_at
)
select
  id, jogo_id, tipo, ordem, horario, atividade, local, eh_confronto, created_at
from public.jogo_programacao_itens_base;

-- 6g) Recibos de pagamento
insert into public.recibos_jogo (
  id, jogo_id, pessoa_tipo, pessoa_id, funcao_jogo, valor, chave_pix, chave_pix_tipo, pago,
  created_by, created_at, updated_at
)
select
  id, jogo_id, pessoa_tipo, pessoa_id, funcao_jogo, valor, chave_pix, chave_pix_tipo, pago,
  created_by, created_at, updated_at
from public.recibos_jogo_base;

-- 6h) Rooming-list (jogo + quartos + ocupantes)
insert into public.rooming_list (id, jogo_id, hotel_nome, hotel_endereco, checkin, checkout, created_by, created_at, updated_at)
select id, jogo_id, hotel_nome, hotel_endereco, checkin, checkout, created_by, created_at, updated_at
from public.rooming_list_base;

insert into public.rooming_list_quartos (id, rooming_list_id, tipo, ordem, numero_apartamento)
select id, rooming_list_id, tipo, ordem, numero_apartamento
from public.rooming_list_quartos_base;

insert into public.rooming_list_ocupantes (quarto_id, pessoa_tipo, pessoa_id)
select quarto_id, pessoa_tipo, pessoa_id
from public.rooming_list_ocupantes_base;

-- 6i) Vagas de Staff (jogo + funções + inscrições) — `staff_id` em `jogo_vagas_staff_base_
--     inscricoes` já foi reapontado pro id unificado de `staff_operacional` pela própria 0155,
--     então não precisa de nenhum remapeamento aqui.
insert into public.jogo_vagas_staff (
  id, jogo_id, token, aberto, horario_apresentacao, local_apresentacao, observacoes,
  created_by, created_at, updated_at
)
select
  id, jogo_id, token, aberto, horario_apresentacao, local_apresentacao, observacoes,
  created_by, created_at, updated_at
from public.jogo_vagas_staff_base;

insert into public.jogo_vagas_staff_funcoes (id, vagas_id, funcao_id, quantidade, horario_apresentacao, created_at)
select id, vagas_id, funcao_id, quantidade, horario_apresentacao, created_at
from public.jogo_vagas_staff_base_funcoes;

insert into public.jogo_vagas_staff_inscricoes (id, vagas_id, vaga_funcao_id, staff_id, situacao, observacao, created_at)
select id, vagas_id, vaga_funcao_id, staff_id, situacao, observacao, created_at
from public.jogo_vagas_staff_base_inscricoes;

-- =========================================================
-- 7) `configuracoes_financeiro`/`configuracoes_financeiro_base` — singleton de cada lado, sem
--    `jogo_id`. Ganha `departamento`, mesma ideia de `categoria`/`categorias` nas outras
--    unificações, só que no nível de departamento em vez de categoria de idade.
-- =========================================================
alter table public.configuracoes_financeiro
  add column if not exists departamento text;

update public.configuracoes_financeiro set departamento = 'futebol_profissional' where departamento is null;

-- `assinatura1_usuario_id`/`assinatura2_usuario_id` (0090_assinaturas_vinculo_usuario.sql) ficam
-- de fora aqui: a migration que as criou tinha "add column if not exists" nas duas tabelas, mas na
-- prática só `configuracoes_financeiro` (Profissional) tem essas colunas neste banco — achado ao
-- vivo rodando esta migration em 30/10/2026 (`configuracoes_financeiro_base` nunca ganhou a coluna
-- de verdade). A linha da Base entra sem vínculo de usuário (mesmo estado "sem vínculo, fallback
-- pra qualquer master" que já valia antes pra configuração sem essa coluna — ver comentário de
-- 0090); dá pra configurar normalmente depois pela tela, como qualquer config sem vínculo ainda.
insert into public.configuracoes_financeiro (
  id, departamento, assinatura1_nome, assinatura1_cargo, assinatura2_nome, assinatura2_cargo,
  updated_at
)
select
  id, 'futebol_base', assinatura1_nome, assinatura1_cargo, assinatura2_nome, assinatura2_cargo,
  updated_at
from public.configuracoes_financeiro_base;

alter table public.configuracoes_financeiro alter column departamento set not null;
alter table public.configuracoes_financeiro add constraint configuracoes_financeiro_departamento_check
  check (departamento in ('futebol_profissional', 'futebol_base'));
alter table public.configuracoes_financeiro add constraint configuracoes_financeiro_departamento_unique
  unique (departamento);

-- =========================================================
-- 8) `competicao_jogos_base.jogo_id` — não faz parte do escopo original da Fase 2 (Competições é
--    outro módulo), mas sua FK aponta pra `jogos_base(id)`; já que o id de cada jogo é preservado
--    em `jogos`, os valores não mudam, só a FK precisa reapontar pra tabela canônica (decisão do
--    Mateus em 29/10/2026: incluir Competições da Base nesta fase em vez de deixar quebrado).
-- =========================================================
alter table public.competicao_jogos_base
  drop constraint if exists competicao_jogos_base_jogo_id_fkey;
alter table public.competicao_jogos_base
  add constraint competicao_jogos_base_jogo_id_fkey
  foreign key (jogo_id) references public.jogos(id) on delete cascade;

-- =========================================================
-- 9) Funções antigas de Vagas de Staff da Base ficam órfãs (hardcoded pros nomes antigos das
--    tabelas, que viram `_old` no passo 10) — removidas em vez de deixadas quebradas. O link
--    público `/vagas-base/<token>` passa a usar as funções unificadas (`pegar_vaga_staff`/
--    `desistir_vaga_staff`), que já leem de `jogo_vagas_staff`/`staff_operacional` (unificado desde
--    a 0155) — ajuste de tela, sem mudança de schema adicional.
-- =========================================================
drop function if exists public.pegar_vaga_staff_base(text, uuid);
drop function if exists public.desistir_vaga_staff_base(text, uuid);

-- =========================================================
-- 10) Renomeia as tabelas antigas pra `_old` — backup, não apaga (mesmo tratamento de
--     `atletas_base_old`/`comissao_tecnica_base_old`/`staff_operacional_base_old`).
-- =========================================================
alter table public.checklist_jogo_itens_base rename to checklist_jogo_itens_base_old;
alter table public.convocacao_atletas_base rename to convocacao_atletas_base_old;
alter table public.convocacao_comissao_base rename to convocacao_comissao_base_old;
alter table public.convocacoes_base rename to convocacoes_base_old;
alter table public.sumula_eventos_base rename to sumula_eventos_base_old;
alter table public.sumulas_base rename to sumulas_base_old;
alter table public.gastos_jogo_base rename to gastos_jogo_base_old;
alter table public.onibus_passageiros_base rename to onibus_passageiros_base_old;
alter table public.onibus_lista_base rename to onibus_lista_base_old;
alter table public.jogo_programacao_itens_base rename to jogo_programacao_itens_base_old;
alter table public.recibos_jogo_base rename to recibos_jogo_base_old;
alter table public.rooming_list_ocupantes_base rename to rooming_list_ocupantes_base_old;
alter table public.rooming_list_quartos_base rename to rooming_list_quartos_base_old;
alter table public.rooming_list_base rename to rooming_list_base_old;
alter table public.jogo_vagas_staff_base_inscricoes rename to jogo_vagas_staff_base_inscricoes_old;
alter table public.jogo_vagas_staff_base_funcoes rename to jogo_vagas_staff_base_funcoes_old;
alter table public.jogo_vagas_staff_base rename to jogo_vagas_staff_base_old;
alter table public.configuracoes_financeiro_base rename to configuracoes_financeiro_base_old;
alter table public.jogos_base rename to jogos_base_old;

notify pgrst, 'reload schema';

commit;

-- ============================================================================================
-- Verificação manual sugerida (rodar depois, fora desta transação):
--
-- select count(*) from public.jogos;                      -- total depois da unificação
-- select count(*) from public.jogos_base_old;              -- quantos existiam na Base antes
-- select categoria, count(*) from public.jogos group by categoria order by 1;
-- select count(*) from public.sumula_eventos where tempo = 'terceiro';  -- confere que os eventos
--   de 3º tempo da Base migraram certo
--
-- Depois de confirmar que está tudo certo (telas de Jogos, Convocação, Súmula, Financeiro,
-- Ônibus, Rooming-list, Vagas de Staff, Competições da Base — Profissional e Base):
--   drop table public.checklist_jogo_itens_base_old;
--   drop table public.convocacao_atletas_base_old;
--   drop table public.convocacao_comissao_base_old;
--   drop table public.convocacoes_base_old;
--   drop table public.sumula_eventos_base_old;
--   drop table public.sumulas_base_old;
--   drop table public.gastos_jogo_base_old;
--   drop table public.onibus_passageiros_base_old;
--   drop table public.onibus_lista_base_old;
--   drop table public.jogo_programacao_itens_base_old;
--   drop table public.recibos_jogo_base_old;
--   drop table public.rooming_list_ocupantes_base_old;
--   drop table public.rooming_list_quartos_base_old;
--   drop table public.rooming_list_base_old;
--   drop table public.jogo_vagas_staff_base_inscricoes_old;
--   drop table public.jogo_vagas_staff_base_funcoes_old;
--   drop table public.jogo_vagas_staff_base_old;
--   drop table public.configuracoes_financeiro_base_old;
--   drop table public.jogos_base_old;
-- ============================================================================================
