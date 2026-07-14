-- Rooming List: até aqui só Comissão Técnica e Staff Operacional podiam ficar em um quarto.
-- Libera Atletas também, pra permitir separar/organizar quartos de Atletas dos de Comissão Técnica.
-- Aplicar via SQL editor do painel Supabase, depois de 0001 a 0007.

alter table public.rooming_list_ocupantes drop constraint rooming_list_ocupantes_pessoa_tipo_check;
alter table public.rooming_list_ocupantes add constraint rooming_list_ocupantes_pessoa_tipo_check
  check (pessoa_tipo in ('atleta', 'comissao', 'staff'));
