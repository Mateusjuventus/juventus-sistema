-- Fase 3 do Futebol de Base (ver docs/superpowers/specs/2026-07-20-futebol-de-base-design.md):
-- módulo Jogos (com categoria) + Financeiro. Espelha toda a estrutura de jogos/convocação/
-- logística/recibo/programação/financeiro do Futebol Profissional (migrações 0001, 0003, 0006 a
-- 0010, 0015, 0029), em tabelas `_base` totalmente isoladas. Fora de escopo aqui (ver spec):
-- Credenciamento por zona e Carga de Ingressos — o Futebol de Base não usa nenhum dos dois.

-- =========================================================
-- JOGOS (BASE)
-- =========================================================
create table public.jogos_base (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('sub20', 'sub17', 'sub15', 'sub14', 'sub13', 'sub12', 'sub11')),
  competicao text not null,
  rodada_fase text,
  adversario_nome text not null,
  adversario_logo_path text,
  data_jogo date not null,
  horario time,
  local_estadio text,
  endereco text,
  mandante boolean not null,
  gols_pro integer,
  gols_contra integer,
  concentracao_data date,
  concentracao_regras text not null default $$Obrigatório utilização do uniforme de concentração;
Cumprir os horários definidos na programação;
Após a entrada na concentração é proibida a saída;
Proibido som alto na concentração;
Encerramento dos jogos e sala de tv às 22h;$$,
  dia_jogo_liberacao text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger jogos_base_set_updated_at
  before update on public.jogos_base
  for each row execute function set_updated_at();

create index jogos_base_categoria_idx on public.jogos_base (categoria);
create index jogos_base_data_idx on public.jogos_base (data_jogo desc);
create index jogos_base_adversario_idx on public.jogos_base using gin (to_tsvector('portuguese', adversario_nome));

