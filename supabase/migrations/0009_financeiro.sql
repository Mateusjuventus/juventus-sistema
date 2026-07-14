-- Prestação de Contas (Financeiro): catálogo de categorias de gasto e lançamentos de gasto por
-- jogo (orçamento previsto x efetuado). Aplicar via SQL editor do painel Supabase, depois de 0001
-- a 0008.

-- =========================================================
-- CATEGORIAS DE GASTO (catálogo extensível — mesmo padrão de staff_funcoes_catalogo)
-- =========================================================
create table public.categorias_gasto (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

insert into public.categorias_gasto (nome) values
  ('Hospedagem'),
  ('Transporte/Ônibus'),
  ('Alimentação'),
  ('Arbitragem'),
  ('Material Esportivo'),
  ('Segurança'),
  ('Doping'),
  ('Credenciamento'),
  ('Ambulância'),
  ('Outros')
on conflict (nome) do nothing;

-- =========================================================
-- GASTOS DO JOGO (orçamento previsto x efetuado)
-- =========================================================
create table public.gastos_jogo (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogos(id) on delete cascade,
  categoria_id uuid not null references public.categorias_gasto(id),
  descricao text,
  valor_previsto numeric(10,2) not null default 0,
  valor_efetuado numeric(10,2),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gastos_jogo_jogo_idx on public.gastos_jogo (jogo_id);

create trigger gastos_jogo_set_updated_at
  before update on public.gastos_jogo
  for each row execute function set_updated_at();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.categorias_gasto enable row level security;
alter table public.gastos_jogo enable row level security;

create policy "authenticated_full_access" on public.categorias_gasto
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.gastos_jogo
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- =========================================================
-- GRANTS (RLS não substitui GRANT — ver 0002_grants.sql)
-- =========================================================
grant select, insert, update, delete on public.categorias_gasto to authenticated;
grant select, insert, update, delete on public.gastos_jogo to authenticated;
