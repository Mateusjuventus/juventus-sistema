-- Fase 1 do Pacote A (Área do Treinador em 3 abas + Programação Semanal) — ver
-- docs/superpowers/specs/2026-08-30-area-treinador-programacao-design.md. 4 tabelas novas: a grade
-- semanal de atividades do treinador por categoria, as subatividades detalhadas de cada atividade,
-- um catálogo de subatividades reutilizável por categoria, e a configuração de época/microciclo
-- usada só na exportação em PDF/JPG (Fase 7, pacote futuro — criada aqui pra não precisar de outra
-- migration só pra isso).
--
-- RLS: policy única "authenticated_full_access" (auth.role() = 'authenticated'), igual a TODAS as
-- outras tabelas *_base do sistema (ver 0031/0032/0033/0061) — não existe hoje nenhuma tabela deste
-- projeto com policy de Postgres restrita por categoria. A restrição real (treinador só vê/edita a
-- categoria em que atua) é feita em código, em lib/programacao/permissoes.ts (Fase 2), do mesmo
-- jeito que atletas_base/comissao_tecnica_base já são filtradas hoje via getCategoriasTreinador() —
-- RLS aqui é a mesma última linha de defesa genérica que protege as demais tabelas, não uma trava
-- por categoria.

create table public.programacao_atividades (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('sub20', 'sub17', 'sub15', 'sub14', 'sub13', 'sub12', 'sub11')),
  data date not null,
  -- Derivado de horario_inicio ao salvar (Fase 2), mas guardado explícito pra não recalcular toda
  -- hora ao montar a grade.
  turno text not null check (turno in ('manha', 'tarde', 'noite')),
  nome text not null,
  tipo text not null check (tipo in (
    'programacao', 'refeicao', 'academia', 'treinamento', 'transporte',
    'jogo_oficial', 'jogo_treino', 'imprensa', 'regenerativo'
  )),
  horario_inicio time not null,
  horario_termino time,
  local text,
  -- Só preenchido quando `tipo` é 'jogo_oficial'/'jogo_treino' contra um jogo já cadastrado em
  -- jogos_base daquela categoria — nesse caso horário/local/adversário/escudo são sempre lidos de
  -- jogos_base na hora de exibir/exportar, nunca duplicados aqui (ver spec, "Atividade de jogo não
  -- duplica dado"). Cascata: se o jogo for excluído, a atividade que só existia pra representá-lo
  -- deixa de fazer sentido.
  jogo_id uuid references public.jogos_base(id) on delete cascade,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger programacao_atividades_set_updated_at
  before update on public.programacao_atividades
  for each row execute function set_updated_at();

create index programacao_atividades_categoria_data_idx on public.programacao_atividades (categoria, data);
create index programacao_atividades_jogo_id_idx on public.programacao_atividades (jogo_id) where jogo_id is not null;

create table public.programacao_subatividades (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null references public.programacao_atividades(id) on delete cascade,
  nome text not null,
  duracao_blocos int,
  intervalo_min int,
  video_url text,
  observacoes text,
  -- Diagrama de campo, regras, dimensões, orientações por posição, sliders físico/tático/técnico/
  -- comportamental (0-100) e métodos de treinamento marcados — campos ainda não normalizados
  -- porque o formulário deve mudar de forma com o uso real (ver spec, "Por que config jsonb").
  config jsonb not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index programacao_subatividades_atividade_id_idx on public.programacao_subatividades (atividade_id);

-- Catálogo é por categoria (não por treinador, não global) — escolher um item no dropdown
-- "Importar" só copia os valores pra pré-preencher o formulário de Nova Subatividade; não cria
-- vínculo entre a subatividade salva e o item do catálogo (ver spec, "Catálogo não é modificado ao
-- ser usado").
create table public.programacao_catalogo_subatividades (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('sub20', 'sub17', 'sub15', 'sub14', 'sub13', 'sub12', 'sub11')),
  nome text not null,
  duracao_blocos int,
  intervalo_min int,
  video_url text,
  observacoes text,
  config jsonb not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index programacao_catalogo_subatividades_categoria_idx on public.programacao_catalogo_subatividades (categoria);

-- Época e número do microciclo por categoria, usados só na exportação do PDF/JPG (Fase 7) — o
-- Mateus incrementa o número manualmente a cada semana, do jeito que já faz hoje em Excel. Uma
-- linha por categoria, singleton por categoria (não uma única linha global) — já pré-criada aqui
-- pra a tela de exportação encontrar sempre uma linha pra ler/atualizar, nunca precisar de upsert.
create table public.configuracoes_programacao_base (
  categoria text primary key check (categoria in ('sub20', 'sub17', 'sub15', 'sub14', 'sub13', 'sub12', 'sub11')),
  epoca text,
  microciclo_atual int not null default 1,
  updated_at timestamptz not null default now()
);

create trigger configuracoes_programacao_base_set_updated_at
  before update on public.configuracoes_programacao_base
  for each row execute function set_updated_at();

insert into public.configuracoes_programacao_base (categoria) values
  ('sub20'), ('sub17'), ('sub15'), ('sub14'), ('sub13'), ('sub12'), ('sub11');

alter table public.programacao_atividades enable row level security;
create policy "authenticated_full_access" on public.programacao_atividades for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.programacao_atividades to authenticated;
grant select, insert, update, delete on public.programacao_atividades to service_role;

alter table public.programacao_subatividades enable row level security;
create policy "authenticated_full_access" on public.programacao_subatividades for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.programacao_subatividades to authenticated;
grant select, insert, update, delete on public.programacao_subatividades to service_role;

alter table public.programacao_catalogo_subatividades enable row level security;
create policy "authenticated_full_access" on public.programacao_catalogo_subatividades for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.programacao_catalogo_subatividades to authenticated;
grant select, insert, update, delete on public.programacao_catalogo_subatividades to service_role;

alter table public.configuracoes_programacao_base enable row level security;
create policy "authenticated_full_access" on public.configuracoes_programacao_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.configuracoes_programacao_base to authenticated;
grant select, insert, update, delete on public.configuracoes_programacao_base to service_role;
