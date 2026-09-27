-- Rede de segurança: garante que a tabela/constraint/bucket de `captacao_documentos` (migração
-- 0103) existem de fato, sem erro se 0103 já tiver rodado certinho — tudo aqui é "if not exists" /
-- "on conflict do nothing" / recria a política do zero. Motivado por um relato do Mateus em 27/09:
-- a inscrição pública travando com "Não foi possível registrar o documento 'Cópia do RG do
-- atleta'" — o upload do arquivo pro Storage tinha dado certo, só o registro na tabela falhou. A
-- hipótese mais provável é 0103 não ter sido aplicada (ou ter sido aplicada só em parte) no banco
-- de produção. Seguro rodar mesmo que 0103 já esteja em dia.
--
-- Aplicar via SQL editor do painel Supabase.

create table if not exists public.captacao_documentos (
  id uuid primary key default gen_random_uuid(),
  captacao_id uuid not null references public.captacao_base(id) on delete cascade,
  tipo text not null check (tipo in (
    'rg_atleta', 'rg_responsavel', 'declaracao_escolar', 'atestado_medico', 'eletrocardiograma'
  )),
  arquivo_path text not null,
  created_at timestamptz not null default now(),
  unique (captacao_id, tipo)
);

alter table public.captacao_documentos enable row level security;

drop policy if exists "authenticated_full_access" on public.captacao_documentos;
create policy "authenticated_full_access" on public.captacao_documentos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.captacao_documentos to authenticated;

insert into storage.buckets (id, name, public)
values ('captacao-documentos', 'captacao-documentos', false)
on conflict (id) do nothing;

drop policy if exists "authenticated_read_captacao_documentos" on storage.objects;
create policy "authenticated_read_captacao_documentos" on storage.objects
  for select using (bucket_id = 'captacao-documentos' and auth.role() = 'authenticated');

drop policy if exists "authenticated_insert_captacao_documentos" on storage.objects;
create policy "authenticated_insert_captacao_documentos" on storage.objects
  for insert with check (bucket_id = 'captacao-documentos' and auth.role() = 'authenticated');

drop policy if exists "authenticated_update_captacao_documentos" on storage.objects;
create policy "authenticated_update_captacao_documentos" on storage.objects
  for update using (bucket_id = 'captacao-documentos' and auth.role() = 'authenticated');

drop policy if exists "authenticated_delete_captacao_documentos" on storage.objects;
create policy "authenticated_delete_captacao_documentos" on storage.objects
  for delete using (bucket_id = 'captacao-documentos' and auth.role() = 'authenticated');

notify pgrst, 'reload schema';
