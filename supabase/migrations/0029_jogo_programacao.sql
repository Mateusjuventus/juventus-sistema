-- Programação de jogo (Concentração e Dia de Jogo) — cronograma editável por jogo, usado pelos
-- pôsteres CONCENTRAÇÃO e DIA DE JOGO (ver
-- docs/superpowers/specs/2026-07-17-posters-relacionados-programacao-design.md).
-- Aplicar via SQL editor do painel Supabase, depois de 0001 a 0028.

-- 3 campos novos em jogos, todos opcionais (exceto concentracao_regras, que já nasce preenchida
-- com o texto padrão de regras usado hoje pelo Mateus, editável por jogo depois).
alter table public.jogos
  add column if not exists concentracao_data date,
  add column if not exists concentracao_regras text not null default $$Obrigatório utilização do uniforme de concentração;
Cumprir os horários definidos na programação;
Após a entrada na concentração é proibida a saída;
Proibido som alto na concentração;
Encerramento dos jogos e sala de tv às 22h;$$,
  add column if not exists dia_jogo_liberacao text;

-- Uma linha por item de cronograma (horário + atividade + local), pertencente a um jogo e
-- marcada como 'concentracao' ou 'dia_jogo' — as duas seções guardam linhas na mesma tabela,
-- diferenciadas pelo `tipo`. `horario` é texto livre (não um `time` do Postgres) porque o
-- exemplo de Dia de Jogo tem uma linha "7:00 às 7:45" — um intervalo, não um horário único.
-- `eh_confronto`: quando true, o pôster ignora `atividade` e preenche sozinho o texto do
-- confronto (ex: "JUVENTUS X FERROVIÁRIA") a partir do adversário/mandante do jogo — evita
-- digitar o nome do adversário de novo e qualquer ambiguidade de "palavra mágica" no texto.
create table if not exists public.jogo_programacao_itens (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogos(id) on delete cascade,
  tipo text not null check (tipo in ('concentracao', 'dia_jogo')),
  ordem integer not null default 0,
  horario text not null,
  atividade text not null,
  local text not null,
  eh_confronto boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists jogo_programacao_itens_jogo_id_idx on public.jogo_programacao_itens (jogo_id);

alter table public.jogo_programacao_itens enable row level security;
create policy "authenticated_full_access" on public.jogo_programacao_itens for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.jogo_programacao_itens to authenticated;
