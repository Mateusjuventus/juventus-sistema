-- Fix pós-unificação de Atletas (0150/0151): a Ficha de Cadastro pública de Atleta da Base
-- (`/cadastro-atleta-base`, app/cadastro-atleta-base/actions.ts) sempre gravou DIRETO em
-- `atletas_base` com o cliente admin (service_role), usando o grant que nasceu na 0077
-- ("grant select, insert on public.atletas_base to service_role"). A 0150 renomeou `atletas_base`
-- pra `atletas_base_old` (backup) e passou a tabela canônica a ser `atletas` — o grant ficou
-- preso na tabela renomeada (GRANT acompanha o rename) e a Ficha de Cadastro ficou sem permissão
-- nenhuma pra gravar em `atletas`, a tabela que ela foi atualizada pra usar. Sem este grant, todo
-- envio da Ficha de Cadastro pública falha.
grant select, insert on public.atletas to service_role;

notify pgrst, 'reload schema';
