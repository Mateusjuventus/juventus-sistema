-- Fase 4 (final) do Futebol de Base (ver docs/superpowers/specs/2026-07-20-futebol-de-base-design.md):
-- módulos Estoque + Solicitações. Diferente de Atletas/Comissão Técnica/Jogos, estes dois módulos
-- NÃO ganham a dimensão `categoria` (Sub-20 a Sub-11) — a spec pede listas únicas, sem esse corte.
-- Estoque do Futebol de Base também não tem a bifurcação Esportivo/Médico do Profissional: só existe
-- material esportivo aqui (a spec deixa "Estoque Médico" fora de escopo), então nem existe uma
-- coluna `categoria` na tabela — é uma lista só, com rota fixa em vez de `/base/estoque/[categoria]`.
--
-- 1) `estoque_itens_base` / `estoque_entradas_base` (+itens) / `estoque_saidas_base` (+itens) —
--    mesmos campos de estoque_itens/estoque_entradas/estoque_saidas (0021_estoque.sql,
--    0022_estoque_mg.sql), menos a coluna `categoria`.
create table public.estoque_itens_base (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo text,
  mg text,
  tamanhos jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger estoque_itens_base_set_updated_at
  before update on public.estoque_itens_base
  for each row execute function set_updated_at();

create index estoque_itens_base_nome_idx on public.estoque_itens_base using gin (to_tsvector('portuguese', nome));

create table public.estoque_saidas_base (
  id uuid primary key default gen_random_uuid(),
  numero integer not null,
  data date not null default current_date,
  nome_destinatario text not null,
  funcao text,
  departamento text,
  observacoes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create unique index estoque_saidas_base_numero_unique on public.estoque_saidas_base (numero);

create table public.estoque_saida_itens_base (
  id uuid primary key default gen_random_uuid(),
  saida_id uuid not null references public.estoque_saidas_base(id) on delete cascade,
  item_id uuid references public.estoque_itens_base(id) on delete set null,
  nome text not null,
  tamanho text,
  codigo text,
  quantidade numeric(10, 2) not null,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index estoque_saida_itens_base_saida_id_idx on public.estoque_saida_itens_base (saida_id);

create table public.estoque_entradas_base (
  id uuid primary key default gen_random_uuid(),
  numero integer not null,
  data date not null default current_date,
  fornecedor text,
  nota_fiscal text,
  observacoes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create unique index estoque_entradas_base_numero_unique on public.estoque_entradas_base (numero);

create table public.estoque_entrada_itens_base (
  id uuid primary key default gen_random_uuid(),
  entrada_id uuid not null references public.estoque_entradas_base(id) on delete cascade,
  item_id uuid references public.estoque_itens_base(id) on delete set null,
  nome text not null,
  tamanho text,
  codigo text,
  quantidade numeric(10, 2) not null,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index estoque_entrada_itens_base_entrada_id_idx on public.estoque_entrada_itens_base (entrada_id);

-- 2) `solicitacoes_base` / `solicitacao_itens_base` — mesmos campos de solicitacoes/solicitacao_itens
--    já na forma final (0017/0018/0019/0020_solicitacao_*.sql), lista única, sem categoria (o módulo
--    original também nunca teve).
create table public.solicitacoes_base (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('compra', 'pagamento', 'exame_medico', 'reembolso', 'passagem_aerea')),
  data_solicitacao date not null default current_date,
  solicitante text not null,
  setor text not null default 'Futebol de Base',
  descricao_necessidade text,
  prazo_sugerido date,
  valor numeric(10, 2),
  chave_pix text,
  chave_pix_tipo text check (chave_pix_tipo in ('cpf', 'cnpj', 'email', 'telefone')),
  banco text,
  agencia text,
  conta text,
  tipo_conta text check (tipo_conta in ('corrente', 'poupanca')),
  titular_conta text,
  passageiro text,
  origem text,
  destino text,
  data_voo date,
  horario_voo time,
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'recusada', 'concluida')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger solicitacoes_base_set_updated_at
  before update on public.solicitacoes_base
  for each row execute function set_updated_at();

create index solicitacoes_base_tipo_idx on public.solicitacoes_base (tipo);
create index solicitacoes_base_status_idx on public.solicitacoes_base (status);

create table public.solicitacao_itens_base (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references public.solicitacoes_base(id) on delete cascade,
  quantidade text,
  item text,
  foto_path text,
  descricao text,
  observacao text,
  valor numeric(10, 2),
  passageiro text,
  origem text,
  destino text,
  data_voo date,
  horario_voo time,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index solicitacao_itens_base_solicitacao_id_idx on public.solicitacao_itens_base (solicitacao_id);

-- RLS + grants, mesmo padrão de todas as tabelas do sistema.
alter table public.estoque_itens_base enable row level security;
create policy "authenticated_full_access" on public.estoque_itens_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.estoque_itens_base to authenticated;

alter table public.estoque_saidas_base enable row level security;
create policy "authenticated_full_access" on public.estoque_saidas_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.estoque_saidas_base to authenticated;

alter table public.estoque_saida_itens_base enable row level security;
create policy "authenticated_full_access" on public.estoque_saida_itens_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.estoque_saida_itens_base to authenticated;

alter table public.estoque_entradas_base enable row level security;
create policy "authenticated_full_access" on public.estoque_entradas_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.estoque_entradas_base to authenticated;

alter table public.estoque_entrada_itens_base enable row level security;
create policy "authenticated_full_access" on public.estoque_entrada_itens_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.estoque_entrada_itens_base to authenticated;

alter table public.solicitacoes_base enable row level security;
create policy "authenticated_full_access" on public.solicitacoes_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.solicitacoes_base to authenticated;

alter table public.solicitacao_itens_base enable row level security;
create policy "authenticated_full_access" on public.solicitacao_itens_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.solicitacao_itens_base to authenticated;
