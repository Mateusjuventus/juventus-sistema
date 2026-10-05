-- Programação Semanal pro Futebol Profissional (ver docs/superpowers/specs/2026-10-05-
-- programacao-profissional-design.md) — reaproveita a MESMA infraestrutura da Base
-- (0094_programacao_semanal.sql), tratando o time Profissional como um "grupo" só: a categoria
-- 'profissional'. Em vez de duplicar tabelas, as 3 que travavam `categoria` nas 7 categorias da
-- Base (via check constraint) passam a aceitar também 'profissional'.
--
-- Os nomes de constraint abaixo são os gerados automaticamente pelo Postgres pra um
-- "check (coluna in (...))" inline (padrão "<tabela>_<coluna>_check") — os mesmos criados pela
-- migration 0094, nunca nomeados explicitamente lá.

alter table public.programacao_atividades
  drop constraint if exists programacao_atividades_categoria_check;
alter table public.programacao_atividades
  add constraint programacao_atividades_categoria_check
  check (categoria in ('sub20', 'sub17', 'sub15', 'sub14', 'sub13', 'sub12', 'sub11', 'profissional'));

alter table public.programacao_catalogo_subatividades
  drop constraint if exists programacao_catalogo_subatividades_categoria_check;
alter table public.programacao_catalogo_subatividades
  add constraint programacao_catalogo_subatividades_categoria_check
  check (categoria in ('sub20', 'sub17', 'sub15', 'sub14', 'sub13', 'sub12', 'sub11', 'profissional'));

alter table public.configuracoes_programacao_base
  drop constraint if exists configuracoes_programacao_base_categoria_check;
alter table public.configuracoes_programacao_base
  add constraint configuracoes_programacao_base_categoria_check
  check (categoria in ('sub20', 'sub17', 'sub15', 'sub14', 'sub13', 'sub12', 'sub11', 'profissional'));

-- Linha de configuração (época/microciclo) pro Profissional, mesmo padrão do insert original da
-- 0094 — singleton por categoria, já pré-criada pra a tela de exportação sempre encontrar uma
-- linha pra ler/atualizar.
insert into public.configuracoes_programacao_base (categoria) values ('profissional')
  on conflict (categoria) do nothing;

notify pgrst, 'reload schema';
