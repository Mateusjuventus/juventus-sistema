-- Vínculo "vivo" de perfis com a Comissão Técnica (Profissional e Base) — ver docs/superpowers/
-- specs/2026-09-13-acesso-por-categoria-comissao-tecnica-design.md. Nome/função e (só na Base)
-- categorias de acesso passam a poder ser lidos ao vivo do cadastro vinculado, em vez de duplicados
-- em `perfis`. Nula até alguém vincular; sem vínculo, tudo continua exatamente como hoje.
alter table public.perfis
  add column if not exists comissao_tecnica_id uuid references public.comissao_tecnica(id) on delete set null,
  add column if not exists comissao_tecnica_base_id uuid references public.comissao_tecnica_base(id) on delete set null;

-- Fallback manual de categorias (usado só quando NÃO há comissao_tecnica_base_id vinculado) — mesma
-- convenção de sempre em `perfis`: "not null default <lista completa>", nunca "vazio = tudo" (evita
-- qualquer usuário de Base existente perder acesso ao rodar esta migration).
alter table public.perfis
  add column if not exists categorias_base_permitidas text[] not null
    default array['sub20','sub17','sub15','sub14','sub13','sub12','sub11'];

-- Índices pelos FKs novos — úteis pra futura consulta "quem está vinculado a este registro da
-- Comissão Técnica" (ex.: ao excluir/editar alguém lá, saber se afeta algum login).
create index if not exists perfis_comissao_tecnica_id_idx on public.perfis (comissao_tecnica_id);
create index if not exists perfis_comissao_tecnica_base_id_idx on public.perfis (comissao_tecnica_base_id);

-- Nenhum GRANT novo necessário: `comissao_tecnica`/`comissao_tecnica_base` já têm `grant select`
-- pra `authenticated` (migrations 0002/0032) e RLS `authenticated_full_access`, então o embed do
-- PostgREST usado em `lib/auth/role.ts` funciona sem alteração. As 3 colunas novas de `perfis` só
-- são gravadas via `createAdminClient()` (service role) em `app/usuarios/actions.ts`, igual a
-- `departamentos_permitidos`/`categorias_treinador` hoje — não entram no grant de auto-update que
-- já existe pra `nome`/`cargo`/`assinatura_path` (ninguém se autovincula).

notify pgrst, 'reload schema';
