-- Anotações do atleta (Profissional) — histórico de texto livre, nunca editado, só criado/apagado.
-- Mesmo espírito de `atleta_contratos`: tabela de histórico própria, sem mexer no atleta principal.
-- Ver docs/superpowers/specs/2026-10-27-ficha-atleta-dossie-anotacoes-design.md.
create table public.atleta_anotacoes (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  texto text not null,
  criado_por_perfil_id uuid references public.perfis(id) on delete set null,
  -- Nome capturado no momento da criação (mesmo padrão de `criado_por_nome` em `atleta_contratos`) —
  -- continua legível mesmo se o perfil for removido depois. Nullable como lá: `nomeDaContaAtual`
  -- pode devolver `null` no caso raro de não achar nem nome nem e-mail.
  criado_por_nome text,
  created_at timestamptz not null default now()
);

create index atleta_anotacoes_atleta_id_idx on public.atleta_anotacoes (atleta_id);

alter table public.atleta_anotacoes enable row level security;

create policy "authenticated_full_access" on public.atleta_anotacoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atleta_anotacoes to authenticated;

-- Mesma tabela, espelhada pra Base.
create table public.atleta_base_anotacoes (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas_base(id) on delete cascade,
  texto text not null,
  criado_por_perfil_id uuid references public.perfis(id) on delete set null,
  criado_por_nome text,
  created_at timestamptz not null default now()
);

create index atleta_base_anotacoes_atleta_id_idx on public.atleta_base_anotacoes (atleta_id);

alter table public.atleta_base_anotacoes enable row level security;

create policy "authenticated_full_access" on public.atleta_base_anotacoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atleta_base_anotacoes to authenticated;

notify pgrst, 'reload schema';
