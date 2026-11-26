-- Relação de Atletas (Formação e Profissional) para Financeiro/Controladoria — pedido do Mateus em
-- 26/11/2026 (ver docs/superpowers/specs/2026-11-26-relacao-formacao-profissional-design.md). O
-- critério de inclusão é automático (categoria de Base + contrato vigente de Formação/Definitivo/
-- Empréstimo + status diferente de "dispensado" + ativo), com exceções manuais que persistem mês a
-- mês — esta tabela guarda só as exceções, nunca a lista inteira (que é sempre recalculada na hora).
--
-- `atleta_id` referencia `atletas` (a tabela única pós-unificação de 28/10/2026, ver
-- 0150_unificacao_atletas.sql) — não existe mais `atletas_base` em uso.
create table public.atleta_relacao_formacao_profissional_excecoes (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  tipo text not null check (tipo in ('incluir', 'excluir')),
  criado_por_perfil_id uuid references public.perfis(id) on delete set null,
  criado_por_nome text,
  created_at timestamptz not null default now(),
  -- Um atleta só pode ter UMA exceção ativa por vez (ou "sempre incluir", ou "sempre excluir" —
  -- nunca os dois). Criar uma exceção nova pro mesmo atleta substitui a anterior (upsert por
  -- `atleta_id`, ver `criarExcecao` nas actions).
  unique (atleta_id)
);

create index atleta_relacao_formacao_profissional_excecoes_atleta_id_idx
  on public.atleta_relacao_formacao_profissional_excecoes (atleta_id);

alter table public.atleta_relacao_formacao_profissional_excecoes enable row level security;

create policy "authenticated_full_access" on public.atleta_relacao_formacao_profissional_excecoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atleta_relacao_formacao_profissional_excecoes to authenticated;

notify pgrst, 'reload schema';
