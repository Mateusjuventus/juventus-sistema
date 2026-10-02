-- "Campos sensíveis" bloqueados por usuário — ver docs/superpowers/specs/2026-10-02-campos-
-- sensiveis-e-atletas-por-categoria-design.md. Ao contrário dos outros mecanismos de permissão
-- deste sistema (listas do que É permitido, com tudo liberado por padrão), esta é uma lista de
-- BLOQUEIO: lista vazia = nada escondido (comportamento de hoje, preservado pra todo mundo ao
-- rodar esta migration). Marcar um campo aqui é uma ação deliberada do master pra uma pessoa
-- específica, em `/usuarios`. O catálogo de valores aceitos vive em `lib/auth/campos-sensiveis.ts`
-- (hoje só "salario") — "master" nunca é afetado por isso, independente do que estiver gravado
-- aqui.
alter table public.perfis
  add column if not exists campos_sensiveis_bloqueados text[] not null default array[]::text[];

notify pgrst, 'reload schema';
