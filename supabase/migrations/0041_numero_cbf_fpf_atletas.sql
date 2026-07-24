-- Adiciona Número CBF e Número FPF ao cadastro de Atletas (Profissional e Base) — números de
-- registro do atleta nas federações, vistos em relatórios externos do departamento de futebol mas
-- sem campo correspondente no sistema até então.

alter table public.atletas
  add column if not exists numero_cbf integer,
  add column if not exists numero_fpf integer;

alter table public.atletas_base
  add column if not exists numero_cbf integer,
  add column if not exists numero_fpf integer;
