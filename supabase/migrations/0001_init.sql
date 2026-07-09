-- Fundação de Cadastros + Controle de Elenco
-- Cria as 4 tabelas base (Atletas, Comissão Técnica/Diretoria, Staff Operacional, Jogos),
-- triggers de updated_at, RLS e buckets de storage privados para fotos.
-- Aplicar via SQL editor do painel Supabase (Project → SQL Editor → New query → colar e rodar).

create extension if not exists pgcrypto; -- necessário para gen_random_uuid()

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =========================================================
-- ATLETAS
-- =========================================================
create table public.atletas (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null,
  rg text not null,
  cpf text not null,
  data_nascimento date not null,
  posicao text not null,
  numero_camisa integer,
  pe_dominante text check (pe_dominante in ('destro', 'canhoto', 'ambidestro')),
  telefone text,
  cidade_natal text,
  uf_natal char(2),
  endereco_atual text,
  data_inicio_clube date,
  empresario_nome text,
  foto_path text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atletas_cpf_unique unique (cpf),
  constraint atletas_rg_unique unique (rg),
  constraint atletas_cpf_format check (cpf ~ '^\d{11}$')
);

create trigger atletas_set_updated_at
  before update on public.atletas
  for each row execute function set_updated_at();

create index atletas_nome_idx on public.atletas using gin (to_tsvector('portuguese', nome_completo));

-- =========================================================
-- COMISSÃO TÉCNICA / DIRETORIA
-- =========================================================
create table public.comissao_tecnica (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null,
  rg text not null,
  cpf text not null,
  data_nascimento date not null,
  funcao text not null, -- texto livre; sugestões (técnico, prep. físico, médico, presidente etc.) ficam na camada de app
  telefone text,
  email text,
  foto_path text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comissao_cpf_unique unique (cpf),
  constraint comissao_rg_unique unique (rg),
  constraint comissao_cpf_format check (cpf ~ '^\d{11}$')
);

create trigger comissao_set_updated_at
  before update on public.comissao_tecnica
  for each row execute function set_updated_at();

create index comissao_nome_idx on public.comissao_tecnica using gin (to_tsvector('portuguese', nome_completo));

-- =========================================================
-- STAFF OPERACIONAL
-- =========================================================
create table public.staff_operacional (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null,
  rg text not null,
  cpf text not null,
  data_nascimento date not null,
  funcao_setor text not null, -- texto livre; sugestões (segurança, gandula, maqueiro etc.) ficam na camada de app
  telefone text,
  chave_pix text,
  valor_padrao_pagamento numeric(10, 2),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_cpf_unique unique (cpf),
  constraint staff_rg_unique unique (rg),
  constraint staff_cpf_format check (cpf ~ '^\d{11}$')
);

create trigger staff_set_updated_at
  before update on public.staff_operacional
  for each row execute function set_updated_at();

create index staff_nome_idx on public.staff_operacional using gin (to_tsvector('portuguese', nome_completo));
-- Módulo futuro (Operação de Jogo) vai adicionar uma tabela de vínculo, ex:
-- jogo_staff(jogo_id references jogos(id), staff_id references staff_operacional(id), valor_pago, ...)
-- Não criada nesta fase.

-- =========================================================
-- JOGOS / COMPETIÇÕES
-- =========================================================
create table public.jogos (
  id uuid primary key default gen_random_uuid(),
  competicao text not null,
  rodada_fase text,
  adversario_nome text not null,
  adversario_logo_path text,
  data_jogo date not null,
  horario time,
  local_estadio text,
  endereco text,
  mandante boolean not null, -- true = jogo em casa, false = jogo fora
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger jogos_set_updated_at
  before update on public.jogos
  for each row execute function set_updated_at();

create index jogos_data_idx on public.jogos (data_jogo desc);
create index jogos_adversario_idx on public.jogos using gin (to_tsvector('portuguese', adversario_nome));
-- Módulos futuros (Logística, Operação de Jogo, Prestação de Contas) vão referenciar jogos.id como FK.

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.atletas enable row level security;
alter table public.comissao_tecnica enable row level security;
alter table public.staff_operacional enable row level security;
alter table public.jogos enable row level security;

create policy "authenticated_full_access" on public.atletas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_full_access" on public.comissao_tecnica
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_full_access" on public.staff_operacional
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_full_access" on public.jogos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- =========================================================
-- STORAGE (bucket privado único para fotos/logos)
-- =========================================================
insert into storage.buckets (id, name, public)
values ('entity-photos', 'entity-photos', false)
on conflict (id) do nothing;

create policy "authenticated_read_entity_photos" on storage.objects
  for select using (bucket_id = 'entity-photos' and auth.role() = 'authenticated');

create policy "authenticated_insert_entity_photos" on storage.objects
  for insert with check (bucket_id = 'entity-photos' and auth.role() = 'authenticated');

create policy "authenticated_update_entity_photos" on storage.objects
  for update using (bucket_id = 'entity-photos' and auth.role() = 'authenticated');

create policy "authenticated_delete_entity_photos" on storage.objects
  for delete using (bucket_id = 'entity-photos' and auth.role() = 'authenticated');

-- Convenção de path dentro do bucket:
--   atletas/<atleta_id>/<arquivo>
--   comissao/<comissao_id>/<arquivo>
--   jogos/<jogo_id>/adversario-logo.<ext>
-- Nunca usar URL pública — sempre gerar signed URL no servidor ao exibir.
