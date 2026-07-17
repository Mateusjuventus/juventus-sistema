-- Sub-permissão dentro do módulo Estoque: quais das duas ramificações (Esportivo / Médico) o
-- usuário "regular" pode acessar. Ao contrário de `tarefas_categorias_visiveis` (que é só
-- preferência de exibição), isto BLOQUEIA de verdade — ver lib/supabase/middleware.ts — do mesmo
-- jeito que `modulos_permitidos` bloqueia módulos inteiros.
--
-- Como nas outras colunas de permissão, todo mundo começa com as duas liberadas, pra não tirar
-- acesso de ninguém sem querer quando esta coluna passa a existir.
alter table public.perfis
  add column if not exists estoque_categorias_permitidas text[] not null default array[
    'esportivo',
    'medico'
  ];
