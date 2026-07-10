-- Módulo Tarefas: lista pessoal de atribuições do usuário, organizada por categoria
-- (Logística, Registro, Financeiro, Solicitações, Gerais) com etiqueta de status
-- (pendente, em andamento, solicitado, concluído). Acesso via botão no cabeçalho,
-- separado dos cards de módulo/departamento.

create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  categoria text not null check (categoria in ('logistica', 'registro', 'financeiro', 'solicitacoes', 'gerais')),
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'solicitado', 'concluido')),
  prazo date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tarefas_set_updated_at
  before update on public.tarefas
  for each row execute function set_updated_at();

create index tarefas_categoria_idx on public.tarefas (categoria);
create index tarefas_status_idx on public.tarefas (status);

alter table public.tarefas enable row level security;

create policy "authenticated_full_access" on public.tarefas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- =========================================================
-- GRANTS (RLS não substitui GRANT — ver 0002_grants.sql)
-- =========================================================
grant select, insert, update, delete on public.tarefas to authenticated;
