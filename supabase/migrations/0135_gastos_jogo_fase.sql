-- Fase (Pré-jogo/Pós-jogo) em cada gasto de jogo — agrupamento novo no Relatório de Despesas e no
-- Orçamento Previsto. Ver docs/superpowers/specs/2026-10-14-gastos-jogo-fase-design.md. Aplicar via
-- SQL editor do painel Supabase, depois de 0001 a 0134.
--
-- Campo nullable no banco (a obrigatoriedade é imposta no formulário/validação) — fica nulo só para
-- os gastos já lançados antes desta feature, que aparecem no relatório como "Sem fase definida".
-- Seguro rodar mais de uma vez (idempotente).

alter table public.gastos_jogo
  add column if not exists fase text check (fase in ('pre_jogo', 'pos_jogo'));

alter table public.gastos_jogo_base
  add column if not exists fase text check (fase in ('pre_jogo', 'pos_jogo'));
