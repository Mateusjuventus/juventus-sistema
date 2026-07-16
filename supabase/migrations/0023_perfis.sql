-- Papel de cada usuário logado ("master" ou "regular") — usado pra decidir quem pode excluir
-- Entrada/Saída do Estoque e quem pode acessar a tela de Usuários (/usuarios).
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'regular' check (role in ('master', 'regular')),
  created_at timestamptz not null default now()
);

-- Todo usuário que já tem login hoje (antes desta migration existir) vira "master" automaticamente
-- — na prática, só a conta principal até aqui. Daqui pra frente, todo usuário novo criado pela tela
-- de Usuários começa como "regular" por padrão, a menos que o master escolha "master" na hora de
-- cadastrar.
insert into public.perfis (id, email, role)
select id, email, 'master' from auth.users
on conflict (id) do nothing;

alter table public.perfis enable row level security;

-- Qualquer usuário autenticado pode LER a lista de perfis (necessário pra tela de Usuários e pra
-- cada usuário conseguir saber o próprio papel). De propósito, NÃO existe política de
-- insert/update/delete para "authenticated" — a única forma de escrever nessa tabela é pelo
-- servidor usando a service_role key (lib/supabase/admin.ts), dentro de uma ação que já confere
-- que quem está chamando é master (ver lib/auth/role.ts e app/usuarios/actions.ts). Isso evita que
-- um usuário comum se autopromova a master.
create policy "authenticated_read_perfis" on public.perfis
  for select using (auth.role() = 'authenticated');

grant select on public.perfis to authenticated;
