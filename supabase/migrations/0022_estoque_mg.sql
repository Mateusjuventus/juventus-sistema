-- Campo "Mg" (dosagem/concentração) do catálogo de Estoque — usado só pelos itens do Departamento
-- Médico (ex: "500mg"), opcional pros demais itens (ex: gaze, seringa, termômetro não têm dosagem).
alter table public.estoque_itens add column if not exists mg text;
