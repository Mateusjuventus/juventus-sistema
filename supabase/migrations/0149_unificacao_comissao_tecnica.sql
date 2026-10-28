-- Unificação da Comissão Técnica (Profissional + Base) — frente-piloto da unificação geral do
-- sistema (ver docs/superpowers/specs/2026-10-28-unificacao-comissao-tecnica-design.md).
--
-- `comissao_tecnica` (Profissional) e `comissao_tecnica_base` (Futebol de Base) viram uma tabela
-- só: `comissao_tecnica` ganha uma coluna `categorias` (hoje só a Base tem) que passa a aceitar
-- "profissional" como mais um valor, ao lado das 7 categorias da Base. Os `id` de todo registro são
-- preservados. Quem já está cadastrado nos dois lados com o MESMO cpf (ex.: um coordenador que
-- atua no Profissional e numa categoria da Base) é reconhecido pelo cpf e fica com uma linha só,
-- com as duas categorias — em vez de duas linhas separadas como hoje.
--
-- `comissao_tecnica_base` NÃO é apagada aqui — só renomeada para `comissao_tecnica_base_old`, pra
-- ficar guardada até confirmar que está tudo certo. A remoção definitiva é um passo manual,
-- separado, só depois dessa confirmação.
--
-- Esta migration só roda a parte de dados se `comissao_tecnica_base` ainda existir (idempotente
-- quanto a rodar de novo por engano depois do rename) — mas é pensada pra rodar UMA vez.

begin;

-- 1) Coluna nova em `comissao_tecnica`, com o novo conjunto de categorias (profissional + as 7 da
--    Base). Registros existentes do Profissional recebem categorias = ['profissional'].
alter table public.comissao_tecnica add column if not exists categorias text[];

update public.comissao_tecnica
  set categorias = array['profissional']
  where categorias is null;

alter table public.comissao_tecnica alter column categorias set not null;

alter table public.comissao_tecnica drop constraint if exists comissao_tecnica_categorias_check;
alter table public.comissao_tecnica
  add constraint comissao_tecnica_categorias_check
  check (
    categorias <@ array['profissional','sub20','sub17','sub15','sub14','sub13','sub12','sub11']
    and cardinality(categorias) > 0
  );

create index if not exists comissao_tecnica_categorias_idx
  on public.comissao_tecnica using gin (categorias);

-- 2) Migração dos dados de `comissao_tecnica_base`, só se a tabela ainda existir (não roda de novo
--    depois que o passo 5 já tiver renomeado ela).
do $$
declare
  total_profissional_antes integer;
  total_base_antes integer;
  total_base_novos integer;
  total_depois integer;
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'comissao_tecnica_base'
  ) then
    raise notice 'comissao_tecnica_base não existe (já migrada antes?) — pulando a parte de dados.';
    return;
  end if;

  select count(*) into total_profissional_antes from public.comissao_tecnica;
  select count(*) into total_base_antes from public.comissao_tecnica_base;
  select count(*) into total_base_novos
    from public.comissao_tecnica_base ctb
    where not exists (select 1 from public.comissao_tecnica ct where ct.cpf = ctb.cpf);

  -- 2a) Quem já existe nos dois lados (mesmo cpf): junta as categorias (sem duplicar) e completa
  --     com o que faltar no lado Profissional, sem sobrescrever o que já estava preenchido lá.
  update public.comissao_tecnica ct
    set categorias = (select array(select distinct unnest(ct.categorias || ctb.categorias))),
        telefone = coalesce(ct.telefone, ctb.telefone),
        email = coalesce(ct.email, ctb.email),
        foto_path = coalesce(ct.foto_path, ctb.foto_path),
        apelido = coalesce(ct.apelido, ctb.apelido),
        tipo_quarto_preferido = coalesce(ct.tipo_quarto_preferido, ctb.tipo_quarto_preferido),
        tipo_contrato = coalesce(ct.tipo_contrato, ctb.tipo_contrato),
        data_inicio = coalesce(ct.data_inicio, ctb.data_inicio),
        valor_salario = coalesce(ct.valor_salario, ctb.valor_salario)
    from public.comissao_tecnica_base ctb
    where ctb.cpf = ct.cpf;

  -- 2b) Quem só existe na Base: entra como linha nova, preservando o mesmo id (nenhuma FK que já
  --      aponte pra esse id precisa saber que o registro "se moveu" de tabela).
  insert into public.comissao_tecnica (
    id, categorias, nome_completo, rg, cpf, data_nascimento, funcao, telefone, email, foto_path,
    tipo_quarto_preferido, apelido, tipo_contrato, data_inicio, valor_salario, created_by,
    created_at, updated_at
  )
  select
    ctb.id, ctb.categorias, ctb.nome_completo, ctb.rg, ctb.cpf, ctb.data_nascimento, ctb.funcao,
    ctb.telefone, ctb.email, ctb.foto_path, ctb.tipo_quarto_preferido, ctb.apelido,
    ctb.tipo_contrato, ctb.data_inicio, ctb.valor_salario, ctb.created_by, ctb.created_at,
    ctb.updated_at
  from public.comissao_tecnica_base ctb
  where not exists (select 1 from public.comissao_tecnica ct where ct.cpf = ctb.cpf);

  -- 2c) Checagem de segurança: nenhuma linha pode ter sido perdida. Se o total não bater, a
  --      transação inteira é desfeita (nenhuma mudança fica pra trás) e o erro aparece explicado.
  select count(*) into total_depois from public.comissao_tecnica;
  if total_depois <> total_profissional_antes + total_base_novos then
    raise exception
      'Contagem não bateu: profissional antes=%, base antes=%, base novos (sem cpf duplicado)=%, esperado depois=%, total depois=%',
      total_profissional_antes, total_base_antes, total_base_novos,
      total_profissional_antes + total_base_novos, total_depois;
  end if;

  raise notice 'OK: % registro(s) do Profissional + % novo(s) da Base = % no total (% já existiam nos dois lados e foram mesclados).',
    total_profissional_antes, total_base_novos, total_depois, total_base_antes - total_base_novos;
