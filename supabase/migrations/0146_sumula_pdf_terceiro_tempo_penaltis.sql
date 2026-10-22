-- A importação de súmula por PDF (lib/fpf/sumula-pdf.ts, compartilhada entre Profissional e Base)
-- estava travada em "1T"/"2T" — por isso não reconhecia nada do 3º tempo (duração, gols, cartões,
-- substituições) dos jogos de Sub-11/12/13/14, que já tinham ganhado suporte a 3 tempos na tela
-- manual de Súmula (migration 0139/0140, ver docs/superpowers/specs/2026-10-21-competicoes-
-- formato-partida-design.md). Essa migration só adiciona onde guardar o placar da disputa de
-- pênaltis, que a súmula desses jogos de mata-mata também traz ("Resultado Pênalti: A X B") e que
-- o sistema ainda não tinha onde guardar — o resto do ajuste (3º tempo + leitura de pênaltis) é só
-- código (lib/fpf/sumula-pdf.ts e app/base/jogos/[id]/sumula/*), sem mudança de schema.
--
-- Fica só no Futebol de Base por enquanto (onde veio o pedido) — nullable, não afeta nenhum jogo
-- existente.

alter table public.jogos_base
  add column penaltis_pro integer,
  add column penaltis_contra integer;

comment on column public.jogos_base.penaltis_pro is
  'Pênaltis marcados pelo Juventus na disputa (quando o jogo foi a pênaltis). Null = não houve disputa de pênaltis ou ainda não informado.';
comment on column public.jogos_base.penaltis_contra is
  'Pênaltis marcados pelo adversário na disputa. Null = não houve disputa de pênaltis ou ainda não informado.';

notify pgrst, 'reload schema';
