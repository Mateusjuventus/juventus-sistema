-- Assinatura digital das Solicitações (ver docs/superpowers/specs/2026-08-28-assinatura-digital-
-- notificacoes-design.md, Fase 2) — 2 assinantes: Solicitante (quem cria, auto-assina o próprio
-- papel na hora) e Encarregado do Departamento (pessoa configurada aqui, mesmo espírito das 2
-- assinaturas fixas do Financeiro). Uma tabela de configuração por departamento, espelhando
-- configuracoes_financeiro/configuracoes_financeiro_base — Solicitações Profissional e de Base já
-- são tabelas totalmente separadas (solicitacoes/solicitacoes_base), então o Encarregado de cada
-- uma também é configurado à parte.

create table public.configuracoes_solicitacoes (
  id uuid primary key default gen_random_uuid(),
  encarregado_nome text not null default '',
  encarregado_cargo text not null default '',
  encarregado_usuario_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.configuracoes_solicitacoes_base (
  id uuid primary key default gen_random_uuid(),
  encarregado_nome text not null default '',
  encarregado_cargo text not null default '',
  encarregado_usuario_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.configuracoes_solicitacoes enable row level security;
create policy "authenticated_full_access" on public.configuracoes_solicitacoes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.configuracoes_solicitacoes to authenticated;

alter table public.configuracoes_solicitacoes_base enable row level security;
create policy "authenticated_full_access" on public.configuracoes_solicitacoes_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.configuracoes_solicitacoes_base to authenticated;

-- Semeia a linha singleton de cada uma (mesmo padrão de configuracoes_financeiro) — a tela de
-- configuração sempre espera achar (no máximo) uma linha.
insert into public.configuracoes_solicitacoes (encarregado_nome, encarregado_cargo)
values ('', '');
insert into public.configuracoes_solicitacoes_base (encarregado_nome, encarregado_cargo)
values ('', '');
