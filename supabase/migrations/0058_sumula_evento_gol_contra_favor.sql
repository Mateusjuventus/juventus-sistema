-- Corrige um bug real de produção: um gol contra marcado por um jogador do ADVERSÁRIO (favorece
-- o Juventus) estava sendo salvo em `sumula_eventos` do mesmo jeito que um gol normal do
-- adversário (só com `nome_adversario` preenchido, sem nenhum campo pra diferenciar) — na aba
-- Súmula os dois apareciam idênticos como "Gol adversário", como se tivesse sido contra o
-- Juventus, mesmo quando na verdade contou a favor. Essa coluna guarda essa distinção pra exibir
-- certo na lista de eventos (ver app/jogos/[id]/sumula/page.tsx).
--
-- Só Futebol Profissional, mesmo escopo de `nome_adversario` (0057_sumula_evento_adversario.sql)
-- — `sumula_eventos_base` não tem esse campo.

alter table public.sumula_eventos
  add column gol_contra_favor_juventus boolean not null default false;
