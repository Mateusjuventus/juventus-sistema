-- E-mails
alter table public.atletas add column if not exists email text;

alter table public.atletas_base add column if not exists email text;
alter table public.atletas_base add column if not exists email_pai text;
alter table public.atletas_base add column if not exists email_mae text;

-- Endereço de origem — mesmo formato do endereço estruturado já existente (cep/logradouro/numero/
-- complemento/bairro/cidade/uf), com prefixo "origem_" pra não colidir com as colunas do endereço
-- atual.
alter table public.atletas add column if not exists origem_cep text;
alter table public.atletas add column if not exists origem_logradouro text;
alter table public.atletas add column if not exists origem_numero text;
alter table public.atletas add column if not exists origem_complemento text;
alter table public.atletas add column if not exists origem_bairro text;
alter table public.atletas add column if not exists origem_cidade text;
alter table public.atletas add column if not exists origem_uf text;

alter table public.atletas_base add column if not exists origem_cep text;
alter table public.atletas_base add column if not exists origem_logradouro text;
alter table public.atletas_base add column if not exists origem_numero text;
alter table public.atletas_base add column if not exists origem_complemento text;
alter table public.atletas_base add column if not exists origem_bairro text;
alter table public.atletas_base add column if not exists origem_cidade text;
alter table public.atletas_base add column if not exists origem_uf text;

-- Contatos de emergência — lista (zero ou mais) por atleta, mesmo espírito de `atleta_documentos`
-- (tabela filha simples, sem upload de arquivo aqui).
create table public.atleta_contatos_emergencia (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  nome text not null,
  parentesco text,
  contato text,
  created_at timestamptz not null default now()
);

create index atleta_contatos_emergencia_atleta_id_idx
  on public.atleta_contatos_emergencia (atleta_id);

alter table public.atleta_contatos_emergencia enable row level security;

create policy "authenticated_full_access" on public.atleta_contatos_emergencia
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atleta_contatos_emergencia to authenticated;

create table public.atleta_base_contatos_emergencia (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas_base(id) on delete cascade,
  nome text not null,
  parentesco text,
  contato text,
  created_at timestamptz not null default now()
);

create index atleta_base_contatos_emergencia_atleta_id_idx
  on public.atleta_base_contatos_emergencia (atleta_id);

alter table public.atleta_base_contatos_emergencia enable row level security;

create policy "authenticated_full_access" on public.atleta_base_contatos_emergencia
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atleta_base_contatos_emergencia to authenticated;

notify pgrst, 'reload schema';
