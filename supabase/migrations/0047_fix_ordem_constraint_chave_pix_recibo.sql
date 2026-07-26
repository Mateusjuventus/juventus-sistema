-- Corrige um bug na ordem das operações da migração 0039
-- (chave_pix_aleatoria_e_unificacao_recibo): lá, os dados de recibos_jogo/recibos_jogo_base eram
-- atualizados de 'celular' para 'telefone' ANTES de trocar a constraint — só que a constraint
-- ANTIGA (que só aceitava 'celular', não 'telefone') ainda estava em vigor nesse momento, então
-- esse UPDATE violava ela e a migração inteira falhava com "new row ... violates check constraint
-- recibos_jogo_chave_pix_tipo_check". Como o SQL Editor do Supabase roda o script inteiro como uma
-- transação só, isso desfazia TODA a 0039 — inclusive as mudanças em staff_operacional/
-- staff_operacional_base/solicitacoes/solicitacoes_base, que eram seguras e não tinham esse
-- problema.
--
-- Esta migração refaz tudo na ordem certa (solta a constraint antiga ANTES de atualizar os dados)
-- e é segura de rodar mesmo que partes da 0039 já tenham sido aplicadas antes — todos os passos são
-- idempotentes (drop/add da mesma constraint, update que não faz nada se não houver mais linhas
-- com 'celular').

-- Staff Operacional e Solicitações: adicionar "aleatória" é sempre seguro (os valores já existentes
-- cabem na lista nova), não precisa de nenhuma migração de dados — refeito aqui só por segurança,
-- caso o rollback da 0039 tenha desfeito isso também.
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

-- Recibos de Jogos: agora sim na ordem certa — solta a constraint antiga ANTES de migrar os dados.
alter table public.recibos_jogo drop constraint if exists recibos_jogo_chave_pix_tipo_check;
alter table public.recibos_jogo_base drop constraint if exists recibos_jogo_base_chave_pix_tipo_check;

update public.recibos_jogo set chave_pix_tipo = 'telefone' where chave_pix_tipo = 'celular';
update public.recibos_jogo_base set chave_pix_tipo = 'telefone' where chave_pix_tipo = 'celular';

alter table public.recibos_jogo add constraint recibos_jogo_chave_pix_tipo_check
  check (chave_pix_tipo in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria'));
alter table public.recibos_jogo_base add constraint recibos_jogo_base_chave_pix_tipo_check
  check (chave_pix_tipo in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria'));
