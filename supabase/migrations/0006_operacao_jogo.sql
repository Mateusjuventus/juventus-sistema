-- Operação de Jogo: placar (pra dashboard de resultados) e recibos de pagamento por jogo.
-- Aplicar via SQL editor do painel Supabase, depois de 0001 a 0005.

-- =========================================================
-- JOGOS: placar
-- =========================================================
alter table public.jogos add column gols_pro integer;
alter table public.jogos add column gols_contra integer;

-- =========================================================
-- RECIBOS DE PAGAMENTO (Comissão Técnica/Diretoria e Staff Operacional convocados)
-- =========================================================
create table public.recibos_jogo (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogos(id) on delete cascade,
  pessoa_tipo text not null check (pessoa_tipo in ('comissao', 'staff')),
  pessoa_id uuid not null,
  funcao_jogo text,
  valor numeric(10,2),
  pago boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recibos_jogo_unique unique (jogo_id, pessoa_tipo, pessoa_id)
);

create trigger recibos_jogo_set_updated_at
  before update on public.recibos_jogo
  for each row execute function set_updated_at();

alter table public.recibos_jogo enable row level security;

create policy "authenticated_full_access" on public.recibos_jogo
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.recibos_jogo to authenticated;
