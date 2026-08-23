-- Organograma do Futebol de Base (ver docs/superpowers/specs/2026-08-23-organograma-base-design.md).
--
-- Estrutura PRÓPRIA, separada de `comissao_tecnica_base`: aquela tabela é organizada por categoria
-- (uma pessoa pode ter várias `categorias`), enquanto o organograma agrupa por área ("Head de X"),
-- com vagas em aberto (caixa sem pessoa) e cargos (Presidente, Diretor) que não são comissão técnica
-- de categoria nenhuma. Cada caixa PODE se vincular a uma pessoa já cadastrada (nome/função ficam
-- sempre vivos, buscados de lá) ou usar nome/cargo digitados direto na caixa.
create table public.organograma_base (
  id uuid primary key default gen_random_uuid(),
  comissao_tecnica_base_id uuid references public.comissao_tecnica_base(id) on delete set null,
  -- Usados só quando NÃO há pessoa vinculada (comissao_tecnica_base_id nulo) — com pessoa vinculada,
  -- a tela sempre exibe nome/função de lá, não estes campos.
  nome text,
  cargo text,
  -- Rótulo do cabeçalho da coluna (ex. "Head de Goleiros"); null = caixa de liderança, sem coluna.
  grupo text,
  -- A quem esta caixa reporta. Raiz do organograma = null. `set null` (não cascade) porque apagar
  -- uma caixa não pode apagar quem reporta pra ela em cascata — a tela avisa antes e a pessoa fica
  -- "solta" (sem líder direto) até ser reconectada.
  reporta_para uuid references public.organograma_base(id) on delete set null,
  ordem integer not null default 0,
  -- Posição arrastada pelo usuário; null = a tela calcula um layout automático por hierarquia/grupo.
  pos_x integer,
  pos_y integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organograma_base_set_updated_at
  before update on public.organograma_base
  for each row execute function set_updated_at();

create index organograma_base_reporta_para_idx on public.organograma_base (reporta_para);
create index organograma_base_comissao_idx on public.organograma_base (comissao_tecnica_base_id);

alter table public.organograma_base enable row level security;

create policy "authenticated_full_access" on public.organograma_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.organograma_base to authenticated;
