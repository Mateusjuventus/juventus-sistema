-- Módulo de Solicitações: registro e controle de pedidos formais (Compra, Pagamento, Exame
-- Médico e Reembolso), com geração de PDF no modelo do formulário usado pelo clube.
-- Aplicar via SQL editor do painel Supabase, depois de 0001 a 0016.

create table public.solicitacoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('compra', 'pagamento', 'exame_medico', 'reembolso')),
  data_solicitacao date not null default current_date,
  solicitante text not null,
  setor text not null default 'Futebol Profissional',
  descricao_necessidade text not null,
  prazo_sugerido date,
  valor numeric(10, 2), -- usado em Pagamento e Reembolso; fica nulo em Compra e Exame Médico
  chave_pix text, -- usado só em Reembolso
  chave_pix_tipo text check (chave_pix_tipo in ('cpf', 'cnpj', 'email', 'telefone')),
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'recusada', 'concluida')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger solicitacoes_set_updated_at
  before update on public.solicitacoes
  for each row execute function set_updated_at();

create index solicitacoes_tipo_idx on public.solicitacoes (tipo);
create index solicitacoes_status_idx on public.solicitacoes (status);

-- Itens de uma solicitação de Compra (quantidade + descrição + foto opcional do item). Os outros
-- tipos de solicitação (Pagamento, Exame Médico, Reembolso) não usam esta tabela — usam só a
-- descrição da necessidade.
create table public.solicitacao_itens (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references public.solicitacoes(id) on delete cascade,
  quantidade text not null,
  item text not null,
  foto_path text,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index solicitacao_itens_solicitacao_id_idx on public.solicitacao_itens (solicitacao_id);

alter table public.solicitacoes enable row level security;
create policy "authenticated_full_access" on public.solicitacoes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.solicitacoes to authenticated;

alter table public.solicitacao_itens enable row level security;
create policy "authenticated_full_access" on public.solicitacao_itens for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.solicitacao_itens to authenticated;
