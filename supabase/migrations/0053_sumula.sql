-- Súmula (eventos do jogo) — item 2 da sequência combinada (Convocação → Súmula →
-- Estatísticas do Atleta → Integração FPF → Calendário → Layout dos módulos).
-- Cria as tabelas de súmula (placar/duração do jogo) e de eventos (gol, cartão, substituição)
-- pra Futebol Profissional e Futebol de Base, seguindo o mesmo padrão de criação de tabela nova
-- usado em 0003_convocacao.sql (RLS + policy + grants; trigger de updated_at onde há a coluna).

create table public.sumulas (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogos(id) unique,
  duracao_primeiro_tempo integer not null default 45,
  duracao_segundo_tempo integer not null default 45,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger sumulas_set_updated_at
before update on public.sumulas
for each row execute function set_updated_at();

create table public.sumula_eventos (
  id uuid primary key default gen_random_uuid(),
  sumula_id uuid not null references public.sumulas(id) on delete cascade,
  tipo text not null check (tipo in ('gol', 'cartao_amarelo', 'cartao_vermelho', 'substituicao')),
  tempo text not null check (tempo in ('primeiro', 'segundo')),
  minuto integer not null,
  atleta_id uuid references public.atletas(id),
  atleta_entrou_id uuid references public.atletas(id),
  atleta_assistencia_id uuid references public.atletas(id),
  ordem integer not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.sumulas_base (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogos_base(id) unique,
  duracao_primeiro_tempo integer not null default 45,
  duracao_segundo_tempo integer not null default 45,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger sumulas_base_set_updated_at
before update on public.sumulas_base
for each row execute function set_updated_at();

create table public.sumula_eventos_base (
  id uuid primary key default gen_random_uuid(),
  sumula_id uuid not null references public.sumulas_base(id) on delete cascade,
  tipo text not null check (tipo in ('gol', 'cartao_amarelo', 'cartao_vermelho', 'substituicao')),
  tempo text not null check (tempo in ('primeiro', 'segundo')),
  minuto integer not null,
  atleta_id uuid references public.atletas_base(id),
  atleta_entrou_id uuid references public.atletas_base(id),
  atleta_assistencia_id uuid references public.atletas_base(id),
  ordem integer not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- RLS

alter table public.sumulas enable row level security;
alter table public.sumula_eventos enable row level security;
alter table public.sumulas_base enable row level security;
alter table public.sumula_eventos_base enable row level security;

create policy "authenticated_full_access" on public.sumulas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_full_access" on public.sumula_eventos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_full_access" on public.sumulas_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_full_access" on public.sumula_eventos_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Grants

grant select, insert, update, delete on public.sumulas to authenticated;
grant select, insert, update, delete on public.sumula_eventos to authenticated;
grant select, insert, update, delete on public.sumulas_base to authenticated;
grant select, insert, update, delete on public.sumula_eventos_base to authenticated;
