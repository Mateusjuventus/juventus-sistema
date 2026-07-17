-- Corrige o erro "permission denied for table perfis" ao clicar em Salvar nas permissões da tela
-- de Usuários (Departamentos, Módulos, ramificações de Estoque, Categorias de Tarefas) e ao criar
-- usuário novo.
--
-- GRANT (permissão de tabela do Postgres) é diferente de RLS (row level security): a policy de RLS
-- decide QUAIS LINHAS um papel pode ver/alterar, mas sem o GRANT de tabela o Postgres nem deixa a
-- consulta chegar perto da tabela — dá exatamente "permission denied for table ..." (código 42501),
-- mesmo com a policy de RLS certa e mesmo usando a service_role key (que ignora RLS, mas não
-- ignora GRANT). A migration 0002_grants.sql já tinha esse mesmo aviso, só que cobrindo
-- authenticated/anon — esta cobre o service_role (usado pelo servidor via
-- lib/supabase/admin.ts) nas tabelas que dependem só dele pra escrever, porque não têm policy de
-- insert/update/delete para "authenticated" de propósito (perfis, staff_operacional pelo cadastro
-- público, etc. — ver os comentários em 0023_perfis.sql e 0012_configuracao_cadastro_staff.sql).
--
-- Seguro rodar de novo: GRANT não falha nem duplica se já tiver sido concedido antes.
grant usage on schema public to service_role;

grant select, insert, update, delete on public.perfis to service_role;
grant select, insert, update, delete on public.staff_operacional to service_role;
grant select, insert, update, delete on public.configuracoes_cadastro_staff to service_role;
grant select, insert, update, delete on public.staff_funcoes_catalogo to service_role;
