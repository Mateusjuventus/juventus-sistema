-- Adiciona data de término de contrato ao cadastro de Atletas, usada no painel de Atletas para
-- destacar contratos a vencer (próximos 90 dias).
alter table public.atletas
  add column data_fim_contrato date;
