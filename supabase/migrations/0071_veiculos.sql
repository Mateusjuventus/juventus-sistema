-- Cadastro de Veículos / Placas (pedido do Mateus em 12/08): guardar nome, placa, cor e modelo de
-- quem vai de carro próprio, com vínculo opcional a uma pessoa já cadastrada, pra gerar o ofício
-- de liberação de acesso que o clube manda antes de jogo fora ("segue a relação de placas").
--
-- Por que o nome fica gravado no veículo mesmo havendo `pessoa_id`: nem todo condutor é atleta,
-- comissão ou staff (motorista terceirizado, familiar, dirigente convidado). O vínculo é um
-- atalho — preenche o nome e mantém a ligação — mas o documento imprime o que está no veículo.
-- `pessoa_id` de propósito NÃO é chave estrangeira: aponta pra três tabelas diferentes conforme
-- `pessoa_tipo` (mesmo padrão de `rooming_list_ocupantes`).

create table public.veiculos (
  id uuid primary key default gen_random_uuid(),
  -- Condutor / responsável pelo veículo — é o nome que vai no ofício de liberação.
  nome text not null,
  -- RG/CPF: a portaria de estádio quase sempre pede documento junto da placa.
  documento text,
  placa text not null,
  modelo text,
  marca text,
  cor text,
  ano integer check (ano is null or (ano >= 1950 and ano <= 2100)),
  pessoa_tipo text check (pessoa_tipo is null or pessoa_tipo in ('atleta', 'comissao', 'staff')),
  pessoa_id uuid,
  telefone text,
  observacoes text,
  ativo boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger veiculos_set_updated_at
before update on public.veiculos
for each row execute function set_updated_at();

create index veiculos_nome_idx on public.veiculos (nome);
create index veiculos_placa_idx on public.veiculos (placa);

-- Vínculo só existe completo: ou tem tipo e id, ou não tem nenhum dos dois.
alter table public.veiculos
  add constraint veiculos_pessoa_completa
  check ((pessoa_tipo is null and pessoa_id is null) or (pessoa_tipo is not null and pessoa_id is not null));

alter table public.veiculos enable row level security;

create policy "authenticated_full_access" on public.veiculos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.veiculos to authenticated;

-- Módulo novo liberado pra todo mundo que já existe (mesmo espírito de 0024, 0063, 0068 e 0070).

alter table public.perfis
  alter column modulos_permitidos set default array[
    'atletas',
    'comissao_tecnica',
    'staff_operacional',
    'jogos',
    'competicoes',
    'solicitacoes',
    'estoque',
    'termos_retirada',
    'hoteis',
    'veiculos',
    'financeiro'
  ];

update public.perfis
  set modulos_permitidos = array_append(modulos_permitidos, 'veiculos')
  where not ('veiculos' = any(modulos_permitidos));
