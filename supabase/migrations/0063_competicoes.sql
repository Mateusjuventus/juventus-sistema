-- Módulo de Competições (ver docs/superpowers/specs/2026-08-10-competicoes-design.md).
--
-- Estrutura: TEMPORADA → COMPETIÇÃO → FASES → GRUPOS → (equipes / jogos vinculados). Regras que
-- valem pro módulo inteiro, definidas pelo Mateus na spec:
--  - A competição é identificada só pelo nome (sem "tipo de competição", sem nome oficial à parte).
--  - Jogos NÃO são recriados aqui: `competicao_jogos` só vincula um jogo já existente de
--    `public.jogos` à competição/fase/grupo.
--  - Cartão NÃO tem cadastro próprio: existe apenas como evento da súmula (`sumula_eventos`).
--    Todas as telas de cartões/suspensões/condição de jogo derivam desses eventos na hora
--    (mesmo padrão "sem cache" de estatísticas do atleta, ver 0054). Por isso só existe tabela
--    para suspensão MANUAL (decisão disciplinar externa) — a automática é calculada.
--  - Classificação: os jogos do Juventus entram sozinhos (placar de `jogos.gols_pro/contra`);
--    os confrontos entre os OUTROS clubes do grupo são lançados em `competicao_grupo_resultados`
--    (registro leve de placar, não é um "jogo" do sistema).
--  - Vaga projetada: uma equipe de grupo de fase futura pode ser "1º do Grupo 3" em vez de um
--    nome fixo (`origem_grupo_id` + `origem_posicao`) — resolvida pela classificação atual para
--    mostrar os possíveis confrontos das próximas fases.
--
-- Só Futebol Profissional neste primeiro passo (jogos_base/atletas_base ficam pra depois).

