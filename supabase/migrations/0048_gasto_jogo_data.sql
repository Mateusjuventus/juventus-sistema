-- Adiciona a data do gasto (quando de fato aconteceu/foi pago) em gastos_jogo/gastos_jogo_base.
-- Opcional: nem todo gasto tem uma data definida ainda no momento do planejamento (orçamento
-- previsto) — só é preenchida quando o gasto de fato acontecer. Usada tanto na tela do Financeiro
-- quanto no novo PDF "Relatório de Despesas" (ver lib/pdf/relatorio-despesas-document.tsx).

alter table public.gastos_jogo add column if not exists data date;
alter table public.gastos_jogo_base add column if not exists data date;
