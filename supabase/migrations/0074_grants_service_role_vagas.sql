-- Corrige o link público de vagas (/vagas/<token>) mostrando "Link não encontrado" mesmo com as
-- vagas abertas e salvas na tela do jogo.
--
-- Causa: a migration 0073 concedeu GRANT das tabelas novas só para `authenticated` — mas a página
-- pública (sem login) usa o cliente admin com a service_role key (lib/supabase/admin.ts). GRANT de
-- tabela é uma camada SEPARADA da RLS: a service_role ignora RLS, mas NÃO ignora GRANT. Sem o grant
-- explícito o Postgres nega a consulta com "permission denied for table jogo_vagas_staff" (42501),
-- e a página, que tratava qualquer falha como token inexistente, dizia "Link não encontrado".
--
-- É exatamente o mesmo erro corrigido em 0027_grants_service_role_perfis.sql (tela de Usuários) e
-- em 0060_grants_service_role_staff_base.sql (cadastro público da Base). Regra que vale pra
-- qualquer tabela nova daqui pra frente: se alguma tela SEM LOGIN lê ou escreve nela, ela precisa
-- de grant pro service_role, não só pro authenticated.
--
-- Seguro rodar de novo: GRANT não falha nem duplica se já tiver sido concedido antes.

grant usage on schema public to service_role;

grant select, insert, update, delete on public.jogo_vagas_staff to service_role;
grant select, insert, update, delete on public.jogo_vagas_staff_funcoes to service_role;
grant select, insert, update, delete on public.jogo_vagas_staff_inscricoes to service_role;

-- A tela pública também lê o jogo (confronto, data, local) pra mostrar de qual jogo são as vagas.
grant select on public.jogos to service_role;

-- Garante o cache de schema do PostgREST atualizado com as tabelas e funções de 0073 — sem isso a
-- API pode responder "Could not find the table ... in the schema cache" (PGRST205) por alguns
-- minutos depois de criar tabela nova.
notify pgrst, 'reload schema';
