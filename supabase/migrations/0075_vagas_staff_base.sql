-- Vagas de Staff por jogo no FUTEBOL DE BASE — espelha 0073/0074 do Profissional (ver
-- docs/superpowers/specs/2026-08-14-vagas-staff-design.md). Mesmo modelo: o clube abre vagas por
-- função, manda um link único, quem chega primeiro pega, e o link fecha sozinho ao lotar.
--
-- Tabelas próprias (e não uma coluna `departamento` nas do Profissional) porque é assim que o resto
-- do sistema separa os dois: `jogos_base`, `staff_operacional_base`, `recibos_jogo_base`. Misturar
-- aqui obrigaria toda consulta das duas pontas a lembrar de filtrar, e um esquecimento mostraria
-- vaga de Base no link do Profissional.
--
-- O catálogo de funções é COMPARTILHADO (`staff_funcoes_catalogo`) — é o mesmo que
-- `staff_operacional_base.funcao_id` já aponta, e é ele que permite cruzar a demanda do jogo com o
-- que cada pessoa faz.

create table public.jogo_vagas_staff_base (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null unique references public.jogos_base(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(6), 'hex'),
  aberto boolean not null default true,
  horario_apresentacao text,
  local_apresentacao text,
  observacoes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger jogo_vagas_staff_base_set_updated_at
before update on public.jogo_vagas_staff_base
for each row execute function set_updated_at();

create table public.jogo_vagas_staff_base_funcoes (
  id uuid primary key default gen_random_uuid(),
  vagas_id uuid not null references public.jogo_vagas_staff_base(id) on delete cascade,
  funcao_id uuid not null references public.staff_funcoes_catalogo(id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  horario_apresentacao text,
  created_at timestamptz not null default now(),
  unique (vagas_id, funcao_id)
);

create index jogo_vagas_staff_base_funcoes_vagas_idx
  on public.jogo_vagas_staff_base_funcoes (vagas_id);

create table public.jogo_vagas_staff_base_inscricoes (
  id uuid primary key default gen_random_uuid(),
  vagas_id uuid not null references public.jogo_vagas_staff_base(id) on delete cascade,
  vaga_funcao_id uuid not null references public.jogo_vagas_staff_base_funcoes(id) on delete cascade,
  staff_id uuid not null references public.staff_operacional_base(id) on delete cascade,
  situacao text not null default 'confirmado' check (situacao in ('confirmado', 'espera')),
  observacao text,
  created_at timestamptz not null default now()
);

create unique index jogo_vagas_staff_base_inscricoes_pessoa_unica
  on public.jogo_vagas_staff_base_inscricoes (vagas_id, staff_id);

create index jogo_vagas_staff_base_inscricoes_funcao_idx
  on public.jogo_vagas_staff_base_inscricoes (vaga_funcao_id, situacao);

-- ============================================================================
-- Mesma garantia do Profissional: a checagem do limite vive AQUI, não no aplicativo. Em véspera de
-- jogo o grupo responde junto e três pessoas podem tocar em "confirmar" na mesma última vaga no
-- mesmo segundo; conferir antes e inserir depois deixaria entrar mais gente do que as vagas. O
-- `for update` trava a linha DAQUELA função, serializando só as tentativas dela.
-- ============================================================================
create or replace function public.pegar_vaga_staff_base(p_token text, p_staff_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vagas public.jogo_vagas_staff_base%rowtype;
  v_funcao_id uuid;
  v_vaga_funcao public.jogo_vagas_staff_base_funcoes%rowtype;
  v_ocupadas integer;
  v_situacao text;
begin
  select * into v_vagas from public.jogo_vagas_staff_base where token = p_token;
  if not found then return 'token_invalido'; end if;
  if not v_vagas.aberto then return 'fechado'; end if;

  if exists (
    select 1 from public.jogo_vagas_staff_base_inscricoes
    where vagas_id = v_vagas.id and staff_id = p_staff_id
  ) then
    return 'ja_inscrito';
  end if;

  select case when terceirizada then funcao_terceirizada_id else funcao_id end
    into v_funcao_id
    from public.staff_operacional_base
   where id = p_staff_id and ativo;
  if v_funcao_id is null then return 'sem_funcao'; end if;

  select * into v_vaga_funcao
    from public.jogo_vagas_staff_base_funcoes
   where vagas_id = v_vagas.id and funcao_id = v_funcao_id
     for update;
  if not found then return 'sem_vaga_para_funcao'; end if;

  select count(*) into v_ocupadas
    from public.jogo_vagas_staff_base_inscricoes
   where vaga_funcao_id = v_vaga_funcao.id and situacao = 'confirmado';

  v_situacao := case when v_ocupadas < v_vaga_funcao.quantidade then 'confirmado' else 'espera' end;

  insert into public.jogo_vagas_staff_base_inscricoes (vagas_id, vaga_funcao_id, staff_id, situacao)
  values (v_vagas.id, v_vaga_funcao.id, p_staff_id, v_situacao);

  return v_situacao;
end;
$$;

create or replace function public.desistir_vaga_staff_base(p_token text, p_staff_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vagas_id uuid;
begin
  select id into v_vagas_id from public.jogo_vagas_staff_base where token = p_token;
  if v_vagas_id is null then return 'token_invalido'; end if;

  delete from public.jogo_vagas_staff_base_inscricoes
   where vagas_id = v_vagas_id and staff_id = p_staff_id;

  return 'ok';
end;
$$;

grant execute on function public.pegar_vaga_staff_base(text, uuid) to anon, authenticated, service_role;
grant execute on function public.desistir_vaga_staff_base(text, uuid) to anon, authenticated, service_role;

alter table public.jogo_vagas_staff_base enable row level security;
alter table public.jogo_vagas_staff_base_funcoes enable row level security;
alter table public.jogo_vagas_staff_base_inscricoes enable row level security;

create policy "authenticated_full_access" on public.jogo_vagas_staff_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.jogo_vagas_staff_base_funcoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.jogo_vagas_staff_base_inscricoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.jogo_vagas_staff_base to authenticated;
grant select, insert, update, delete on public.jogo_vagas_staff_base_funcoes to authenticated;
grant select, insert, update, delete on public.jogo_vagas_staff_base_inscricoes to authenticated;

-- GRANT pro service_role JÁ AQUI, e não numa migração de correção depois: a tela pública roda com
-- ele, que ignora RLS mas NÃO ignora GRANT. Esquecer isto foi o que fez o link do Profissional
-- dizer "Link não encontrado" com as vagas abertas (ver 0074) — e antes dele 0027 e 0060.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.jogo_vagas_staff_base to service_role;
grant select, insert, update, delete on public.jogo_vagas_staff_base_funcoes to service_role;
grant select, insert, update, delete on public.jogo_vagas_staff_base_inscricoes to service_role;
-- A tela pública também lê o jogo e o catálogo de funções.
grant select on public.jogos_base to service_role;
grant select on public.staff_funcoes_catalogo to service_role;

notify pgrst, 'reload schema';
