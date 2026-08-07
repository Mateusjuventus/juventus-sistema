-- Corrige o cadastro público de Staff Operacional do Futebol de Base (/cadastro-staff-base) sempre
-- mostrando "Cadastro temporariamente fechado", mesmo com o toggle ativo em /base/staff-operacional.
--
-- Causa: a migration 0032_futebol_base_comissao_staff.sql criou `staff_operacional_base` e
-- `configuracoes_cadastro_staff_base` e concedeu GRANT só para `authenticated` — mas a página
-- pública (sem login) e a Server Action de envio usam o cliente admin (service_role key, ver
-- lib/supabase/admin.ts). Sem GRANT explícito pro service_role, o Postgres nega a consulta (mesmo
-- a RLS estando com policy permissiva, e mesmo o service_role ignorando RLS — GRANT de tabela é uma
-- camada separada, ver comentário completo em 0027_grants_service_role_perfis.sql), então a leitura
-- de `configuracoes_cadastro_staff_base` volta null/erro e a página assume `ativo = false`.
--
-- Seguro rodar de novo: GRANT não falha nem duplica se já tiver sido concedido antes.
grant select, insert, update, delete on public.configuracoes_cadastro_staff_base to service_role;
grant select, insert, update, delete on public.staff_operacional_base to service_role;