end $$;

-- 3) Mapa old_base_id -> id final em `comissao_tecnica` (igual ao próprio id quando a linha entrou
--    nova no passo 2b; o id do lado Profissional quando foi mesclada por cpf no passo 2a). Só criado
--    se ainda houver o que mapear.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'comissao_tecnica_base'
  ) then
    create temporary table _ct_merge_map on commit drop as
      select ctb.id as old_base_id, ct.id as novo_id
      from public.comissao_tecnica_base ctb
      join public.comissao_tecnica ct on ct.cpf = ctb.cpf;

    -- 3a) `convocacao_comissao_base.comissao_id` — tira a FK antiga primeiro (sem ela, não importa
    --     que um valor no meio do caminho não exista nem na tabela antiga nem na nova), atualiza os
    --     valores, só depois recria a FK já apontando pra `comissao_tecnica` (validada contra o
    --     estado final, que por essa altura já está correto).
    alter table public.convocacao_comissao_base
      drop constraint if exists convocacao_comissao_base_comissao_id_fkey;

    update public.convocacao_comissao_base cb
      set comissao_id = m.novo_id
      from _ct_merge_map m
      where cb.comissao_id = m.old_base_id and m.novo_id <> m.old_base_id;

    alter table public.convocacao_comissao_base
      add constraint convocacao_comissao_base_comissao_id_fkey
      foreign key (comissao_id) references public.comissao_tecnica(id) on delete cascade;

    -- 3b) `organograma_base.comissao_tecnica_base_id` — mesma ordem; o nome da coluna fica como
    --     está (Organograma continua só da Base), só o alvo da FK muda.
    alter table public.organograma_base
      drop constraint if exists organograma_base_comissao_tecnica_base_id_fkey;

    update public.organograma_base ob
      set comissao_tecnica_base_id = m.novo_id
      from _ct_merge_map m
      where ob.comissao_tecnica_base_id = m.old_base_id and m.novo_id <> m.old_base_id;

    alter table public.organograma_base
      add constraint organograma_base_comissao_tecnica_base_id_fkey
      foreign key (comissao_tecnica_base_id) references public.comissao_tecnica(id) on delete set null;

    -- 3c) `perfis` — colapsa os dois campos de vínculo (comissao_tecnica_id / _base_id) num só.
    --     Prioridade pro vínculo da Base quando os dois estavam preenchidos, igual à regra que já
    --     valia hoje (ver 0107_perfis_vinculo_comissao_tecnica.sql).
    update public.perfis p
      set comissao_tecnica_id = m.novo_id
      from _ct_merge_map m
      where p.comissao_tecnica_base_id = m.old_base_id;

    drop index if exists public.perfis_comissao_tecnica_base_id_idx;
    alter table public.perfis drop column if exists comissao_tecnica_base_id;
  end if;
end $$;

-- 4) Guarda a tabela antiga (não apaga) — remoção definitiva é um passo manual separado, só depois
--    de confirmar que tudo está certo.
alter table if exists public.comissao_tecnica_base rename to comissao_tecnica_base_old;

notify pgrst, 'reload schema';

commit;

-- ============================================================================================
-- Verificação manual sugerida (rodar depois, fora desta transação):
--
-- select count(*) from public.comissao_tecnica;                 -- total depois da unificação
-- select count(*) from public.comissao_tecnica_base_old;         -- quantos existiam na Base antes
-- select cpf, categorias from public.comissao_tecnica
--   where cardinality(categorias) > 1;                           -- quem ficou com mais de 1 categoria
--   (confere o(s) caso(s) de quem já estava nos dois lados)
--
-- Depois de confirmar que está tudo certo (telas, convocação, organograma, vínculo de usuário):
--   drop table public.comissao_tecnica_base_old;
-- ============================================================================================
