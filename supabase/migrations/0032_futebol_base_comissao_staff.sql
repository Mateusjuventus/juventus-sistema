-- Fase 2 do Futebol de Base (ver docs/superpowers/specs/2026-07-20-futebol-de-base-design.md):
-- módulos Comissão Técnica e Staff Operacional, incluindo o autocadastro público deste último.

-- 1) `comissao_tecnica_base` — mesmos campos de `comissao_tecnica` (nome completo, apelido, rg,
--    cpf, data de nascimento, função, telefone, e-mail, foto, tipo de quarto preferido), mais
--    `categoria` (mesmo enum de 7 valores usado em `atletas_base`). Mesmo padrão de cards por
--    categoria do módulo Atletas.
create table public.comissao_tecnica_base (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('sub20', 'sub17', 'sub15', 'sub14', 'sub13', 'sub12', 'sub11')),
  nome_completo text not null,
  apelido text,
  rg text not null,
  cpf text not null,
  data_nascimento date not null,
  funcao text not null,
  telefone text,
  email text,
  foto_path text,
  tipo_quarto_preferido text check (tipo_quarto_preferido in ('single', 'duplo')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comissao_tecnica_base_cpf_unique unique (cpf),
  constraint comissao_tecnica_base_rg_unique unique (rg),
  constraint comissao_tecnica_base_cpf_format check (cpf ~ '^\d{11}$')
);

create trigger comissao_tecnica_base_set_updated_at
  before update on public.comissao_tecnica_base
  for each row execute function set_updated_at();

create index comissao_tecnica_base_categoria_idx on public.comissao_tecnica_base (categoria);

-- 2) `staff_operacional_base` — mesmos campos de `staff_operacional` (endereço, chave PIX, valor
--    padrão de pagamento, ativo/inativo, foto), SEM categoria (lista única, compartilhada entre
--    todas as categorias de base — ver a spec). `funcao_id` referencia o MESMO catálogo
--    `staff_funcoes_catalogo` do Futebol Profissional (são só nomes de função, ex: "Fisioterapeuta",
--    "Roupeiro" — não há motivo pra duplicar o catálogo).
create table public.staff_operacional_base (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null,
  rg text not null,
  cpf text not null,
  data_nascimento date not null,
  funcao_id uuid not null references public.staff_funcoes_catalogo(id),
  telefone text,
  chave_pix text,
  chave_pix_tipo text check (chave_pix_tipo in ('cpf', 'cnpj', 'email', 'telefone')),
  valor_padrao_pagamento numeric(10, 2),
  email text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  ativo boolean not null default true,
  foto_path text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_operacional_base_cpf_unique unique (cpf),
  constraint staff_operacional_base_rg_unique unique (rg),
  constraint staff_operacional_base_cpf_format check (cpf ~ '^\d{11}$')
);

create trigger staff_operacional_base_set_updated_at
  before update on public.staff_operacional_base
  for each row execute function set_updated_at();

create index staff_operacional_base_nome_idx on public.staff_operacional_base using gin (to_tsvector('portuguese', nome_completo));

-- 3) `configuracoes_cadastro_staff_base` — liga/desliga o link público de autocadastro de Staff
--    Operacional (Base) em /cadastro-staff-base, totalmente independente do toggle do Profissional
--    (0012_configuracao_cadastro_staff.sql). Mesmo formato: tabela singleton, editável só por quem
--    está logado; a página pública só LÊ esse valor via service_role key.
create table public.configuracoes_cadastro_staff_base (
  id uuid primary key default gen_random_uuid(),
  cadastro_publico_ativo boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger configuracoes_cadastro_staff_base_set_updated_at
  before update on public.configuracoes_cadastro_staff_base
  for each row execute function set_updated_at();

insert into public.configuracoes_cadastro_staff_base (cadastro_publico_ativo) values (true);

alter table public.comissao_tecnica_base enable row level security;
create policy "authenticated_full_access" on public.comissao_tecnica_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.comissao_tecnica_base to authenticated;

alter table public.staff_operacional_base enable row level security;
create policy "authenticated_full_access" on public.staff_operacional_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.staff_operacional_base to authenticated;

alter table public.configuracoes_cadastro_staff_base enable row level security;
create policy "authenticated_full_access" on public.configuracoes_cadastro_staff_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.configuracoes_cadastro_staff_base to authenticated;
