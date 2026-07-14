-- Staff Operacional: status ativo/inativo. Em vez de excluir quando a pessoa não trabalha mais com
-- o clube, o cadastro fica marcado como inativo — histórico e vínculos anteriores continuam
-- intactos, e o cadastro some da lista principal (mas continua acessível na seção "Inativos").
-- Aplicar via SQL editor do painel Supabase, depois de 0001 a 0012.

alter table public.staff_operacional add column ativo boolean not null default true;

create index staff_ativo_idx on public.staff_operacional (ativo);
