-- Comissão Técnica (Profissional e Base): tipo de contrato, data de início, e salário no
-- Profissional (a Base já tem `valor_salario` desde a 0080_financeiro_base.sql). Também cria o
-- link público de auto-cadastro (/cadastro-comissao-tecnica e /cadastro-comissao-tecnica-base),
-- mesmo modelo liga/desliga de `configuracoes_cadastro_staff[_base]`. Ver docs/superpowers/specs/
-- 2026-08-25-comissao-tecnica-cadastro-publico-design.md.

-- 1) Campos novos.
alter table public.comissao_tecnica
  add column if not exists tipo_contrato text,
  add column if not exists data_inicio date,
  add column if not exists valor_salario numeric(10, 2);

alter table public.comissao_tecnica
  add constraint comissao_tecnica_tipo_contrato_check
  check (tipo_contrato is null or tipo_contrato in ('clt', 'pj', 'sem_contrato'));

alter table public.comissao_tecnica_base
  add column if not exists tipo_contrato text,
  add column if not exists data_inicio date;

alter table public.comissao_tecnica_base
  add constraint comissao_tecnica_base_tipo_contrato_check
  check (tipo_contrato is null or tipo_contrato in ('clt', 'pj', 'sem_contrato'));

-- 2) Configuração do link público — tabela singleton por departamento, editável só por quem está
--    logado; a página pública só LÊ esse valor via service_role key (ver lib/supabase/admin.ts).
create table public.configuracoes_cadastro_comissao_tecnica (
  id uuid primary key default gen_random_uuid(),
  cadastro_publico_ativo boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger configuracoes_cadastro_comissao_tecnica_set_updated_at
  before update on public.configuracoes_cadastro_comissao_tecnica
  for each row execute function set_updated_at();
insert into public.configuracoes_cadastro_comissao_tecnica (cadastro_publico_ativo) values (false);

create table public.configuracoes_cadastro_comissao_tecnica_base (
  id uuid primary key default gen_random_uuid(),
  cadastro_publico_ativo boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger configuracoes_cadastro_comissao_tecnica_base_set_updated_at
  before update on public.configuracoes_cadastro_comissao_tecnica_base
  for each row execute function set_updated_at();
insert into public.configuracoes_cadastro_comissao_tecnica_base (cadastro_publico_ativo) values (false);

alter table public.configuracoes_cadastro_comissao_tecnica enable row level security;
create policy "authenticated_full_access" on public.configuracoes_cadastro_comissao_tecnica for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.configuracoes_cadastro_comissao_tecnica to authenticated;

alter table public.configuracoes_cadastro_comissao_tecnica_base enable row level security;
create policy "authenticated_full_access" on public.configuracoes_cadastro_comissao_tecnica_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.configuracoes_cadastro_comissao_tecnica_base to authenticated;

-- 3) GRANT explícito pro service_role — sem isso, a página/Server Action pública (sem sessão de
--    usuário, usa o cliente admin) recebe erro de permissão mesmo com RLS permissiva, porque GRANT
--    de tabela é uma camada separada da policy de RLS (mesmo bug já corrigido pro Staff Operacional
--    em 0060_grants_service_role_staff_base.sql — replicando aqui desde já pra não repetir).
grant select, insert, update, delete on public.comissao_tecnica to service_role;
grant select, insert, update, delete on public.comissao_tecnica_base to service_role;
grant select, insert, update, delete on public.configuracoes_cadastro_comissao_tecnica to service_role;
grant select, insert, update, delete on public.configuracoes_cadastro_comissao_tecnica_base to service_role;
