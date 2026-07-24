-- Adiciona "Aleatória" como tipo de chave PIX em todo lugar que já tinha CPF/CNPJ/E-mail/Telefone,
-- e unifica as opções dos Recibos de Jogos (que até aqui usavam um conjunto diferente: 'celular' em
-- vez de 'telefone', sem CNPJ) com o mesmo conjunto usado em Staff Operacional/Solicitações.

alter table public.staff_operacional drop constraint if exists staff_chave_pix_tipo_check;
alter table public.staff_operacional add constraint staff_chave_pix_tipo_check
  check (chave_pix_tipo in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria'));

alter table public.staff_operacional_base drop constraint if exists staff_operacional_base_chave_pix_tipo_check;
alter table public.staff_operacional_base add constraint staff_operacional_base_chave_pix_tipo_check
  check (chave_pix_tipo in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria'));

alter table public.solicitacoes drop constraint if exists solicitacoes_chave_pix_tipo_check;
alter table public.solicitacoes add constraint solicitacoes_chave_pix_tipo_check
  check (chave_pix_tipo in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria'));

alter table public.solicitacoes_base drop constraint if exists solicitacoes_base_chave_pix_tipo_check;
alter table public.solicitacoes_base add constraint solicitacoes_base_chave_pix_tipo_check
  check (chave_pix_tipo in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria'));

-- Recibos de Jogos: migra os dados existentes ('celular' -> 'telefone') antes de trocar a
-- constraint, senão a constraint nova rejeitaria as linhas antigas.
update public.recibos_jogo set chave_pix_tipo = 'telefone' where chave_pix_tipo = 'celular';
update public.recibos_jogo_base set chave_pix_tipo = 'telefone' where chave_pix_tipo = 'celular';

alter table public.recibos_jogo drop constraint if exists recibos_jogo_chave_pix_tipo_check;
alter table public.recibos_jogo add constraint recibos_jogo_chave_pix_tipo_check
  check (chave_pix_tipo in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria'));

alter table public.recibos_jogo_base drop constraint if exists recibos_jogo_base_chave_pix_tipo_check;
alter table public.recibos_jogo_base add constraint recibos_jogo_base_chave_pix_tipo_check
  check (chave_pix_tipo in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria'));
