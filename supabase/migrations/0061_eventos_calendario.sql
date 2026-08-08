-- Eventos manuais do widget "Calendário" da tela de Início do Futebol Profissional (ver
-- docs/superpowers/specs/2026-08-07-redesign-visual-painel-financeiro-design.md). Os jogos
-- (tabela `jogos`) já aparecem no calendário automaticamente — esta tabela é só pros eventos que a
-- pessoa cadastra manualmente (treino, viagem, reunião, prazo administrativo, outro). Sem coluna
-- de departamento: a tela que lê/escreve aqui é só `/profissional` por enquanto (ver "Fora de
-- escopo" na spec).
create table public.eventos_calendario (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('treino', 'viagem', 'reuniao', 'prazo', 'outro')),
  titulo text not null,
  data date not null,
  horario time,
  observacao text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.eventos_calendario enable row level security;
create policy "authenticated_full_access" on public.eventos_calendario for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.eventos_calendario to authenticated;

-- A tela de Início lê essa tabela num Server Component com a sessão normal do usuário logado (não
-- usa o cliente admin) — mas o grant pro service_role entra de qualquer forma, seguindo a mesma
-- regra que já pegou o cadastro público de Staff Base (ver 0060_grants_service_role_staff_base.sql):
-- mais barato conceder de uma vez do que descobrir de novo depois que algo que hoje só usa a
-- sessão normal passa a precisar do cliente admin.
grant select, insert, update, delete on public.eventos_calendario to service_role;
