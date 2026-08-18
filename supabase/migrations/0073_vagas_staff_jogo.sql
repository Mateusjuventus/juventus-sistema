-- Vagas de Staff por jogo (pedido do Mateus em 14/08): em vez de convocar pessoa por pessoa, o
-- clube ABRE VAGAS por função ("4 seguranças, 4 gandulas, 2 maqueiros"), manda um link único no
-- grupo, e quem chega primeiro pega. Quando lota, o link para de aceitar sozinho.
--
-- A função NÃO é escolhida no celular: vem do cadastro da pessoa em `staff_operacional`
-- (`funcao_id`, ou `funcao_terceirizada_id` quando é terceirizada). O que o Mateus abre é a
-- demanda; o sistema cruza com o que cada um faz. Quem tem função sem vaga aberta simplesmente não
-- consegue pegar.

create table public.jogo_vagas_staff (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null unique references public.jogos(id) on delete cascade,
  -- Token da URL pública (/vagas/<token>). 6 bytes = 12 caracteres hex: curto o bastante pra caber
  -- numa mensagem de WhatsApp e longo o bastante pra ninguém acertar por tentativa.
  token text not null unique default encode(gen_random_bytes(6), 'hex'),
  -- Fecha a captação sem apagar nada: o link passa a mostrar "encerrado" e o histórico continua.
  aberto boolean not null default true,
  -- Padrões que aparecem pra todo mundo; cada função pode sobrescrever o horário.
  horario_apresentacao text,
  local_apresentacao text,
  observacoes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger jogo_vagas_staff_set_updated_at
before update on public.jogo_vagas_staff
for each row execute function set_updated_at();

-- Uma linha por função aberta, com quantas vagas ela tem.
create table public.jogo_vagas_staff_funcoes (
  id uuid primary key default gen_random_uuid(),
  vagas_id uuid not null references public.jogo_vagas_staff(id) on delete cascade,
  funcao_id uuid not null references public.staff_funcoes_catalogo(id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  horario_apresentacao text,
  created_at timestamptz not null default now(),
  unique (vagas_id, funcao_id)
);

create index jogo_vagas_staff_funcoes_vagas_idx on public.jogo_vagas_staff_funcoes (vagas_id);

-- Quem pegou vaga. `situacao` separa quem está dentro de quem ficou na fila; a ordem de chegada é
-- `created_at`, que é o critério de tudo aqui.
create table public.jogo_vagas_staff_inscricoes (
  id uuid primary key default gen_random_uuid(),
  vagas_id uuid not null references public.jogo_vagas_staff(id) on delete cascade,
  vaga_funcao_id uuid not null references public.jogo_vagas_staff_funcoes(id) on delete cascade,
  staff_id uuid not null references public.staff_operacional(id) on delete cascade,
  situacao text not null default 'confirmado' check (situacao in ('confirmado', 'espera')),
  observacao text,
  created_at timestamptz not null default now()
);

-- Uma pessoa pega no máximo uma vaga por jogo (inclusive contando a lista de espera).
create unique index jogo_vagas_staff_inscricoes_pessoa_unica
  on public.jogo_vagas_staff_inscricoes (vagas_id, staff_id);

create index jogo_vagas_staff_inscricoes_funcao_idx
  on public.jogo_vagas_staff_inscricoes (vaga_funcao_id, situacao);

-- ============================================================================
-- O CORAÇÃO DISSO: pegar a vaga sem estourar o limite.
--
-- Em jogo de véspera o grupo inteiro responde ao mesmo tempo, e três pessoas podem tocar em
-- "confirmar" na mesma última vaga no mesmo segundo. Conferir a lotação no aplicativo e depois
-- inserir não resolve: entre a conferência e a inserção outra transação já entrou, e o clube
-- termina com 12 pessoas em 10 vagas.
--
-- Por isso a checagem vive AQUI, numa função que primeiro trava a linha da função
-- (`for update`) — o que serializa as tentativas daquela função específica, sem travar as outras —
-- e só então conta e insere. Quem chegar depois do limite entra como 'espera', em vez de receber
-- erro.
-- ============================================================================
create or replace function public.pegar_vaga_staff(p_token text, p_staff_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vagas public.jogo_vagas_staff%rowtype;
  v_funcao_id uuid;
  v_vaga_funcao public.jogo_vagas_staff_funcoes%rowtype;
  v_ocupadas integer;
  v_situacao text;
begin
  select * into v_vagas from public.jogo_vagas_staff where token = p_token;
  if not found then return 'token_invalido'; end if;
  if not v_vagas.aberto then return 'fechado'; end if;

  if exists (
    select 1 from public.jogo_vagas_staff_inscricoes
    where vagas_id = v_vagas.id and staff_id = p_staff_id
  ) then
    return 'ja_inscrito';
  end if;

  -- Função vem do cadastro: terceirizada usa `funcao_terceirizada_id`.
  select case when terceirizada then funcao_terceirizada_id else funcao_id end
    into v_funcao_id
    from public.staff_operacional
   where id = p_staff_id and ativo;
  if v_funcao_id is null then return 'sem_funcao'; end if;

  -- `for update` trava só a linha desta função — duas pessoas de funções diferentes continuam
  -- entrando em paralelo.
  select * into v_vaga_funcao
    from public.jogo_vagas_staff_funcoes
   where vagas_id = v_vagas.id and funcao_id = v_funcao_id
     for update;
  if not found then return 'sem_vaga_para_funcao'; end if;

  select count(*) into v_ocupadas
    from public.jogo_vagas_staff_inscricoes
   where vaga_funcao_id = v_vaga_funcao.id and situacao = 'confirmado';

  v_situacao := case when v_ocupadas < v_vaga_funcao.quantidade then 'confirmado' else 'espera' end;

  insert into public.jogo_vagas_staff_inscricoes (vagas_id, vaga_funcao_id, staff_id, situacao)
  values (v_vagas.id, v_vaga_funcao.id, p_staff_id, v_situacao);

  return v_situacao;
end;
$$;

-- Desistência: some da lista e a vaga volta pro grupo. Não promove ninguém da espera
-- automaticamente de propósito — quem decide chamar é o Mateus, que pode preferir outra pessoa da
-- fila (ver o botão "Chamar" na tela).
create or replace function public.desistir_vaga_staff(p_token text, p_staff_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vagas_id uuid;
begin
  select id into v_vagas_id from public.jogo_vagas_staff where token = p_token;
  if v_vagas_id is null then return 'token_invalido'; end if;

  delete from public.jogo_vagas_staff_inscricoes
   where vagas_id = v_vagas_id and staff_id = p_staff_id;

  return 'ok';
end;
$$;

grant execute on function public.pegar_vaga_staff(text, uuid) to anon, authenticated, service_role;
grant execute on function public.desistir_vaga_staff(text, uuid) to anon, authenticated, service_role;

-- RLS: a tela pública roda com service_role (igual ao /cadastro-staff), que ignora RLS. Quem está
-- logado no sistema tem acesso total, como nas demais tabelas.

alter table public.jogo_vagas_staff enable row level security;
alter table public.jogo_vagas_staff_funcoes enable row level security;
alter table public.jogo_vagas_staff_inscricoes enable row level security;

create policy "authenticated_full_access" on public.jogo_vagas_staff
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.jogo_vagas_staff_funcoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.jogo_vagas_staff_inscricoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.jogo_vagas_staff to authenticated;
grant select, insert, update, delete on public.jogo_vagas_staff_funcoes to authenticated;
grant select, insert, update, delete on public.jogo_vagas_staff_inscricoes to authenticated;
