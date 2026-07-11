-- Recibo de Pagamento: chave PIX usada naquele recibo específico (com o tipo — celular, e-mail,
-- CPF ou aleatória), pra imprimir no texto do recibo. Aplicar via SQL editor do painel Supabase,
-- depois de 0001 a 0006.

alter table public.recibos_jogo add column chave_pix text;
alter table public.recibos_jogo add column chave_pix_tipo text
  constraint recibos_jogo_chave_pix_tipo_check check (chave_pix_tipo in ('celular', 'email', 'cpf', 'aleatoria'));
