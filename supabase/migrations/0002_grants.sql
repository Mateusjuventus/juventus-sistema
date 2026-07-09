-- Concede as permissões de tabela (GRANT) que faltavam na migration 0001.
--
-- RLS (row level security) controla QUAIS LINHAS um usuário pode ver/alterar,
-- mas não substitui o GRANT do Postgres, que controla se o papel (role)
-- `authenticated`/`anon` pode acessar a tabela. Sem isso, toda consulta falha
-- com "permission denied for table ..." (código 42501), mesmo com a policy de
-- RLS correta.
--
-- Aplicar via SQL editor do painel Supabase, igual à 0001 (Project → SQL
-- Editor → New query → colar e rodar). Se o projeto já rodou só a 0001 e
-- está com erro de "permission denied", rode apenas este arquivo.

grant usage on schema public to authenticated, anon;

grant select, insert, update, delete on public.atletas to authenticated;
grant select, insert, update, delete on public.comissao_tecnica to authenticated;
grant select, insert, update, delete on public.staff_operacional to authenticated;
grant select, insert, update, delete on public.jogos to authenticated;
