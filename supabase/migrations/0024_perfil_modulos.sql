-- Permissões por módulo, por usuário "regular" (quem é "master" sempre tem acesso a tudo,
-- independente do que estiver aqui — ver lib/auth/role.ts e lib/supabase/middleware.ts).
--
-- Todo usuário já existente, e todo usuário novo a menos que o master desmarque algo na hora do
-- cadastro, começa com acesso a todos os módulos — pra não tirar acesso de ninguém sem querer
-- quando esta coluna passa a existir.
alter table public.perfis
  add column if not exists modulos_permitidos text[] not null default array[
    'atletas',
    'comissao_tecnica',
    'staff_operacional',
    'jogos',
    'solicitacoes',
    'estoque',
    'financeiro'
  ];
