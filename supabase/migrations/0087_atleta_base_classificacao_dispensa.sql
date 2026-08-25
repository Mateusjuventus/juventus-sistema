-- Classificação G1/G2/G3 e Relatório de Dispensa de atletas da Base (ver
-- docs/superpowers/specs/2026-08-25-classificacao-dispensa-atleta-base-design.md). Só em
-- `atletas_base` — o Futebol Profissional não ganha nem classificação nem dispensa nesta rodada.
--
-- Classificação: rótulo livre (o sistema só guarda e mostra a cor, sem significado fixo),
-- opcional. Campos de dispensa: motivo, as 4 notas de desempenho na saída (mesma escala 3-9 do
-- Parecer Final, ver 0079_parecer_final_treinador.sql), data da dispensa e quem/quando gerou —
-- preenchidos só quando o Relatório de Dispensa é gerado (ver a spec, seção 3).
alter table public.atletas_base
  add column if not exists classificacao text check (classificacao in ('g1', 'g2', 'g3')),
  add column if not exists dispensa_motivo text,
  add column if not exists dispensa_nota_tecnica smallint check (dispensa_nota_tecnica is null or dispensa_nota_tecnica between 3 and 9),
  add column if not exists dispensa_nota_fisica smallint check (dispensa_nota_fisica is null or dispensa_nota_fisica between 3 and 9),
  add column if not exists dispensa_nota_tatica smallint check (dispensa_nota_tatica is null or dispensa_nota_tatica between 3 and 9),
  add column if not exists dispensa_nota_comportamental smallint check (dispensa_nota_comportamental is null or dispensa_nota_comportamental between 3 and 9),
  add column if not exists dispensa_data date,
  add column if not exists dispensado_por uuid references public.perfis(id),
  add column if not exists dispensado_em timestamptz;

-- `status` ganha o quarto valor "dispensado" (hoje só liberado/suspenso/departamento_medico) — ver
-- o check constraint inline original em 0031_futebol_base_infra_atletas.sql, que o Postgres
-- nomeou automaticamente como "atletas_base_status_check".
alter table public.atletas_base drop constraint atletas_base_status_check;
alter table public.atletas_base add constraint atletas_base_status_check
  check (status in ('liberado', 'suspenso', 'departamento_medico', 'dispensado'));

-- Nenhuma mudança de RLS/grant necessária — `atletas_base` já tem a política
-- "authenticated_full_access" (qualquer usuário autenticado tem acesso à tabela; a restrição por
-- categoria do treinador é feita no código da aplicação, igual já acontece com `captacao_base` via
-- `getCategoriasTreinador`).
