-- Cadastro de Hotéis (pedido do Mateus em 12/08): um banco de dados dos hotéis com que o clube
-- trabalha, pra não redigitar nome/endereço/contato a cada viagem.
--
-- Relação com a Rooming List: `rooming_list.hotel_nome`/`hotel_endereco` continuam sendo TEXTO
-- LIVRE e não mudam — a rooming list de um jogo antigo tem que continuar imprimindo exatamente o
-- hotel que foi usado na época, mesmo que o cadastro seja editado ou apagado depois. O cadastro
-- entra ali só como atalho de preenchimento (escolhe o hotel → preenche os dois campos), sem
-- virar chave estrangeira. Mesma decisão de "documento guarda o que foi assinado" dos Termos.

create table public.hoteis (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  -- Endereço em partes: cidade é o que mais se filtra (achar hotel na cidade do jogo), e o
  -- endereço completo pro documento é montado em `lib/futebol/hotel.ts`.
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  cep text,
  telefone text,
  whatsapp text,
  email text,
  site text,
  -- Contato nominal: hotel grande sempre tem um comercial/eventos que já conhece o clube, e é com
  -- essa pessoa que a reserva é fechada — perder esse nome é perder metade do valor do cadastro.
  contato_nome text,
  contato_funcao text,
  contato_telefone text,
  contato_email text,
  diaria_referencia numeric(12, 2) check (diaria_referencia is null or diaria_referencia >= 0),
  -- Estrutura que decide se o hotel serve pra delegação de futebol (não é frescura: sem
  -- estacionamento de ônibus ou sala pra refeição do grupo, o hotel não serve).
  cafe_incluso boolean not null default false,
  estacionamento_onibus boolean not null default false,
  sala_refeicao_grupo boolean not null default false,
  horario_checkin text,
  horario_checkout text,
  observacoes text,
  ativo boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger hoteis_set_updated_at
before update on public.hoteis
for each row execute function set_updated_at();

create index hoteis_nome_idx on public.hoteis (nome);
create index hoteis_cidade_idx on public.hoteis (cidade);

alter table public.hoteis enable row level security;

create policy "authenticated_full_access" on public.hoteis
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.hoteis to authenticated;

-- Módulo novo liberado pra todo mundo que já existe (mesmo espírito de 0024, 0063 e 0068).

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
    'financeiro'
  ];

update public.perfis
  set modulos_permitidos = array_append(modulos_permitidos, 'hoteis')
  where not ('hoteis' = any(modulos_permitidos));
