-- Financeiro da Base — Gasto Geral da Base (salário da Comissão Técnica + ajuda de custo dos
-- atletas, já existente, + despesas avulsas novas). Ver
-- docs/superpowers/specs/2026-08-19-financeiro-base-design.md. Aplicar via SQL editor do painel
-- Supabase, depois de 0001 a 0079.
--
-- Seguro rodar mais de uma vez (idempotente) — se der "deadlock detected" (40P01) por causa de
-- alguma outra sessão consultando as mesmas tabelas ao mesmo tempo, é só rodar de novo.

-- =========================================================
-- SALÁRIO MENSAL NA COMISSÃO TÉCNICA DA BASE (só Base — não mexe em comissao_tecnica/Profissional)
-- =========================================================
alter table public.comissao_tecnica_base
  add column if not exists valor_salario numeric(10,2);

-- =========================================================
-- DESPESAS AVULSAS DA BASE (mesmo formato de despesas_avulsas, sem o vínculo com jogos, com uma
-- categoria de idade opcional a mais — null = despesa geral, não amarrada a uma categoria)
-- =========================================================
create table if not exists public.despesas_avulsas_base (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias_gasto(id),
  categoria text check (categoria in ('sub20','sub17','sub15','sub14','sub13','sub12','sub11')),
  descricao text,
  data date,
  valor_previsto numeric(10,2) not null default 0,
  valor_efetuado numeric(10,2),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace trigger despesas_avulsas_base_set_updated_at
  before update on public.despesas_avulsas_base
  for each row execute function set_updated_at();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.despesas_avulsas_base enable row level security;

drop policy if exists "authenticated_full_access" on public.despesas_avulsas_base;
create policy "authenticated_full_access" on public.despesas_avulsas_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- =========================================================
-- GRANTS (RLS não substitui GRANT — ver 0002_grants.sql)
-- =========================================================
grant select, insert, update, delete on public.despesas_avulsas_base to authenticated;
