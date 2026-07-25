-- Adiciona o número do apartamento/quarto no hotel à Rooming List (Profissional e Base) — o
-- usuário preenche direto no sistema assim que o hotel confirmar, em vez de anotar à mão no PDF.

alter table public.rooming_list_quartos add column if not exists numero_apartamento text;
alter table public.rooming_list_quartos_base add column if not exists numero_apartamento text;
