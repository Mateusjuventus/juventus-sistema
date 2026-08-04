-- Estatísticas do Atleta (item 3 da sequência combinada) — aba "Documentação". Cria a tabela de
-- documentos anexados ao atleta (só nome + arquivo, sem categoria/validade, ver spec
-- docs/superpowers/specs/2026-08-04-estatisticas-atleta-design.md) e um bucket novo e privado no
-- Storage, separado do `entity-photos` (que é só pra fotos de perfil/logo com upsert por nome
-- fixo — aqui cada documento é um arquivo independente, não substitui o anterior).
--
-- Nada de tabela nova pra estatísticas de jogo (participação/gols/cartões/minutagem) — são sempre
-- calculadas na hora a partir de convocacao_atletas e sumula_eventos, sem cache.

create table public.atleta_documentos (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  nome text not null,
  arquivo_path text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.atleta_documentos_base (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas_base(id) on delete cascade,
  nome text not null,
  arquivo_path text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- RLS

alter table public.atleta_documentos enable row level security;
alter table public.atleta_documentos_base enable row level security;

create policy "authenticated_full_access" on public.atleta_documentos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_full_access" on public.atleta_documentos_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Grants

grant select, insert, update, delete on public.atleta_documentos to authenticated;
grant select, insert, update, delete on public.atleta_documentos_base to authenticated;

-- Storage: bucket privado novo pra documentos de atleta.
-- Convenção de path: atleta-documentos/<atleta_documento_id>/<arquivo-original>

insert into storage.buckets (id, name, public)
values ('atleta-documentos', 'atleta-documentos', false)
on conflict (id) do nothing;

create policy "authenticated_read_atleta_documentos" on storage.objects
  for select using (bucket_id = 'atleta-documentos' and auth.role() = 'authenticated');

create policy "authenticated_insert_atleta_documentos" on storage.objects
  for insert with check (bucket_id = 'atleta-documentos' and auth.role() = 'authenticated');

create policy "authenticated_update_atleta_documentos" on storage.objects
  for update using (bucket_id = 'atleta-documentos' and auth.role() = 'authenticated');

create policy "authenticated_delete_atleta_documentos" on storage.objects
  for delete using (bucket_id = 'atleta-documentos' and auth.role() = 'authenticated');
