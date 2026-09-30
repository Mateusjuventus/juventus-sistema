-- Histórico anterior ao sistema (Fisioterapia) — texto livre importado do relatório em papel que o
-- Mateus já tinha (Copa Paulista 2026, 19/06 a 23/09/2026), ver docs/superpowers/specs/
-- 2026-09-30-fisioterapia-design.md e lib/supabase/types.ts. Não são lesões/queixas/atendimentos
-- estruturados: o relatório em papel só tinha totais e listas de queixas em texto, sem data exata
-- de cada evento — por isso vira um resumo de referência, em vez de fabricar datas que não existem.
-- Dados novos, a partir de agora, sempre entram pelas 3 tabelas estruturadas normais
-- (0111_fisioterapia.sql). `atleta_id` nulo = resumo GERAL do período (agregados do departamento,
-- não de um atleta específico) — usado pelo Relatório Geral.
create table public.fisioterapia_historico_importado (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid references public.atletas(id) on delete cascade,
  titulo text not null,
  resumo text not null,
  created_by uuid references public.perfis(id),
  created_at timestamptz not null default now()
);

create index fisioterapia_historico_importado_atleta_id_idx
  on public.fisioterapia_historico_importado (atleta_id);

alter table public.fisioterapia_historico_importado enable row level security;

create policy "authenticated_full_access" on public.fisioterapia_historico_importado
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.fisioterapia_historico_importado to authenticated;

notify pgrst, 'reload schema';
