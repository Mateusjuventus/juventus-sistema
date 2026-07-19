-- Carga de Ingressos: controle, por jogo, da quantidade de ingressos recebida e de cada
-- solicitação nomeada atendida, com saldo disponível sempre calculado on-the-fly (nunca guardado)
-- (ver docs/superpowers/specs/2026-07-19-carga-ingressos-design.md).
-- Aplicar via SQL editor do painel Supabase, depois de 0001 a 0029.

-- Cada linha é uma remessa de ingressos recebida para aquele jogo. Pode haver mais de uma por
-- jogo (ex: chegou mais depois da carga inicial) — o saldo disponível soma todas.
create table public.ingressos_cargas (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogos(id) on delete cascade,
  quantidade integer not null check (quantidade > 0),
  data date not null default current_date,
  observacoes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ingressos_cargas_set_updated_at
  before update on public.ingressos_cargas
  for each row execute function set_updated_at();

create index ingressos_cargas_jogo_id_idx on public.ingressos_cargas (jogo_id);

-- Cada linha é um pedido nomeado. `quantidade_atendida` pode ficar abaixo de
-- `quantidade_solicitada` (atendimento parcial) e começa em 0 até ser preenchida.
create table public.ingressos_solicitacoes (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogos(id) on delete cascade,
  nome_solicitante text not null,
  quantidade_solicitada integer not null check (quantidade_solicitada > 0),
  quantidade_atendida integer not null default 0 check (quantidade_atendida >= 0),
  observacoes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ingressos_solicitacoes_set_updated_at
  before update on public.ingressos_solicitacoes
  for each row execute function set_updated_at();

create index ingressos_solicitacoes_jogo_id_idx on public.ingressos_solicitacoes (jogo_id);

alter table public.ingressos_cargas enable row level security;
create policy "authenticated_full_access" on public.ingressos_cargas for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.ingressos_cargas to authenticated;

alter table public.ingressos_solicitacoes enable row level security;
create policy "authenticated_full_access" on public.ingressos_solicitacoes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.ingressos_solicitacoes to authenticated;
