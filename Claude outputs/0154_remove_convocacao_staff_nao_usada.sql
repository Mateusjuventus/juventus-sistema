-- Remove convocacao_staff/convocacao_staff_base — tabelas criadas em 0003_convocacao.sql e
-- 0033_futebol_base_jogos_financeiro.sql (pensadas como "convocar staff pro jogo", espelhando
-- convocacao_comissao), mas nenhuma tela ou action do sistema jamais leu/escreveu nelas
-- (confirmado via busca por ".from(\"convocacao_staff\")" em todo o repo, e por qualquer trigger/
-- função apontando pra elas — nenhum resultado) — achado durante o levantamento da Fase 2
-- (Jogos/Convocação).
--
-- Primeira versão desta migration tinha uma checagem de segurança (abortar se alguma tabela tivesse
-- dado) — ela pegou 22 linhas em `convocacao_staff` (Profissional; `convocacao_staff_base` tinha 0).
-- Nenhuma migration insere dado nelas e não existe nenhum caminho de código que explique essas 22
-- linhas — foram gravadas manualmente em algum momento (SQL Editor ou o editor de tabelas do
-- Supabase), fora do sistema. Mateus confirmou em 29/10/2026 que são lixo de teste antigo e que pode
-- apagar mesmo com o dado dentro — por isso esta versão já não tem mais a checagem de segurança.
drop table public.convocacao_staff;
drop table public.convocacao_staff_base;

notify pgrst, 'reload schema';
