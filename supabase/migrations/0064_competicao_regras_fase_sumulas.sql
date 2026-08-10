-- Ajustes do módulo de Competições pro regulamento da Copa Paulista (Art. 60 — ver atualização em
-- docs/superpowers/specs/2026-08-10-competicoes-design.md):
--
-- 1. `competicao_fases.zerar_cartoes_ao_encerrar`: quando true, os cartões amarelos acumulados
--    até o fim desta fase NÃO carregam pras fases seguintes ("Finalizada a primeira fase [...] os
--    cartões amarelos serão zerados"). A suspensão de um 3º amarelo recebido dentro da fase
--    continua valendo ("desde que não seja o terceiro da série") — o motor zera só o acúmulo em
--    andamento, nunca apaga suspensão já gerada.
-- 2. `competicoes.regra_observacoes`: texto livre pro trecho do regulamento que embasa as regras
--    disciplinares da competição (o Mateus quer o artigo registrado junto da configuração).
-- 3. `competicao_grupo_resultados.rodada` e `.sumula_path`: a área de "súmulas dos jogos dos
--    grupos" — cada resultado entre os outros clubes pode ter a rodada e o PDF da súmula anexado
--    (bucket competicao-documentos), pra contabilizar pontos e sustentar a classificação.

alter table public.competicao_fases
  add column zerar_cartoes_ao_encerrar boolean not null default false;

alter table public.competicoes
  add column regra_observacoes text;

alter table public.competicao_grupo_resultados
  add column rodada text,
  add column sumula_path text;
