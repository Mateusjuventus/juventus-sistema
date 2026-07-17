-- Duas extensões do mesmo esquema de permissões por usuário iniciado em 0024_perfil_modulos.sql:
--
-- 1) `departamentos_permitidos` — controla se o usuário vê/acessa o departamento Futebol
--    Profissional e/ou Futebol de Base na tela inicial (`/`). É uma camada acima dos módulos: um
--    usuário "regular" só acessa qualquer módulo do Futebol Profissional (Atletas, Jogos, etc.) se
--    também tiver "futebol_profissional" aqui — ver lib/supabase/middleware.ts.
-- 2) `tarefas_categorias_visiveis` — quais das 5 categorias fixas de Tarefas (Logística, Registro,
--    Financeiro, Solicitações, Gerais) aparecem como aba pra esse usuário em `/tarefas`. Isso é só
--    preferência de exibição (a lista de tarefas continua compartilhada entre todo mundo) — não
--    bloqueia nada no middleware, só filtra o que aparece.
--
-- Como em 0024, todo mundo começa com tudo liberado, pra não tirar acesso/visão de ninguém sem
-- querer quando essas colunas passam a existir.
alter table public.perfis
  add column if not exists departamentos_permitidos text[] not null default array[
    'futebol_profissional',
    'futebol_base'
  ];

alter table public.perfis
  add column if not exists tarefas_categorias_visiveis text[] not null default array[
    'logistica',
    'registro',
    'financeiro',
    'solicitacoes',
    'gerais'
  ];
