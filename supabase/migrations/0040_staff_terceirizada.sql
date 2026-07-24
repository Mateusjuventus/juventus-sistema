-- Marca um Staff Operacional como "Terceirizada" (serviço prestado por empresa terceirizada, sem
-- Chave PIX própria — o pagamento não é direto à pessoa) e guarda a função da terceirizada, num
-- segundo campo separado do funcao_id normal, vindo do mesmo catálogo staff_funcoes_catalogo.

alter table public.staff_operacional
  add column if not exists terceirizada boolean not null default false,
  add column if not exists funcao_terceirizada_id uuid references public.staff_funcoes_catalogo(id);

alter table public.staff_operacional_base
  add column if not exists terceirizada boolean not null default false,
  add column if not exists funcao_terceirizada_id uuid references public.staff_funcoes_catalogo(id);
