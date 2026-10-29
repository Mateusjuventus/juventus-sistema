-- Corrige um gap crítico da 0150_unificacao_atletas.sql: existem 9 colunas, em 9 tabelas, com FK pra
-- `atletas_base(id)` que a 0150 NÃO tocou (ela só remapeou os 4 filhos "donos" do cadastro — atleta_
-- documentos, atleta_contatos_emergencia, atleta_anotacoes, atleta_contratos — que já existiam como
-- tabela do Profissional e por isso já referenciavam `atletas(id)`). Como a 0150 renomeou
-- `atletas_base` pra `atletas_base_old`, o Postgres manteve essas 9 FKs de pé, mas agora elas
-- apontam pra `atletas_base_old` — a tabela CONGELADA no momento da migração, que nunca mais ganha
-- linha nova. Resultado prático: toda convocação, evento de súmula, inscrição/suspensão em
-- competição, atendimento de Assistência Social, ou geração automática de atleta pela Captação, pra
-- QUALQUER atleta da Base cadastrado (ou promovido/mesclado) DEPOIS da 0150, falha com violação de
-- FK (23503) assim que alguém tenta usar a tela.
--
-- Esta migração: 1) remonta o mapeamento id-antigo (atletas_base_old) -> id-novo (atletas), igual ao
-- passo 0 da 0150 (match por cpf/rg cobre os 5 cadastros duplicados que a 0150 mesclou — pra esses,
-- o id mudou: a linha nova ficou com o id do Profissional, não o antigo da Base); 2) DERRUBA as 9 FKs
-- antes de mexer em qualquer dado — a primeira versão desta migração tentava atualizar os dados
-- primeiro, com a FK antiga ainda de pé, e isso quebra pros 5 duplicados: a FK antiga aponta pra
-- `atletas_base_old`, que não tem o id novo (o id do Profissional) dessas 5 pessoas; 3) atualiza os
-- `atleta_id`/`capitao_atleta_id`/`atleta_gerado_id` já gravados nessas 9 tabelas pra usar o id novo
-- (na prática só mexe em registros dos 5 duplicados — pra todo o resto, id_antigo = id_novo, e o
-- update não muda nada); 4) recria as 9 FKs apontando pra `atletas`, com o mesmo nome e `on delete`
-- de antes. Nome de cada constraint é buscado dinamicamente via `pg_constraint` (mesmo cuidado já
-- tomado na 0150 pro check de `atleta_contratos`), em vez de supor o nome padrão do Postgres.

-- =========================================================
-- 1) Mapeamento id-antigo -> id-novo
-- =========================================================
create temporary table atletas_base_old_remapeamento as
select
  old.id as id_antigo,
  coalesce(
    (select a.id from public.atletas a where a.id = old.id),
    (select a.id from public.atletas a where a.cpf = old.cpf or a.rg = old.rg)
  ) as id_novo
from public.atletas_base_old old;

-- Conferência: todo `id_antigo` precisa achar um `id_novo` — se não achar, a 0150 perdeu alguém, e é
-- melhor abortar aqui do que corromper as FKs em cima de um mapeamento incompleto.
do $$
declare
  sem_match int;
begin
  select count(*) into sem_match from atletas_base_old_remapeamento where id_novo is null;
  if sem_match > 0 then
    raise exception 'Encontrados % atletas em atletas_base_old sem correspondência em atletas — aborta antes de corrigir as FKs.', sem_match;
  end if;
end $$;

-- =========================================================
-- 2) Descobre o nome de cada uma das 9 FKs e DERRUBA todas elas primeiro — tem que ser antes do
--    remapeamento de dados do passo 3: enquanto a FK antiga (pra `atletas_base_old`) está de pé,
--    gravar o id novo dos 5 duplicados nela falha (esse id não existe em `atletas_base_old`).
-- =========================================================
create temporary table fks_a_recriar (tabela text, coluna text, nome_constraint text, on_delete text);

do $$
declare
  alvo record;
  nome_constraint text;
begin
  for alvo in
    select * from (values
      ('convocacoes_base', 'capitao_atleta_id', ''),
      ('convocacao_atletas_base', 'atleta_id', 'on delete cascade'),
      ('sumula_eventos_base', 'atleta_id', ''),
      ('sumula_eventos_base', 'atleta_entrou_id', ''),
      ('sumula_eventos_base', 'atleta_assistencia_id', ''),
      ('captacao_base', 'atleta_gerado_id', 'on delete set null'),
      ('competicao_inscricoes_base', 'atleta_id', 'on delete cascade'),
      ('competicao_suspensoes_manuais_base', 'atleta_id', 'on delete cascade'),
      ('assistencia_social_atendimentos', 'atleta_id', 'on delete cascade')
    ) as t(tabela, coluna, on_delete)
  loop
    nome_constraint := null;

    select con.conname into nome_constraint
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
    where con.contype = 'f'
      and rel.relname = alvo.tabela
      and att.attname = alvo.coluna
    limit 1;

    if nome_constraint is null then
      raise exception 'Não achei a FK de %.% — aborta antes de seguir pras próximas.', alvo.tabela, alvo.coluna;
    end if;

    insert into fks_a_recriar (tabela, coluna, nome_constraint, on_delete)
    values (alvo.tabela, alvo.coluna, nome_constraint, alvo.on_delete);

    execute format('alter table public.%I drop constraint %I', alvo.tabela, nome_constraint);
  end loop;
end $$;

-- =========================================================
-- 3) Agora sim, com as 9 FKs fora do caminho, atualiza os IDs já gravados
-- =========================================================
update public.convocacoes_base t set capitao_atleta_id = m.id_novo
  from atletas_base_old_remapeamento m where t.capitao_atleta_id = m.id_antigo;

update public.convocacao_atletas_base t set atleta_id = m.id_novo
  from atletas_base_old_remapeamento m where t.atleta_id = m.id_antigo;

update public.sumula_eventos_base t set atleta_id = m.id_novo
  from atletas_base_old_remapeamento m where t.atleta_id = m.id_antigo;
update public.sumula_eventos_base t set atleta_entrou_id = m.id_novo
  from atletas_base_old_remapeamento m where t.atleta_entrou_id = m.id_antigo;
update public.sumula_eventos_base t set atleta_assistencia_id = m.id_novo
  from atletas_base_old_remapeamento m where t.atleta_assistencia_id = m.id_antigo;

update public.captacao_base t set atleta_gerado_id = m.id_novo
  from atletas_base_old_remapeamento m where t.atleta_gerado_id = m.id_antigo;

update public.competicao_inscricoes_base t set atleta_id = m.id_novo
  from atletas_base_old_remapeamento m where t.atleta_id = m.id_antigo;

update public.competicao_suspensoes_manuais_base t set atleta_id = m.id_novo
  from atletas_base_old_remapeamento m where t.atleta_id = m.id_antigo;

update public.assistencia_social_atendimentos t set atleta_id = m.id_novo
  from atletas_base_old_remapeamento m where t.atleta_id = m.id_antigo;

-- =========================================================
-- 4) Recria as 9 FKs apontando pra `atletas`, com o mesmo nome e `on delete` de antes
-- =========================================================
do $$
declare
  r record;
begin
  for r in select * from fks_a_recriar loop
    execute format(
      'alter table public.%I add constraint %I foreign key (%I) references public.atletas(id) %s',
      r.tabela, r.nome_constraint, r.coluna, r.on_delete
    );
  end loop;
end $$;

notify pgrst, 'reload schema';
