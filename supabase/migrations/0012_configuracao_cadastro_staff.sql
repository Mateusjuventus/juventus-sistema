-- Liga/desliga o link público de autocadastro de Staff Operacional (/cadastro-staff). Tabela
-- singleton (sempre uma linha só), editável só por quem está logado no sistema — a página pública
-- só consegue LER esse valor (via service_role key, sem RLS), nunca alterar. Aplicar via SQL editor
-- do painel Supabase, depois de 0001 a 0011.

create table public.configuracoes_cadastro_staff (
  id uuid primary key default gen_random_uuid(),
  cadastro_publico_ativo boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger configuracoes_cadastro_staff_set_updated_at
  before update on public.configuracoes_cadastro_staff
  for each row execute function set_updated_at();

insert into public.configuracoes_cadastro_staff (cadastro_publico_ativo) values (true);

alter table public.configuracoes_cadastro_staff enable row level security;

create policy "authenticated_full_access" on public.configuracoes_cadastro_staff
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.configuracoes_cadastro_staff to authenticated;
