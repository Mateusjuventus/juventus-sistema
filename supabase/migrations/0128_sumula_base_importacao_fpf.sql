-- Colunas que faltam em jogos_base/sumula_eventos_base pra suportar a importação de súmula por
-- link (PDF da FPF), espelhando o que `jogos`/`sumula_eventos` já têm no Futebol Profissional —
-- ver docs/superpowers/specs/2026-10-03-importacao-sumula-base-design.md e
-- docs/superpowers/specs/2026-08-04-integracao-fpf-design.md.
alter table public.jogos_base
  add column if not exists fpf_link_sumula text;

alter table public.sumula_eventos_base
  add column if not exists nome_adversario text,
  add column if not exists gol_contra_favor_juventus boolean not null default false;

notify pgrst, 'reload schema';
