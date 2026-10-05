-- Atendimentos da Assistência Social (Futebol de Base) — ver docs/superpowers/specs/
-- 2026-10-05-assistencia-social-e-demandas-design.md, Parte 1.
create table public.assistencia_social_atendimentos (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas_base(id) on delete cascade,
  data date not null,
  anotacoes text not null,
  encaminhamento text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger assistencia_social_atendimentos_set_updated_at
  before update on public.assistencia_social_atendimentos
  for each row execute function set_updated_at();

create index assistencia_social_atendimentos_atleta_id_idx
  on public.assistencia_social_atendimentos (atleta_id);

alter table public.assistencia_social_atendimentos enable row level security;
create policy "authenticated_full_access" on public.assistencia_social_atendimentos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.assistencia_social_atendimentos to authenticated;

-- Demandas por pessoa — ver Parte 2 da spec. Não reaproveita `tarefas` (categoria obrigatória não
-- se aplica aqui); 3 status (sem "solicitado", que só fazia sentido no fluxo de Tarefas).
create table public.demandas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  prazo date,
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'concluido')),
  responsavel_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger demandas_set_updated_at
  before update on public.demandas
  for each row execute function set_updated_at();

create index demandas_responsavel_id_idx on public.demandas (responsavel_id);
create index demandas_status_idx on public.demandas (status);

alter table public.demandas enable row level security;
create policy "authenticated_full_access" on public.demandas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.demandas to authenticated;

-- Quem o Mateus acompanha no painel de Demandas — mesmo padrão de `fisioterapia_pode_editar`
-- (checkbox único em /usuarios).
alter table public.perfis
  add column if not exists demandas_acompanhado boolean not null default false;

notify pgrst, 'reload schema';
