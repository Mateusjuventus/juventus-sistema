-- Assinatura desenhada/anexada, salva por conta (ver spec docs/superpowers/specs/
-- 2026-09-13-assinatura-desenhada-design.md) — substitui a assinatura por senha (registro só de
-- texto: nome/cargo/data) por uma assinatura de verdade, desenhada na tela ou anexada como imagem,
-- salva na conta de cada pessoa e reaproveitada em qualquer documento.
--
-- `perfis.assinatura_path` guarda a assinatura ATUAL da conta (a mais recente). `assinaturas_
-- documento.assinatura_path` guarda o caminho que valia NO MOMENTO daquela assinatura específica —
-- nunca é sobrescrito depois, mesmo que a pessoa troque a assinatura salva (mesmo princípio dos
-- snapshots `nome_no_momento`/`cargo_no_momento` que já existem). É por isso que o bucket abaixo
-- nunca reaproveita o mesmo arquivo entre uma troca e outra — cada assinatura salva gera um caminho
-- novo.
--
-- Aplicar via SQL editor do painel Supabase, depois de 0103.

alter table public.perfis add column if not exists assinatura_path text;
alter table public.assinaturas_documento add column if not exists assinatura_path text;

-- Storage: bucket privado novo pras imagens de assinatura.
-- Convenção de path: assinaturas/<usuario_id>/<assinatura_id>.<ext> — um arquivo novo a cada vez
-- que a pessoa salva (nunca upsert no mesmo nome), pra sustentar o snapshot explicado acima.

insert into storage.buckets (id, name, public)
values ('assinaturas', 'assinaturas', false)
on conflict (id) do nothing;

create policy "authenticated_read_assinaturas" on storage.objects
  for select using (bucket_id = 'assinaturas' and auth.role() = 'authenticated');

create policy "authenticated_insert_assinaturas" on storage.objects
  for insert with check (bucket_id = 'assinaturas' and auth.role() = 'authenticated');

create policy "authenticated_update_assinaturas" on storage.objects
  for update using (bucket_id = 'assinaturas' and auth.role() = 'authenticated');

create policy "authenticated_delete_assinaturas" on storage.objects
  for delete using (bucket_id = 'assinaturas' and auth.role() = 'authenticated');
