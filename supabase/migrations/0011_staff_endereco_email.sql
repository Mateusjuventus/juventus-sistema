-- Staff Operacional: e-mail e endereço completo (estruturado em CEP/rua/número/complemento/bairro/
-- cidade/UF, para permitir o autopreenchimento pelo CEP no formulário). Todos os campos são
-- opcionais. Aplicar via SQL editor do painel Supabase, depois de 0001 a 0010.

alter table public.staff_operacional add column email text;
alter table public.staff_operacional add column cep text;
alter table public.staff_operacional add column logradouro text;
alter table public.staff_operacional add column numero text;
alter table public.staff_operacional add column complemento text;
alter table public.staff_operacional add column bairro text;
alter table public.staff_operacional add column cidade text;
alter table public.staff_operacional add column uf text;
