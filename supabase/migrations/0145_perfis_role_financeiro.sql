-- Papel "financeiro" — Área Financeira (ver docs/superpowers/specs/
-- 2026-10-22-area-financeira-design.md). Mesmo padrão da migration 0079, que liberou o papel
-- "treinador": só amplia o check constraint de `perfis.role`, sem nenhuma coluna nova (diferente do
-- Treinador, esse papel não precisa de vínculo nem de categorias — vê os jogos dos dois
-- departamentos, Profissional e Base, sempre).

alter table public.perfis drop constraint perfis_role_check;
alter table public.perfis add constraint perfis_role_check
  check (role in ('master', 'regular', 'treinador', 'financeiro'));

notify pgrst, 'reload schema';
