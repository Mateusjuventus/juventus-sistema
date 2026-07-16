-- Adiciona campo de foto ao Staff Operacional — mesmo padrão já usado em Atletas e Comissão
-- Técnica (coluna foto_path guardando o caminho no bucket privado "entity-photos").
-- Aplicar via SQL editor do painel Supabase, depois de 0001 a 0015.

alter table public.staff_operacional add column foto_path text;
