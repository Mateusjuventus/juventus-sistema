-- Sub-área Fisioterapia do módulo Departamento Médico (Futebol Profissional) — ver docs/
-- superpowers/specs/2026-09-30-fisioterapia-design.md. Três tabelas novas (lesões, queixas,
-- atendimentos), todas ligadas só a `atletas` (Profissional). "Dias afastados" não é coluna —
-- sempre calculado a partir de data_inicio/data_fim no código.

create table public.fisioterapia_lesoes (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  descricao text not null,
  data_inicio date not null,
  data_fim date,
  observacoes text,
  created_by uuid references public.perfis(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fisioterapia_queixas (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  tipo text not null check (tipo in ('muscular', 'articular')),
  data date not null,
  descricao text not null,
  created_by uuid references public.perfis(id),
  created_at timestamptz not null default now()
);

create table public.fisioterapia_atendimentos (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  lesao_id uuid references public.fisioterapia_lesoes(id) on delete set null,
  data date not null,
  descricao text not null,
  created_by uuid references public.perfis(id),
  created_at timestamptz not null default now()
);

create index fisioterapia_lesoes_atleta_id_idx on public.fisioterapia_lesoes (atleta_id);
create index fisioterapia_queixas_atleta_id_idx on public.fisioterapia_queixas (atleta_id);
create index fisioterapia_atendimentos_atleta_id_idx on public.fisioterapia_atendimentos (atleta_id);
create index fisioterapia_atendimentos_lesao_id_idx on public.fisioterapia_atendimentos (lesao_id);

alter table public.fisioterapia_lesoes enable row level security;
alter table public.fisioterapia_queixas enable row level security;
alter table public.fisioterapia_atendimentos enable row level security;

-- Mesmo padrão do resto do sistema: RLS libera pra qualquer autenticado, a restrição de quem
-- pode ver o módulo (departamento + módulo liberado) e quem pode editar (fisioterapia_pode_editar)
-- é toda feita no código da aplicação (middleware + Server Actions), não em RLS por linha.
create policy "authenticated_full_access" on public.fisioterapia_lesoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.fisioterapia_queixas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.fisioterapia_atendimentos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.fisioterapia_lesoes to authenticated;
grant select, insert, update, delete on public.fisioterapia_queixas to authenticated;
grant select, insert, update, delete on public.fisioterapia_atendimentos to authenticated;

alter table public.perfis
  add column if not exists fisioterapia_pode_editar boolean not null default false;

notify pgrst, 'reload schema';