create table public.temporadas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.competicoes (
  id uuid primary key default gen_random_uuid(),
  temporada_id uuid not null references public.temporadas(id),
  nome text not null,
  federacao text,
  categoria text not null default 'Profissional',
  data_inicio date,
  data_termino date,
  status text not null default 'planejada' check (status in ('planejada', 'em_andamento', 'encerrada')),
  regulamento_path text,
  observacoes text,
  -- Motor de regras disciplinares da competição (cada campeonato pode ter regra própria).
  regra_amarelos_suspensao integer not null default 3 check (regra_amarelos_suspensao >= 1),
  regra_jogos_suspensao_amarelos integer not null default 1 check (regra_jogos_suspensao_amarelos >= 1),
  regra_jogos_suspensao_vermelho integer not null default 1 check (regra_jogos_suspensao_vermelho >= 1),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger competicoes_set_updated_at
before update on public.competicoes
for each row execute function set_updated_at();

create index competicoes_temporada_idx on public.competicoes (temporada_id);

create table public.competicao_fases (
  id uuid primary key default gen_random_uuid(),
  competicao_id uuid not null references public.competicoes(id) on delete cascade,
  nome text not null,
  ordem integer not null default 0,
  status text not null default 'aguardando' check (status in ('aguardando', 'em_andamento', 'encerrada')),
  created_at timestamptz not null default now()
);

create index competicao_fases_competicao_idx on public.competicao_fases (competicao_id, ordem);

create table public.competicao_grupos (
  id uuid primary key default gen_random_uuid(),
  fase_id uuid not null references public.competicao_fases(id) on delete cascade,
  nome text not null,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index competicao_grupos_fase_idx on public.competicao_grupos (fase_id, ordem);

-- Equipe de um grupo: ou um nome fixo (`nome`), ou uma vaga projetada de fase anterior
-- (`origem_grupo_id` + `origem_posicao`, ex.: "1º do Grupo 3"), resolvida pela classificação.
create table public.competicao_grupo_equipes (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.competicao_grupos(id) on delete cascade,
  nome text,
  origem_grupo_id uuid references public.competicao_grupos(id) on delete cascade,
  origem_posicao integer check (origem_posicao is null or origem_posicao >= 1),
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  check (nome is not null or (origem_grupo_id is not null and origem_posicao is not null))
);

create index competicao_grupo_equipes_grupo_idx on public.competicao_grupo_equipes (grupo_id, ordem);

-- Vínculo do jogo EXISTENTE com a competição/fase/grupo. `jogo_id` é unique: um jogo pertence a
-- no máximo uma competição (a temporada vem pela competição).
create table public.competicao_jogos (
  id uuid primary key default gen_random_uuid(),
  competicao_id uuid not null references public.competicoes(id) on delete cascade,
  jogo_id uuid not null unique references public.jogos(id) on delete cascade,
  fase_id uuid references public.competicao_fases(id) on delete set null,
  grupo_id uuid references public.competicao_grupos(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index competicao_jogos_competicao_idx on public.competicao_jogos (competicao_id);

-- Resultado entre os OUTROS clubes do grupo (Osasco x Paulista etc.) — só pra classificação.
-- Jogos do Juventus nunca entram aqui (vêm de `jogos` via `competicao_jogos`).
create table public.competicao_grupo_resultados (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.competicao_grupos(id) on delete cascade,
  equipe_casa text not null,
  equipe_fora text not null,
  gols_casa integer not null check (gols_casa >= 0),
  gols_fora integer not null check (gols_fora >= 0),
  data_jogo date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index competicao_grupo_resultados_grupo_idx on public.competicao_grupo_resultados (grupo_id);

create table public.competicao_inscricoes (
  id uuid primary key default gen_random_uuid(),
  competicao_id uuid not null references public.competicoes(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  lista text check (lista in ('A', 'B')),
  data_inscricao date not null default current_date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (competicao_id, atleta_id)
);

create index competicao_inscricoes_competicao_idx on public.competicao_inscricoes (competicao_id);

-- Só suspensão MANUAL (decisão disciplinar externa, ex.: punição do TJD). As automáticas por
-- cartão são derivadas das súmulas pelo motor de regras — não têm tabela de propósito.
create table public.competicao_suspensoes_manuais (
  id uuid primary key default gen_random_uuid(),
  competicao_id uuid not null references public.competicoes(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  origem text not null default 'decisao_disciplinar' check (origem in ('cartao', 'decisao_disciplinar', 'outro')),
  motivo text not null,
  jogos_suspensao integer not null default 1 check (jogos_suspensao >= 1),
  data_decisao date not null default current_date,
  observacoes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index competicao_suspensoes_manuais_competicao_idx
  on public.competicao_suspensoes_manuais (competicao_id);

create table public.competicao_prazos (
  id uuid primary key default gen_random_uuid(),
  competicao_id uuid not null references public.competicoes(id) on delete cascade,
  titulo text not null,
  data_inicio date,
  data_fim date not null,
  concluido boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index competicao_prazos_competicao_idx on public.competicao_prazos (competicao_id, data_fim);

create table public.competicao_documentos (
  id uuid primary key default gen_random_uuid(),
  competicao_id uuid not null references public.competicoes(id) on delete cascade,
  nome text not null,
  arquivo_path text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index competicao_documentos_competicao_idx on public.competicao_documentos (competicao_id);

-- RLS (mesmo padrão de 0053: acesso total pra qualquer usuário autenticado)

alter table public.temporadas enable row level security;
alter table public.competicoes enable row level security;
alter table public.competicao_fases enable row level security;
alter table public.competicao_grupos enable row level security;
alter table public.competicao_grupo_equipes enable row level security;
alter table public.competicao_jogos enable row level security;
alter table public.competicao_grupo_resultados enable row level security;
alter table public.competicao_inscricoes enable row level security;
alter table public.competicao_suspensoes_manuais enable row level security;
alter table public.competicao_prazos enable row level security;
alter table public.competicao_documentos enable row level security;

create policy "authenticated_full_access" on public.temporadas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_fases
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_grupos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_grupo_equipes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_jogos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_grupo_resultados
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_inscricoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_suspensoes_manuais
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_prazos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_documentos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Grants

grant select, insert, update, delete on public.temporadas to authenticated;
grant select, insert, update, delete on public.competicoes to authenticated;
grant select, insert, update, delete on public.competicao_fases to authenticated;
grant select, insert, update, delete on public.competicao_grupos to authenticated;
grant select, insert, update, delete on public.competicao_grupo_equipes to authenticated;
grant select, insert, update, delete on public.competicao_jogos to authenticated;
grant select, insert, update, delete on public.competicao_grupo_resultados to authenticated;
grant select, insert, update, delete on public.competicao_inscricoes to authenticated;
grant select, insert, update, delete on public.competicao_suspensoes_manuais to authenticated;
grant select, insert, update, delete on public.competicao_prazos to authenticated;
grant select, insert, update, delete on public.competicao_documentos to authenticated;

-- Storage: bucket privado pra regulamento e documentos da competição (mesmo padrão de 0054).
-- Convenção de path: competicao-documentos/<competicao_documento_id>/<arquivo>

insert into storage.buckets (id, name, public)
values ('competicao-documentos', 'competicao-documentos', false)
on conflict (id) do nothing;

create policy "authenticated_read_competicao_documentos" on storage.objects
  for select using (bucket_id = 'competicao-documentos' and auth.role() = 'authenticated');

create policy "authenticated_insert_competicao_documentos" on storage.objects
  for insert with check (bucket_id = 'competicao-documentos' and auth.role() = 'authenticated');

create policy "authenticated_update_competicao_documentos" on storage.objects
  for update using (bucket_id = 'competicao-documentos' and auth.role() = 'authenticated');

create policy "authenticated_delete_competicao_documentos" on storage.objects
  for delete using (bucket_id = 'competicao-documentos' and auth.role() = 'authenticated');

-- Módulo novo "Competições" liberado pra todo mundo que já existe (mesmo espírito de 0024: a
-- chegada de um módulo novo nunca tira acesso de ninguém — o master desmarca depois se quiser).

alter table public.perfis
  alter column modulos_permitidos set default array[
    'atletas',
    'comissao_tecnica',
    'staff_operacional',
    'jogos',
    'competicoes',
    'solicitacoes',
    'estoque',
    'financeiro'
  ];

update public.perfis
  set modulos_permitidos = array_append(modulos_permitidos, 'competicoes')
  where not ('competicoes' = any(modulos_permitidos));
