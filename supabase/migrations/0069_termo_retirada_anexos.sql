-- Anexos do Termo de Retirada (ver docs/superpowers/specs/2026-08-11-termos-retirada-design.md).
--
-- O sistema não assina documento digitalmente: o fluxo é gerar o PDF, imprimir, assinar e guardar
-- o documento assinado de volta no termo. Daí o anexo — é o que dá valor probatório ao registro.
-- Tabela (e não uma coluna só) porque um termo costuma acumular mais de um arquivo: o termo
-- assinado da retirada, o comprovante da devolução assinado depois, foto do material, etc.

create table public.termo_retirada_anexos (
  id uuid primary key default gen_random_uuid(),
  termo_id uuid not null references public.termos_retirada(id) on delete cascade,
  tipo text not null default 'assinado' check (tipo in ('assinado', 'devolucao', 'outro')),
  nome text not null,
  arquivo_path text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index termo_retirada_anexos_termo_idx on public.termo_retirada_anexos (termo_id, created_at);

alter table public.termo_retirada_anexos enable row level security;

create policy "authenticated_full_access" on public.termo_retirada_anexos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.termo_retirada_anexos to authenticated;

-- Storage: bucket privado próprio (mesmo padrão de 0054 e 0063).
-- Convenção de path: termo-documentos/<anexo_id>/arquivo.<ext>

insert into storage.buckets (id, name, public)
values ('termo-documentos', 'termo-documentos', false)
on conflict (id) do nothing;

create policy "authenticated_read_termo_documentos" on storage.objects
  for select using (bucket_id = 'termo-documentos' and auth.role() = 'authenticated');

create policy "authenticated_insert_termo_documentos" on storage.objects
  for insert with check (bucket_id = 'termo-documentos' and auth.role() = 'authenticated');

create policy "authenticated_update_termo_documentos" on storage.objects
  for update using (bucket_id = 'termo-documentos' and auth.role() = 'authenticated');

create policy "authenticated_delete_termo_documentos" on storage.objects
  for delete using (bucket_id = 'termo-documentos' and auth.role() = 'authenticated');
