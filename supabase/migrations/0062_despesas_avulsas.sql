-- Despesas Avulsas (Prestação de Contas): gastos que não pertencem a nenhum jogo específico
-- (folha de pagamento, manutenção do CT, etc.), com o mesmo fluxo previsto x efetuado já usado em
-- gastos_jogo. Uma despesa avulsa pode opcionalmente ser vinculada a um ou mais jogos (ex: uma
-- viagem que cobre 2 jogos fora) — esse vínculo é só referência, NÃO entra no resumo previsto x
-- efetuado de nenhum jogo individual (ver docs/superpowers/specs/2026-08-08-despesas-avulsas-design.md).
-- Aplicar via SQL editor do painel Supabase, depois de 0001 a 0061.

-- =========================================================
-- DESPESAS AVULSAS (mesmo formato de gastos_jogo, sem jogo_id — reaproveita categorias_gasto)
-- =========================================================
create table public.despesas_avulsas (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias_gasto(id),
  descricao text,
  data date,
  valor_previsto numeric(10,2) not null default 0,
  valor_efetuado numeric(10,2),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger despesas_avulsas_set_updated_at
  before update on public.despesas_avulsas
  for each row execute function set_updated_at();

-- =========================================================
-- VÍNCULO N:N DESPESA AVULSA <-> JOGOS (só referência/etiqueta, não usado em nenhum cálculo)
-- =========================================================
create table public.despesas_avulsas_jogos (
  despesa_id uuid not null references public.despesas_avulsas(id) on delete cascade,
  jogo_id uuid not null references public.jogos(id) on delete cascade,
  primary key (despesa_id, jogo_id)
);

create index despesas_avulsas_jogos_jogo_idx on public.despesas_avulsas_jogos (jogo_id);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.despesas_avulsas enable row level security;
alter table public.despesas_avulsas_jogos enable row level security;

create policy "authenticated_full_access" on public.despesas_avulsas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.despesas_avulsas_jogos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- =========================================================
-- GRANTS (RLS não substitui GRANT — ver 0002_grants.sql)
-- =========================================================
grant select, insert, update, delete on public.despesas_avulsas to authenticated;
grant select, insert, update, delete on public.despesas_avulsas_jogos to authenticated;
