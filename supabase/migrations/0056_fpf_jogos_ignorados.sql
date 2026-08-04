-- Complementa 0055_integracao_fpf.sql: a spec (seção "Fluxo: jogos") também prevê ignorar um jogo
-- da FPF na revisão de pendentes, pra ele nunca mais aparecer — faltou a tabela equivalente à
-- `fpf_atletas_ignorados` pro lado de jogos.

create table public.fpf_jogos_ignorados (
  fpf_id_jogo integer primary key,
  descricao text not null,
  ignorado_por uuid references auth.users(id),
  ignorado_em timestamptz not null default now()
);

alter table public.fpf_jogos_ignorados enable row level security;

create policy "authenticated_full_access" on public.fpf_jogos_ignorados
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.fpf_jogos_ignorados to authenticated;
