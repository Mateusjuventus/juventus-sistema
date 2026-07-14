-- Configurações do módulo Financeiro: as duas assinaturas (nome + cargo) que aparecem nos PDFs
-- (Orçamento Previsto e Relatório Geral de Prestação de Contas). Tabela singleton — sempre uma
-- linha só, editável pela tela /financeiro/configuracoes. Aplicar via SQL editor do painel
-- Supabase, depois de 0001 a 0009.

create table public.configuracoes_financeiro (
  id uuid primary key default gen_random_uuid(),
  assinatura1_nome text not null default 'Mateus dos Santos',
  assinatura1_cargo text not null default 'Supervisor de Futebol',
  assinatura2_nome text not null default 'Pedro Machado',
  assinatura2_cargo text not null default 'Gerente de Futebol',
  updated_at timestamptz not null default now()
);

create trigger configuracoes_financeiro_set_updated_at
  before update on public.configuracoes_financeiro
  for each row execute function set_updated_at();

-- Seed: garante que sempre exista a linha singleton com os valores padrão.
insert into public.configuracoes_financeiro (assinatura1_nome, assinatura1_cargo, assinatura2_nome, assinatura2_cargo)
values ('Mateus dos Santos', 'Supervisor de Futebol', 'Pedro Machado', 'Gerente de Futebol');

alter table public.configuracoes_financeiro enable row level security;

create policy "authenticated_full_access" on public.configuracoes_financeiro
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.configuracoes_financeiro to authenticated;
