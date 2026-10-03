-- Módulo de Competições para o Futebol de Base — espelha supabase/migrations/0063 a 0067
-- (público `competicoes`) com sufixo `_base`, ver
-- docs/superpowers/specs/2026-10-03-competicoes-base-design.md. Duas diferenças deliberadas:
-- `competicoes_base.categoria` é uma categoria única da Base (não texto livre — uma competição
-- nunca cobre mais de uma categoria), e as FKs que no Profissional apontam pra `jogos`/`atletas`
-- aqui apontam pras tabelas `_base`.

create table public.temporadas_base (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.competicoes_base (
  id uuid primary key default gen_random_uuid(),
  temporada_id uuid not null references public.temporadas_base(id),
  nome text not null,
  federacao text,
  categoria text not null check (categoria in ('sub20','sub17','sub15','sub14','sub13','sub12','sub11')),
  data_inicio date,
  data_termino date,
  status text not null default 'planejada' check (status in ('planejada', 'em_andamento', 'encerrada')),
  regulamento_path text,
  observacoes text,
  regra_amarelos_suspensao integer not null default 3 check (regra_amarelos_suspensao >= 1),
  regra_jogos_suspensao_amarelos integer not null default 1 check (regra_jogos_suspensao_amarelos >= 1),
  regra_jogos_suspensao_vermelho integer not null default 1 check (regra_jogos_suspensao_vermelho >= 1),
  regra_observacoes text,
  criterios_desempate text[] not null default array[
    'vitorias', 'saldo', 'gols_pro', 'menos_vermelhos', 'menos_amarelos', 'sorteio'
  ],
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger competicoes_base_set_updated_at
before update on public.competicoes_base
for each row execute function set_updated_at();

create index competicoes_base_temporada_idx on public.competicoes_base (temporada_id);

create table public.competicao_fases_base (
  id uuid primary key default gen_random_uuid(),
  competicao_id uuid not null references public.competicoes_base(id) on delete cascade,
  nome text not null,
  ordem integer not null default 0,
  status text not null default 'aguardando' check (status in ('aguardando', 'em_andamento', 'encerrada')),
  zerar_cartoes_ao_encerrar boolean not null default false,
  criterios_desempate text[],
  created_at timestamptz not null default now()
);

create index competicao_fases_base_competicao_idx on public.competicao_fases_base (competicao_id, ordem);

create table public.competicao_grupos_base (
  id uuid primary key default gen_random_uuid(),
  fase_id uuid not null references public.competicao_fases_base(id) on delete cascade,
  nome text not null,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index competicao_grupos_base_fase_idx on public.competicao_grupos_base (fase_id, ordem);

create table public.competicao_grupo_equipes_base (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.competicao_grupos_base(id) on delete cascade,
  nome text,
  origem_grupo_id uuid references public.competicao_grupos_base(id) on delete cascade,
  origem_posicao integer check (origem_posicao is null or origem_posicao >= 1),
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  check (nome is not null or (origem_grupo_id is not null and origem_posicao is not null))
);

create index competicao_grupo_equipes_base_grupo_idx on public.competicao_grupo_equipes_base (grupo_id, ordem);

create table public.competicao_jogos_base (
  id uuid primary key default gen_random_uuid(),
  competicao_id uuid not null references public.competicoes_base(id) on delete cascade,
  jogo_id uuid not null unique references public.jogos_base(id) on delete cascade,
  fase_id uuid references public.competicao_fases_base(id) on delete set null,
  grupo_id uuid references public.competicao_grupos_base(id) on delete set null,
  cartoes_amarelos_adversario integer not null default 0 check (cartoes_amarelos_adversario >= 0),
  cartoes_vermelhos_adversario integer not null default 0 check (cartoes_vermelhos_adversario >= 0),
  sumula_link text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index competicao_jogos_base_competicao_idx on public.competicao_jogos_base (competicao_id);

create table public.competicao_grupo_resultados_base (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.competicao_grupos_base(id) on delete cascade,
  equipe_casa text not null,
  equipe_fora text not null,
  gols_casa integer not null check (gols_casa >= 0),
  gols_fora integer not null check (gols_fora >= 0),
  data_jogo date,
  rodada text,
  sumula_path text,
  sumula_link text,
  cartoes_amarelos_casa integer not null default 0 check (cartoes_amarelos_casa >= 0),
  cartoes_amarelos_fora integer not null default 0 check (cartoes_amarelos_fora >= 0),
  cartoes_vermelhos_casa integer not null default 0 check (cartoes_vermelhos_casa >= 0),
  cartoes_vermelhos_fora integer not null default 0 check (cartoes_vermelhos_fora >= 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index competicao_grupo_resultados_base_grupo_idx on public.competicao_grupo_resultados_base (grupo_id);

create table public.competicao_inscricoes_base (
  id uuid primary key default gen_random_uuid(),
  competicao_id uuid not null references public.competicoes_base(id) on delete cascade,
  atleta_id uuid not null references public.atletas_base(id) on delete cascade,
  lista text check (lista in ('A', 'B')),
  data_inscricao date not null default current_date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (competicao_id, atleta_id)
);

create index competicao_inscricoes_base_competicao_idx on public.competicao_inscricoes_base (competicao_id);

create table public.competicao_suspensoes_manuais_base (
  id uuid primary key default gen_random_uuid(),
  competicao_id uuid not null references public.competicoes_base(id) on delete cascade,
  atleta_id uuid not null references public.atletas_base(id) on delete cascade,
  origem text not null default 'decisao_disciplinar' check (origem in ('cartao', 'decisao_disciplinar', 'outro')),
  motivo text not null,
  jogos_suspensao integer not null default 1 check (jogos_suspensao >= 1),
  data_decisao date not null default current_date,
  observacoes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index competicao_suspensoes_manuais_base_competicao_idx
  on public.competicao_suspensoes_manuais_base (competicao_id);

create table public.competicao_prazos_base (
  id uuid primary key default gen_random_uuid(),
  competicao_id uuid not null references public.competicoes_base(id) on delete cascade,
  titulo text not null,
  data_inicio date,
  data_fim date not null,
  concluido boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index competicao_prazos_base_competicao_idx on public.competicao_prazos_base (competicao_id, data_fim);

create table public.competicao_documentos_base (
  id uuid primary key default gen_random_uuid(),
  competicao_id uuid not null references public.competicoes_base(id) on delete cascade,
  nome text not null,
  arquivo_path text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index competicao_documentos_base_competicao_idx on public.competicao_documentos_base (competicao_id);

-- RLS (mesmo padrão de 0063: acesso total pra qualquer usuário autenticado)

alter table public.temporadas_base enable row level security;
alter table public.competicoes_base enable row level security;
alter table public.competicao_fases_base enable row level security;
alter table public.competicao_grupos_base enable row level security;
alter table public.competicao_grupo_equipes_base enable row level security;
alter table public.competicao_jogos_base enable row level security;
alter table public.competicao_grupo_resultados_base enable row level security;
alter table public.competicao_inscricoes_base enable row level security;
alter table public.competicao_suspensoes_manuais_base enable row level security;
alter table public.competicao_prazos_base enable row level security;
alter table public.competicao_documentos_base enable row level security;

create policy "authenticated_full_access" on public.temporadas_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicoes_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_fases_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_grupos_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_grupo_equipes_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_jogos_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_grupo_resultados_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_inscricoes_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_suspensoes_manuais_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_prazos_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_documentos_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.temporadas_base to authenticated;
grant select, insert, update, delete on public.competicoes_base to authenticated;
grant select, insert, update, delete on public.competicao_fases_base to authenticated;
grant select, insert, update, delete on public.competicao_grupos_base to authenticated;
grant select, insert, update, delete on public.competicao_grupo_equipes_base to authenticated;
grant select, insert, update, delete on public.competicao_jogos_base to authenticated;
grant select, insert, update, delete on public.competicao_grupo_resultados_base to authenticated;
grant select, insert, update, delete on public.competicao_inscricoes_base to authenticated;
grant select, insert, update, delete on public.competicao_suspensoes_manuais_base to authenticated;
grant select, insert, update, delete on public.competicao_prazos_base to authenticated;
grant select, insert, update, delete on public.competicao_documentos_base to authenticated;

-- Storage: bucket próprio da Base (não compartilha com competicao-documentos do Profissional).
-- Convenção de path: competicao-documentos-base/<competicao_documento_id>/<arquivo>

insert into storage.buckets (id, name, public)
values ('competicao-documentos-base', 'competicao-documentos-base', false)
on conflict (id) do nothing;

create policy "authenticated_read_competicao_documentos_base" on storage.objects
  for select using (bucket_id = 'competicao-documentos-base' and auth.role() = 'authenticated');
create policy "authenticated_insert_competicao_documentos_base" on storage.objects
  for insert with check (bucket_id = 'competicao-documentos-base' and auth.role() = 'authenticated');
create policy "authenticated_update_competicao_documentos_base" on storage.objects
  for update using (bucket_id = 'competicao-documentos-base' and auth.role() = 'authenticated');
create policy "authenticated_delete_competicao_documentos_base" on storage.objects
  for delete using (bucket_id = 'competicao-documentos-base' and auth.role() = 'authenticated');

-- Módulo novo "Competições" liberado pra todo mundo que já tem acesso ao Futebol de Base hoje
-- (mesmo espírito de 0063: a chegada de um módulo novo nunca tira acesso de ninguém).

alter table public.perfis
  alter column modulos_base_permitidos set default array[
    'atletas',
    'comissao_tecnica',
    'staff_operacional',
    'jogos',
    'competicoes',
    'solicitacoes',
    'estoque',
    'financeiro',
    'relatorios_avulso',
    'captacao',
    'alojamento'
  ];

update public.perfis
  set modulos_base_permitidos = array_append(modulos_base_permitidos, 'competicoes')
  where modulos_base_permitidos is not null
    and not ('competicoes' = any(modulos_base_permitidos));

notify pgrst, 'reload schema';
