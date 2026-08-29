-- Fase 3 (ver docs/superpowers/specs/2026-08-28-assinatura-digital-notificacoes-design.md) — o
-- papel "Departamento" do Relatório de Dispensa hoje é "qualquer master pode assinar", sem opção
-- de vincular uma pessoa específica (diferente de Financeiro/Solicitações/Parecer, que já têm essa
-- configuração). O Mateus quer poder apontar um Supervisor específico, já que nem sempre é ele
-- quem assina. Singleton simples, mesmo padrão de configuracoes_solicitacoes(_base) — só Base
-- porque a Dispensa é só do Futebol de Base.
create table public.configuracoes_dispensa_base (
  id uuid primary key default gen_random_uuid(),
  departamento_usuario_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.configuracoes_dispensa_base enable row level security;
create policy "authenticated_full_access" on public.configuracoes_dispensa_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.configuracoes_dispensa_base to authenticated;

insert into public.configuracoes_dispensa_base (departamento_usuario_id) values (null);
