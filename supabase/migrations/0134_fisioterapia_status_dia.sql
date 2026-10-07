-- "Status do dia" (Manutenção/Tratamento/Reavaliação) de um atendimento de Fisioterapia — ver
-- docs/superpowers/specs/2026-10-07-relatorio-dia-fisioterapia-design.md. Opcional e independente
-- do `atletas.status`/`atletas_base.status` "oficial" (Apto/Depto. Médico/Transição) — é só uma
-- etiqueta informativa do atendimento daquele dia, usada no Relatório do Dia. `null` por padrão:
-- todo atendimento já lançado continua válido sem status.

alter table public.fisioterapia_atendimentos
  add column if not exists status_dia text check (status_dia in ('manutencao', 'tratamento', 'reavaliacao'));

alter table public.fisioterapia_atendimentos_base
  add column if not exists status_dia text check (status_dia in ('manutencao', 'tratamento', 'reavaliacao'));

notify pgrst, 'reload schema';
