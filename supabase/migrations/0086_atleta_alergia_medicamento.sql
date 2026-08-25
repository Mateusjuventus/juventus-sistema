-- Pedido de 25/08/2026 (ver docs/superpowers/specs/2026-08-25-atleta-telefone-alergia-foto-design.md):
-- "Incluir um campo: Possui alergia algum medicamento? Se sim, qual".
-- Vale para Profissional (atletas) e Base (atletas_base), cadastro interno e link público.

alter table public.atletas
  add column if not exists possui_alergia_medicamento boolean not null default false,
  add column if not exists alergia_medicamento_qual text;

alter table public.atletas_base
  add column if not exists possui_alergia_medicamento boolean not null default false,
  add column if not exists alergia_medicamento_qual text;
