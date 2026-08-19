-- Comissão Técnica da Base: uma pessoa pode atuar em mais de uma categoria (ex.: mesmo treinador
-- pro Sub-11 e Sub-12) — ver docs/superpowers/specs/2026-08-19-comissao-tecnica-multi-categoria-
-- design.md. `categoria` (uma só) vira `categorias` (lista), mesmo padrão de
-- `categorias_treinador` em `perfis`. Aplicar depois de 0001 a 0080.
--
-- Idempotente (seguro rodar mais de uma vez) — feito assim de propósito porque a migration anterior
-- (0080) já deu "deadlock detected" numa tentativa por causa de outra sessão consultando a mesma
-- tabela ao mesmo tempo. Se der o mesmo erro aqui, é só rodar de novo.

alter table public.comissao_tecnica_base add column if not exists categorias text[];

-- Só copia o valor antigo se a coluna `categoria` ainda existir (evita erro numa segunda tentativa,
-- depois que uma primeira já tiver removido a coluna antiga).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'comissao_tecnica_base' and column_name = 'categoria'
  ) then
    update public.comissao_tecnica_base set categorias = array[categoria] where categorias is null;
  end if;
end $$;

alter table public.comissao_tecnica_base alter column categorias set not null;

alter table public.comissao_tecnica_base drop constraint if exists comissao_tecnica_base_categorias_check;
alter table public.comissao_tecnica_base
  add constraint comissao_tecnica_base_categorias_check
  check (
    categorias <@ array['sub20','sub17','sub15','sub14','sub13','sub12','sub11']
    and cardinality(categorias) > 0
  );

drop index if exists comissao_tecnica_base_categoria_idx;
alter table public.comissao_tecnica_base drop column if exists categoria;

create index if not exists comissao_tecnica_base_categorias_idx
  on public.comissao_tecnica_base using gin (categorias);
