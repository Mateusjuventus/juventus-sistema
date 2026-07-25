-- Adiciona a opção de quarto triplo na Rooming List (Profissional e Base) — até então só existiam
-- single e duplo.

alter table public.rooming_list_quartos drop constraint if exists rooming_list_quartos_tipo_check;
alter table public.rooming_list_quartos
  add constraint rooming_list_quartos_tipo_check
  check (tipo in ('single', 'duplo', 'triplo'));

alter table public.rooming_list_quartos_base drop constraint if exists rooming_list_quartos_base_tipo_check;
alter table public.rooming_list_quartos_base
  add constraint rooming_list_quartos_base_tipo_check
  check (tipo in ('single', 'duplo', 'triplo'));
