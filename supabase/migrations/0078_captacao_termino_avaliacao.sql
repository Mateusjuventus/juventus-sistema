-- Dois ajustes pedidos em 19/08, em cima do 0077:
--
-- 1) "falta o termino da avaliação" — `captacao_base` ganha `data_termino`, preenchida
--    automaticamente com a data de hoje quando o status vira um resultado final (Aprovado/
--    Dispensado/Não compareceu). Fica null enquanto o candidato está em "inscricao"/"avaliacao", e
--    volta a null se a avaliação for reaberta (ver `mudarStatusCaptacao`, app/base/captacao/actions.ts).
--
-- 2) Empresário, Ajuda de custo e Agência saem da tela de Captação — são dados do cadastro de
--    Atleta (Ficha de Cadastro), não da Captação, confirmado pelo Mateus. As colunas continuam na
--    tabela (não são mais lidas/gravadas por nenhuma tela da Captação) pra não arriscar apagar dado
--    de candidato já cadastrado — só não fazem mais parte do fluxo.

alter table public.captacao_base add column if not exists data_termino date;

notify pgrst, 'reload schema';
