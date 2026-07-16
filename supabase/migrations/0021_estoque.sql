-- Módulo de Estoque: controle de material Esportivo e Médico — duas listas totalmente
-- independentes (nunca se misturam). Cada categoria tem seu próprio catálogo de itens, suas
-- próprias Entradas (reposição, sem assinatura) e suas próprias Saídas (retirada por um
-- colaborador, com ficha pra assinar — numero sequencial próprio por categoria).
-- Aplicar via SQL editor do painel Supabase, depois de 0001 a 0020.

create table public.estoque_itens (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('esportivo', 'medico')),
  nome text not null,
  codigo text,
  -- Quantidade por tamanho/variação num objeto só, ex: {"P": 12, "M": 20, "Único": 5} — não há uma
  -- linha por tamanho, o item inteiro (todos os tamanhos) é uma linha só na tabela.
  tamanhos jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger estoque_itens_set_updated_at
  before update on public.estoque_itens
  for each row execute function set_updated_at();

create index estoque_itens_categoria_idx on public.estoque_itens (categoria);
create index estoque_itens_nome_idx on public.estoque_itens using gin (to_tsvector('portuguese', nome));

-- Saída: retirada de material por um colaborador, gera a ficha pra imprimir e assinar (mesmo
-- modelo do formulário impresso já usado pelo clube). "numero" é sequencial e independente por
-- categoria (Esportivo e Médico cada um com sua própria contagem 0001, 0002...).
create table public.estoque_saidas (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('esportivo', 'medico')),
  numero integer not null,
  data date not null default current_date,
  nome_destinatario text not null,
  funcao text,
  departamento text,
  observacoes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index estoque_saidas_categoria_idx on public.estoque_saidas (categoria);
create unique index estoque_saidas_categoria_numero_unique on public.estoque_saidas (categoria, numero);

create table public.estoque_saida_itens (
  id uuid primary key default gen_random_uuid(),
  saida_id uuid not null references public.estoque_saidas(id) on delete cascade,
  -- Se o item de estoque for excluído depois, o histórico da ficha continua intacto (nome/tamanho/
  -- código já vêm copiados abaixo) — só perde o vínculo de volta pro cadastro do item.
  item_id uuid references public.estoque_itens(id) on delete set null,
  nome text not null,
  tamanho text,
  codigo text,
  quantidade numeric(10, 2) not null,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index estoque_saida_itens_saida_id_idx on public.estoque_saida_itens (saida_id);

-- Entrada: reposição de estoque (material que chegou) — registro simples, sem assinatura, com
-- fornecedor/nota fiscal pra rastrear a origem. "numero" também sequencial e independente por
-- categoria, numa contagem separada da de Saídas.
create table public.estoque_entradas (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('esportivo', 'medico')),
  numero integer not null,
  data date not null default current_date,
  fornecedor text,
  nota_fiscal text,
  observacoes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index estoque_entradas_categoria_idx on public.estoque_entradas (categoria);
create unique index estoque_entradas_categoria_numero_unique on public.estoque_entradas (categoria, numero);

create table public.estoque_entrada_itens (
  id uuid primary key default gen_random_uuid(),
  entrada_id uuid not null references public.estoque_entradas(id) on delete cascade,
  item_id uuid references public.estoque_itens(id) on delete set null,
  nome text not null,
  tamanho text,
  codigo text,
  quantidade numeric(10, 2) not null,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index estoque_entrada_itens_entrada_id_idx on public.estoque_entrada_itens (entrada_id);

alter table public.estoque_itens enable row level security;
create policy "authenticated_full_access" on public.estoque_itens for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.estoque_itens to authenticated;

alter table public.estoque_saidas enable row level security;
create policy "authenticated_full_access" on public.estoque_saidas for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.estoque_saidas to authenticated;

alter table public.estoque_saida_itens enable row level security;
create policy "authenticated_full_access" on public.estoque_saida_itens for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.estoque_saida_itens to authenticated;

alter table public.estoque_entradas enable row level security;
create policy "authenticated_full_access" on public.estoque_entradas for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.estoque_entradas to authenticated;

alter table public.estoque_entrada_itens enable row level security;
create policy "authenticated_full_access" on public.estoque_entrada_itens for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.estoque_entrada_itens to authenticated;
