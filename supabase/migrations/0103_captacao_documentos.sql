-- Documentos obrigatórios da inscrição de Captação (ver spec docs/superpowers/specs/
-- 2026-09-11-captacao-documentos-termo-auto-cadastro-design.md, seção 2) — RG do atleta, RG do(s)
-- responsável(is), Declaração escolar, Atestado médico e Eletrocardiograma com laudo. Diferente de
-- `atleta_documentos` (nome livre, lista aberta), aqui a lista é fixa e conhecida — por isso "tipo"
-- é um enum fechado (check constraint) em vez de texto livre, e cada tipo só pode aparecer uma vez
-- por candidato (unique), o que também permite reenviar/substituir um arquivo enviado errado antes
-- da aprovação. A foto do candidato NÃO entra aqui — continua em `captacao_base.foto_path`, bucket
-- `entity-photos` (mecanismo que já existe, só passa a ser acionado pelo formulário público também).
--
-- Aplicar via SQL editor do painel Supabase, depois de 0102.

create table public.captacao_documentos (
  id uuid primary key default gen_random_uuid(),
  captacao_id uuid not null references public.captacao_base(id) on delete cascade,
  tipo text not null check (tipo in (
    'rg_atleta', 'rg_responsavel', 'declaracao_escolar', 'atestado_medico', 'eletrocardiograma'
  )),
  arquivo_path text not null,
  created_at timestamptz not null default now(),
  unique (captacao_id, tipo)
);

-- RLS

alter table public.captacao_documentos enable row level security;

create policy "authenticated_full_access" on public.captacao_documentos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Grants

grant select, insert, update, delete on public.captacao_documentos to authenticated;

-- Storage: bucket privado novo pros documentos da inscrição.
-- Convenção de path: captacao-documentos/<captacao_id>/<tipo>.<ext> — um arquivo por tipo (upsert),
-- ao contrário de `atleta-documentos` (um id novo por arquivo, sempre acumulando).
--
-- A inscrição pública grava por baixo do cliente admin (service_role, mesmo padrão de
-- `inscreverCaptacao`), que ignora RLS — por isso as políticas abaixo só precisam cobrir o acesso
-- do staff autenticado (tela interna de Captação), igual às dos outros buckets de documento.

insert into storage.buckets (id, name, public)
values ('captacao-documentos', 'captacao-documentos', false)
on conflict (id) do nothing;

create policy "authenticated_read_captacao_documentos" on storage.objects
  for select using (bucket_id = 'captacao-documentos' and auth.role() = 'authenticated');

create policy "authenticated_insert_captacao_documentos" on storage.objects
  for insert with check (bucket_id = 'captacao-documentos' and auth.role() = 'authenticated');

create policy "authenticated_update_captacao_documentos" on storage.objects
  for update using (bucket_id = 'captacao-documentos' and auth.role() = 'authenticated');

create policy "authenticated_delete_captacao_documentos" on storage.objects
  for delete using (bucket_id = 'captacao-documentos' and auth.role() = 'authenticated');
