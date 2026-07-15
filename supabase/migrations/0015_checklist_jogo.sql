-- Checklist de preparação de jogo — itens fixos (a lista muda se o jogo é em casa ou fora), com
-- status concluído/pendente e prazo opcional por item, pra acompanhar o progresso de preparação
-- de cada jogo. Os itens são criados automaticamente (a partir de um modelo fixo no código) na
-- primeira vez que a aba "Checklist" do jogo é aberta — não precisa cadastrar nada aqui.
-- Aplicar via SQL editor do painel Supabase, depois de 0001 a 0014.

create table public.checklist_jogo_itens (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogos(id) on delete cascade,
  item text not null,
  concluido boolean not null default false,
  prazo date,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index checklist_jogo_itens_jogo_id_idx on public.checklist_jogo_itens (jogo_id);

alter table public.checklist_jogo_itens enable row level security;
create policy "authenticated_full_access" on public.checklist_jogo_itens for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.checklist_jogo_itens to authenticated;
