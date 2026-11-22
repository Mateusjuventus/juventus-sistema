-- Pausar/reativar o ACESSO (login) de um usuário sem excluir o cadastro — pedido do Mateus em
-- 22/11/2026. Mesmo padrão "ativo/inativo" já usado em `comissao_tecnica` (0164) e
-- `staff_operacional`: sem motivo nem histórico. Diferente daqueles, aqui o efeito é real — o
-- login (app/login/actions.ts) e o middleware (lib/supabase/middleware.ts) checam esta coluna e
-- cortam o acesso na hora, sem revelar pra pessoa que a conta foi pausada (ela só vê "Não foi
-- possível entrar. Fale com o administrador.", igual pra qualquer outro bloqueio).
alter table public.perfis
  add column ativo boolean not null default true;

notify pgrst, 'reload schema';