-- =========================================================
-- CHECKLIST DE PREPARAÇÃO (BASE)
-- =========================================================
create table public.checklist_jogo_itens_base (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogos_base(id) on delete cascade,
  item text not null,
  concluido boolean not null default false,
  prazo date,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index checklist_jogo_itens_base_jogo_id_idx on public.checklist_jogo_itens_base (jogo_id);

-- =========================================================
-- CONVOCAÇÃO (BASE)
-- =========================================================
create table public.convocacoes_base (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null unique references public.jogos_base(id) on delete cascade,
  capitao_atleta_id uuid references public.atletas_base(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger convocacoes_base_set_updated_at
  before update on public.convocacoes_base
  for each row execute function set_updated_at();

create table public.convocacao_atletas_base (
  convocacao_id uuid not null references public.convocacoes_base(id) on delete cascade,
  atleta_id uuid not null references public.atletas_base(id) on delete cascade,
  status text not null check (status in ('titular', 'reserva')),
  primary key (convocacao_id, atleta_id)
);

create table public.convocacao_comissao_base (
  convocacao_id uuid not null references public.convocacoes_base(id) on delete cascade,
  comissao_id uuid not null references public.comissao_tecnica_base(id) on delete cascade,
  primary key (convocacao_id, comissao_id)
);

create table public.convocacao_staff_base (
  convocacao_id uuid not null references public.convocacoes_base(id) on delete cascade,
  staff_id uuid not null references public.staff_operacional_base(id) on delete cascade,
  primary key (convocacao_id, staff_id)
);

-- =========================================================
-- ROOMING LIST (BASE — jogos fora)
-- =========================================================
create table public.rooming_list_base (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null unique references public.jogos_base(id) on delete cascade,
  hotel_nome text,
  hotel_endereco text,
  checkin date,
  checkout date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger rooming_list_base_set_updated_at
  before update on public.rooming_list_base
  for each row execute function set_updated_at();

create table public.rooming_list_quartos_base (
  id uuid primary key default gen_random_uuid(),
  rooming_list_id uuid not null references public.rooming_list_base(id) on delete cascade,
  tipo text not null check (tipo in ('single', 'duplo')),
  ordem integer not null default 0
);

create table public.rooming_list_ocupantes_base (
  quarto_id uuid not null references public.rooming_list_quartos_base(id) on delete cascade,
  pessoa_tipo text not null check (pessoa_tipo in ('atleta', 'comissao', 'staff')),
  pessoa_id uuid not null,
  primary key (quarto_id, pessoa_tipo, pessoa_id)
);

-- =========================================================
-- LISTA DE PASSAGEIROS DO ÔNIBUS (BASE)
-- =========================================================
create table public.onibus_lista_base (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogos_base(id) on delete cascade,
  onibus_numero integer not null,
  horario_saida time,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint onibus_lista_base_unique unique (jogo_id, onibus_numero)
);

create table public.onibus_passageiros_base (
  onibus_lista_id uuid not null references public.onibus_lista_base(id) on delete cascade,
  pessoa_tipo text not null check (pessoa_tipo in ('atleta', 'comissao', 'staff')),
  pessoa_id uuid not null,
  primary key (onibus_lista_id, pessoa_tipo, pessoa_id)
);

-- =========================================================
-- RECIBOS DE PAGAMENTO (BASE)
-- =========================================================
create table public.recibos_jogo_base (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogos_base(id) on delete cascade,
  pessoa_tipo text not null check (pessoa_tipo in ('comissao', 'staff')),
  pessoa_id uuid not null,
  funcao_jogo text,
  valor numeric(10,2),
  chave_pix text,
  chave_pix_tipo text check (chave_pix_tipo in ('celular', 'email', 'cpf', 'aleatoria')),
  pago boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recibos_jogo_base_unique unique (jogo_id, pessoa_tipo, pessoa_id)
);

create trigger recibos_jogo_base_set_updated_at
  before update on public.recibos_jogo_base
  for each row execute function set_updated_at();

-- =========================================================
-- PROGRAMAÇÃO DE JOGO (BASE — Concentração e Dia de Jogo)
-- =========================================================
create table public.jogo_programacao_itens_base (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogos_base(id) on delete cascade,
  tipo text not null check (tipo in ('concentracao', 'dia_jogo')),
  ordem integer not null default 0,
  horario text not null,
  atividade text not null,
  local text not null,
  eh_confronto boolean not null default false,
  created_at timestamptz not null default now()
);

create index jogo_programacao_itens_base_jogo_id_idx on public.jogo_programacao_itens_base (jogo_id);

-- =========================================================
-- FINANCEIRO (BASE) — categorias_gasto é catálogo COMPARTILHADO com o Futebol Profissional
-- (não duplicado, ver spec).
-- =========================================================
create table public.gastos_jogo_base (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogos_base(id) on delete cascade,
  categoria_id uuid not null references public.categorias_gasto(id),
  descricao text,
  valor_previsto numeric(10,2) not null default 0,
  valor_efetuado numeric(10,2),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gastos_jogo_base_jogo_idx on public.gastos_jogo_base (jogo_id);

create trigger gastos_jogo_base_set_updated_at
  before update on public.gastos_jogo_base
  for each row execute function set_updated_at();

-- Configurações do Financeiro (Base) — mesmo padrão de configuracoes_financeiro, mas totalmente
-- independente (as assinaturas dos relatórios do Futebol de Base podem ser pessoas diferentes das
-- do Futebol Profissional). Tabela singleton.
create table public.configuracoes_financeiro_base (
  id uuid primary key default gen_random_uuid(),
  assinatura1_nome text not null default 'Mateus dos Santos',
  assinatura1_cargo text not null default 'Supervisor de Futebol',
  assinatura2_nome text not null default 'Pedro Machado',
  assinatura2_cargo text not null default 'Gerente de Futebol',
  updated_at timestamptz not null default now()
);

create trigger configuracoes_financeiro_base_set_updated_at
  before update on public.configuracoes_financeiro_base
  for each row execute function set_updated_at();

insert into public.configuracoes_financeiro_base (assinatura1_nome, assinatura1_cargo, assinatura2_nome, assinatura2_cargo)
values ('Mateus dos Santos', 'Supervisor de Futebol', 'Pedro Machado', 'Gerente de Futebol');

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.jogos_base enable row level security;
alter table public.checklist_jogo_itens_base enable row level security;
alter table public.convocacoes_base enable row level security;
alter table public.convocacao_atletas_base enable row level security;
alter table public.convocacao_comissao_base enable row level security;
alter table public.convocacao_staff_base enable row level security;
alter table public.rooming_list_base enable row level security;
alter table public.rooming_list_quartos_base enable row level security;
alter table public.rooming_list_ocupantes_base enable row level security;
alter table public.onibus_lista_base enable row level security;
alter table public.onibus_passageiros_base enable row level security;
alter table public.recibos_jogo_base enable row level security;
alter table public.jogo_programacao_itens_base enable row level security;
alter table public.gastos_jogo_base enable row level security;
alter table public.configuracoes_financeiro_base enable row level security;

create policy "authenticated_full_access" on public.jogos_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.checklist_jogo_itens_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.convocacoes_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.convocacao_atletas_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.convocacao_comissao_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.convocacao_staff_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.rooming_list_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.rooming_list_quartos_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.rooming_list_ocupantes_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.onibus_lista_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.onibus_passageiros_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.recibos_jogo_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.jogo_programacao_itens_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.gastos_jogo_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.configuracoes_financeiro_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- =========================================================
-- GRANTS (RLS não substitui GRANT — ver 0002_grants.sql)
-- =========================================================
grant select, insert, update, delete on public.jogos_base to authenticated;
grant select, insert, update, delete on public.checklist_jogo_itens_base to authenticated;
grant select, insert, update, delete on public.convocacoes_base to authenticated;
grant select, insert, update, delete on public.convocacao_atletas_base to authenticated;
grant select, insert, update, delete on public.convocacao_comissao_base to authenticated;
grant select, insert, update, delete on public.convocacao_staff_base to authenticated;
grant select, insert, update, delete on public.rooming_list_base to authenticated;
grant select, insert, update, delete on public.rooming_list_quartos_base to authenticated;
grant select, insert, update, delete on public.rooming_list_ocupantes_base to authenticated;
grant select, insert, update, delete on public.onibus_lista_base to authenticated;
grant select, insert, update, delete on public.onibus_passageiros_base to authenticated;
grant select, insert, update, delete on public.recibos_jogo_base to authenticated;
grant select, insert, update, delete on public.jogo_programacao_itens_base to authenticated;
grant select, insert, update, delete on public.gastos_jogo_base to authenticated;
grant select, insert, update, delete on public.configuracoes_financeiro_base to authenticated;

-- Convenção de path no bucket entity-photos (mesmo bucket compartilhado, ver 0001_init.sql):
--   jogos-base/<jogo_id>/adversario-logo.<ext>
