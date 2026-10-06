-- Fisioterapia do Futebol de Base — ver docs/superpowers/specs/2026-10-06-fisioterapia-base-
-- design.md. Espelha a migração 0111 (Profissional), mas ligada a `atletas_base(id)`. Nenhuma
-- tabela/coluna existente do Profissional é alterada.

create table public.fisioterapia_lesoes_base (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas_base(id) on delete cascade,
  descricao text not null,
  tipo text not null check (tipo in ('muscular', 'articular', 'tendinea_fascial', 'ligamentar', 'osseo', 'trauma')),
  data_inicio date,
  data_fim date,
  observacoes text,
  created_by uuid references public.perfis(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fisioterapia_queixas_base (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas_base(id) on delete cascade,
  tipo text not null check (tipo in ('muscular', 'articular', 'tendinea_fascial', 'ligamentar', 'osseo', 'trauma')),
  data date,
  descricao text not null,
  created_by uuid references public.perfis(id),
  created_at timestamptz not null default now()
);

create table public.fisioterapia_atendimentos_base (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas_base(id) on delete cascade,
  lesao_id uuid references public.fisioterapia_lesoes_base(id) on delete set null,
  data date,
  descricao text not null,
  quantidade integer,
  created_by uuid references public.perfis(id),
  created_at timestamptz not null default now()
);

create index fisioterapia_lesoes_base_atleta_id_idx on public.fisioterapia_lesoes_base (atleta_id);
create index fisioterapia_queixas_base_atleta_id_idx on public.fisioterapia_queixas_base (atleta_id);
create index fisioterapia_atendimentos_base_atleta_id_idx on public.fisioterapia_atendimentos_base (atleta_id);
create index fisioterapia_atendimentos_base_lesao_id_idx on public.fisioterapia_atendimentos_base (lesao_id);

alter table public.fisioterapia_lesoes_base enable row level security;
alter table public.fisioterapia_queixas_base enable row level security;
alter table public.fisioterapia_atendimentos_base enable row level security;

-- Mesmo padrão do resto do sistema: RLS libera pra qualquer autenticado; quem pode ver o módulo
-- (departamento + módulo liberado) e quem pode editar (fisioterapia_pode_editar_base) é checado
-- no código da aplicação (Server Actions), não em RLS por linha.
create policy "authenticated_full_access" on public.fisioterapia_lesoes_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.fisioterapia_queixas_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.fisioterapia_atendimentos_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.fisioterapia_lesoes_base to authenticated;
grant select, insert, update, delete on public.fisioterapia_queixas_base to authenticated;
grant select, insert, update, delete on public.fisioterapia_atendimentos_base to authenticated;

-- Linha do tempo de status da Base — espelha atletas_status_historico (migração 0125), mas com os
-- 4 valores que atletas_base.status já aceita (liberado/suspenso/departamento_medico/dispensado,
-- ver atletas_base_status_check). A sincronização automática (lançar/encerrar lesão) só alterna
-- entre "departamento_medico" e "liberado", igual ao Profissional — nunca toca
-- "suspenso"/"dispensado".
create table public.atletas_base_status_historico (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas_base(id) on delete cascade,
  status text not null check (status in ('liberado', 'suspenso', 'departamento_medico', 'dispensado')),
  data date not null,
  criado_por_perfil_id uuid references public.perfis(id) on delete set null,
  criado_por_nome text,
  created_at timestamptz not null default now()
);

create index atletas_base_status_historico_atleta_id_idx on public.atletas_base_status_historico (atleta_id);

alter table public.atletas_base_status_historico enable row level security;

create policy "authenticated_full_access" on public.atletas_base_status_historico
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atletas_base_status_historico to authenticated;

-- Backfill: uma linha inicial por atleta ativo da Base, com o status atual dele.
insert into public.atletas_base_status_historico (atleta_id, status, data, criado_por_nome)
select id, status, current_date, 'Migração do sistema'
from public.atletas_base
where ativo = true;

-- Permissão própria de editar (independente de fisioterapia_pode_editar, do Profissional).
alter table public.perfis
  add column if not exists fisioterapia_pode_editar_base boolean not null default false;

notify pgrst, 'reload schema';
