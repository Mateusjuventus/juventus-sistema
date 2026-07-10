-- Convocação, Presskit e Logística de Jogo
-- Adiciona: status do atleta, preferência de quarto da comissão técnica, catálogo de funções
-- do staff operacional, convocação por jogo, rooming list, lista de ônibus e credenciamento
-- por zona. Aplicar via SQL editor do painel Supabase, depois de 0001_init.sql e 0002_grants.sql.

-- =========================================================
-- ATLETAS: status
-- =========================================================
alter table public.atletas
  add column status text not null default 'liberado'
  constraint atletas_status_check check (status in ('liberado', 'suspenso', 'departamento_medico'));

-- =========================================================
-- COMISSÃO TÉCNICA: preferência de quarto
-- =========================================================
alter table public.comissao_tecnica
  add column tipo_quarto_preferido text
  constraint comissao_tipo_quarto_check check (tipo_quarto_preferido in ('single', 'duplo'));

-- =========================================================
-- STAFF OPERACIONAL: catálogo de funções (substitui texto livre)
-- =========================================================
create table public.staff_funcoes_catalogo (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

insert into public.staff_funcoes_catalogo (nome) values
  ('Segurança'),
  ('Vigilante'),
  ('Controlador de Acesso'),
  ('Orientador'),
  ('Limpeza'),
  ('Bombeiro Civil'),
  ('Gandula'),
  ('Maqueiro'),
  ('Gerente de Segurança'),
  ('Administrativo'),
  ('Responsável pelo Credenciamento')
on conflict (nome) do nothing;

-- Garante que nenhum valor já cadastrado em produção fique órfão: qualquer função de texto livre
-- já usada em staff_operacional que não esteja no catálogo acima entra automaticamente.
insert into public.staff_funcoes_catalogo (nome)
select distinct trim(funcao_setor)
from public.staff_operacional
where trim(funcao_setor) <> ''
on conflict (nome) do nothing;

alter table public.staff_operacional add column funcao_id uuid references public.staff_funcoes_catalogo(id);

update public.staff_operacional s
set funcao_id = c.id
from public.staff_funcoes_catalogo c
where lower(trim(s.funcao_setor)) = lower(c.nome);

alter table public.staff_operacional alter column funcao_id set not null;
alter table public.staff_operacional drop column funcao_setor;

create index staff_funcao_idx on public.staff_operacional (funcao_id);

-- =========================================================
-- CONVOCAÇÃO
-- =========================================================
create table public.convocacoes (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null unique references public.jogos(id) on delete cascade,
  capitao_atleta_id uuid references public.atletas(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger convocacoes_set_updated_at
  before update on public.convocacoes
  for each row execute function set_updated_at();

create table public.convocacao_atletas (
  convocacao_id uuid not null references public.convocacoes(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  status text not null check (status in ('titular', 'reserva')),
  primary key (convocacao_id, atleta_id)
);

create table public.convocacao_comissao (
  convocacao_id uuid not null references public.convocacoes(id) on delete cascade,
  comissao_id uuid not null references public.comissao_tecnica(id) on delete cascade,
  primary key (convocacao_id, comissao_id)
);

create table public.convocacao_staff (
  convocacao_id uuid not null references public.convocacoes(id) on delete cascade,
  staff_id uuid not null references public.staff_operacional(id) on delete cascade,
  primary key (convocacao_id, staff_id)
);

-- =========================================================
-- ROOMING LIST (jogos fora)
-- =========================================================
create table public.rooming_list (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null unique references public.jogos(id) on delete cascade,
  hotel_nome text,
  hotel_endereco text,
  checkin date,
  checkout date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger rooming_list_set_updated_at
  before update on public.rooming_list
  for each row execute function set_updated_at();

create table public.rooming_list_quartos (
  id uuid primary key default gen_random_uuid(),
  rooming_list_id uuid not null references public.rooming_list(id) on delete cascade,
  tipo text not null check (tipo in ('single', 'duplo')),
  ordem integer not null default 0
);

create table public.rooming_list_ocupantes (
  quarto_id uuid not null references public.rooming_list_quartos(id) on delete cascade,
  pessoa_tipo text not null check (pessoa_tipo in ('comissao', 'staff')),
  pessoa_id uuid not null,
  primary key (quarto_id, pessoa_tipo, pessoa_id)
);

-- =========================================================
-- LISTA DE PASSAGEIROS DO ÔNIBUS (jogos em casa e fora)
-- =========================================================
create table public.onibus_lista (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogos(id) on delete cascade,
  onibus_numero integer not null,
  horario_saida time,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint onibus_lista_unique unique (jogo_id, onibus_numero)
);

create table public.onibus_passageiros (
  onibus_lista_id uuid not null references public.onibus_lista(id) on delete cascade,
  pessoa_tipo text not null check (pessoa_tipo in ('atleta', 'comissao', 'staff')),
  pessoa_id uuid not null,
  primary key (onibus_lista_id, pessoa_tipo, pessoa_id)
);

-- =========================================================
-- CREDENCIAMENTO POR ZONA (jogo em casa; catálogo de jogo fora fica pendente)
-- =========================================================
create table public.credenciamento_catalogo (
  id uuid primary key default gen_random_uuid(),
  zona text not null,
  zona_cor text,
  funcao text not null,
  vagas_totais integer not null default 0,
  created_at timestamptz not null default now(),
  constraint credenciamento_catalogo_unique unique (zona, funcao)
);

insert into public.credenciamento_catalogo (zona, zona_cor, funcao, vagas_totais) values
  ('Zona Plena', '#a78bfa', 'Gerente de Operações', 1),
  ('Zona Plena', '#a78bfa', 'Administrador do Estádio', 1),
  ('Zona Plena', '#a78bfa', 'Gerente de Segurança', 1),
  ('Zona Plena', '#a78bfa', 'Presidente', 1),
  ('Zona Roxa', '#7c3aed', 'Mascote do Clube', 1),
  ('Zona Azul', '#3b82f6', 'Manutenção - Gramado', 1),
  ('Zona Azul', '#3b82f6', 'Segurança Delegação', 2),
  ('Zona Azul', '#3b82f6', 'Jogadores', 23),
  ('Zona Azul', '#3b82f6', 'Ambulância', 4),
  ('Zona Azul', '#3b82f6', 'Comunicação', 3),
  ('Zona Azul', '#3b82f6', 'Gandula', 6),
  ('Zona Azul', '#3b82f6', 'Maqueiros', 2),
  ('Zona Azul', '#3b82f6', 'Comissão Técnica', 12),
  ('Zona Vermelha', '#ef4444', 'Brigada de Incêndio', 2),
  ('Zona Vermelha', '#ef4444', 'Controlador de Acesso', 3),
  ('Zona Vermelha', '#ef4444', 'Diretoria Delegação', 3),
  ('Zona Vermelha', '#ef4444', 'Manutenção Predial', 3),
  ('Zona Vermelha', '#ef4444', 'Operador - CFTV/som/imagem', 2),
  ('Zona Vermelha', '#ef4444', 'Orientador de Público', 10),
  ('Zona Vermelha', '#ef4444', 'Ouvidor', 1),
  ('Zona Vermelha', '#ef4444', 'Responsável - Credenciamento', 1),
  ('Zona Vermelha', '#ef4444', 'Segurança Patrimonial', 10),
  ('Zona Vermelha', '#ef4444', 'Serviços de A&B', 10),
  ('Zona Vermelha', '#ef4444', 'Staff do Clube / Sede', 10),
  ('Zona Vermelha', '#ef4444', 'Ambulância', 4),
  ('Zona Vermelha', '#ef4444', 'Equipe de Limpeza', 5),
  ('Zona Vermelha', '#ef4444', 'Comunicação', 3),
  ('Zona Amarela', '#eab308', 'Segurança Patrimonial', 3),
  ('Zona Amarela', '#eab308', 'Atendimento ao Torcedor', 2),
  ('Zona Amarela', '#eab308', 'Motorista', 4),
  ('Zona Amarela', '#eab308', 'Orientador de Público', 10)
on conflict (zona, funcao) do nothing;

create table public.credenciamento_jogo (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogos(id) on delete cascade,
  credenciamento_catalogo_id uuid not null references public.credenciamento_catalogo(id),
  pessoa_tipo text not null check (pessoa_tipo in ('comissao', 'staff')),
  pessoa_id uuid not null,
  vaga_extra boolean not null default false,
  created_at timestamptz not null default now(),
  constraint credenciamento_jogo_unique unique (jogo_id, pessoa_tipo, pessoa_id)
);

create index credenciamento_jogo_catalogo_idx on public.credenciamento_jogo (jogo_id, credenciamento_catalogo_id);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.staff_funcoes_catalogo enable row level security;
alter table public.convocacoes enable row level security;
alter table public.convocacao_atletas enable row level security;
alter table public.convocacao_comissao enable row level security;
alter table public.convocacao_staff enable row level security;
alter table public.rooming_list enable row level security;
alter table public.rooming_list_quartos enable row level security;
alter table public.rooming_list_ocupantes enable row level security;
alter table public.onibus_lista enable row level security;
alter table public.onibus_passageiros enable row level security;
alter table public.credenciamento_catalogo enable row level security;
alter table public.credenciamento_jogo enable row level security;

create policy "authenticated_full_access" on public.staff_funcoes_catalogo
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.convocacoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.convocacao_atletas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.convocacao_comissao
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.convocacao_staff
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.rooming_list
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.rooming_list_quartos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.rooming_list_ocupantes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.onibus_lista
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.onibus_passageiros
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.credenciamento_catalogo
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.credenciamento_jogo
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- =========================================================
-- GRANTS (RLS não substitui GRANT — ver 0002_grants.sql)
-- =========================================================
grant select, insert, update, delete on public.staff_funcoes_catalogo to authenticated;
grant select, insert, update, delete on public.convocacoes to authenticated;
grant select, insert, update, delete on public.convocacao_atletas to authenticated;
grant select, insert, update, delete on public.convocacao_comissao to authenticated;
grant select, insert, update, delete on public.convocacao_staff to authenticated;
grant select, insert, update, delete on public.rooming_list to authenticated;
grant select, insert, update, delete on public.rooming_list_quartos to authenticated;
grant select, insert, update, delete on public.rooming_list_ocupantes to authenticated;
grant select, insert, update, delete on public.onibus_lista to authenticated;
grant select, insert, update, delete on public.onibus_passageiros to authenticated;
grant select, insert, update, delete on public.credenciamento_catalogo to authenticated;
grant select, insert, update, delete on public.credenciamento_jogo to authenticated;
