-- Staff Operacional: tipo da chave PIX (CPF, CNPJ, e-mail ou telefone), pra facilitar na hora de
-- fazer pagamentos. Aplicar via SQL editor do painel Supabase, depois de 0001 a 0013.

alter table public.staff_operacional add column chave_pix_tipo text
  constraint staff_chave_pix_tipo_check check (chave_pix_tipo in ('cpf', 'cnpj', 'email', 'telefone'));
