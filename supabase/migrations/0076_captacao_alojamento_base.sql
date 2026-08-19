-- Três módulos novos do Futebol de Base, pedidos juntos (18/08): Captação/Avaliação de atletas,
-- mais informação nos cadastros de Atleta (alojamento, responsáveis, empresário, endereço com CEP,
-- escola) e o Alojamento em si (capacidade e relação de quem está morando lá). O Campograma (pedido
-- junto) não precisa de tabela nova — é só uma visualização de `atletas_base` já existente.
--
-- Decisões da conversa: ao mudar o status de um candidato pra "Aprovado", o sistema cria sozinho o
-- cadastro completo em `atletas_base` (por isso RG/CPF viram opcionais nessa tabela — quem vem da
-- Captação raramente tem esses documentos à mão nessa fase, o Mateus completa depois). O link
-- público serve pra CRIAR um candidato novo (fica em avaliação até o Mateus decidir), não pra
-- completar cadastro de atleta já existente.

-- ============================================================================
-- 1) Mais campos em `atletas_base` — alojamento, responsáveis, empresário e endereço estruturado
--    (com autopreenchimento por CEP, ver components/endereco-fields.tsx). `endereco_atual` (texto
--    livre) continua existindo pra não perder o que já tinha sido digitado; o formulário passa a
--    usar os campos novos daqui pra frente.
-- ============================================================================
alter table public.atletas_base
  add column if not exists alojado boolean not null default false,
  add column if not exists valor_ajuda_custo numeric(10, 2),
  add column if not exists agencia text,
  add column if not exists empresario_telefone text,
  add column if not exists mae_nome text,
  add column if not exists mae_telefone text,
  add column if not exists pai_nome text,
  add column if not exists pai_telefone text,
  add column if not exists escola text,
  add column if not exists cep text,
  add column if not exists logradouro text,
  add column if not exists numero text,
  add column if not exists complemento text,
  add column if not exists bairro text,
  add column if not exists cidade text,
  add column if not exists uf text;

-- RG/CPF viram OPCIONAIS só em `atletas_base` (a tabela do Profissional não é tocada aqui): quem é
-- criado automaticamente ao aprovar uma Captação normalmente ainda não tem esses documentos
-- digitalizados. Índice único já existente continua funcionando — Postgres não considera dois NULL
-- iguais, então vários atletas sem CPF cadastrado ainda não colidem entre si.
alter table public.atletas_base alter column rg drop not null;
alter table public.atletas_base alter column cpf drop not null;

-- ============================================================================
-- 2) Captação/Avaliação — banco dos candidatos em teste, antes de virarem Atleta de verdade.
--    `numero` é gerado sozinho pelo banco (Nº pedido no formato da lista). Os campos de família,
--    empresário, endereço e escola são os MESMOS que passaram a existir em `atletas_base`: ao
--    aprovar, tudo migra junto pro cadastro oficial (ver `pgf_aprovar_captacao` mais abaixo — na
--    verdade essa cópia acontece em TypeScript, na Server Action `aprovarCaptacao`, não aqui no
--    banco, pra reaproveitar a mesma validação que o cadastro normal de Atleta já usa).
-- ============================================================================
create table public.captacao_base (
  id uuid primary key default gen_random_uuid(),
  numero integer generated always as identity,
  data_inicio date not null default current_date,
  nome_completo text not null,
  data_nascimento date,
  posicao text,
  categoria text check (categoria in ('sub20', 'sub17', 'sub15', 'sub14', 'sub13', 'sub12', 'sub11')),
  indicacao text,
  deseja_alojamento boolean not null default false,
  status text not null default 'avaliacao'
    check (status in ('avaliacao', 'aprovado', 'dispensado', 'nao_compareceu')),
  observacoes text,
  telefone text,
  mae_nome text,
  mae_telefone text,
  pai_nome text,
  pai_telefone text,
  empresario_nome text,
  empresario_telefone text,
  agencia text,
  valor_ajuda_custo numeric(10, 2),
  escola text,
  cep text,
  logradouro text,
  numero_endereco text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  -- Quem enviou pelo link público (`/cadastro-atleta-base`) x quem o Mateus cadastrou direto na
  -- tela interna — só pra contexto, não muda nenhuma regra.
  origem text not null default 'interno' check (origem in ('interno', 'publico')),
  -- Preenchido só quando `status` vira 'aprovado' — é o atleta que a aprovação gerou.
  atleta_gerado_id uuid references public.atletas_base(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger captacao_base_set_updated_at
  before update on public.captacao_base
  for each row execute function set_updated_at();

create index captacao_base_status_idx on public.captacao_base (status);
create index captacao_base_uf_idx on public.captacao_base (uf);
create index captacao_base_categoria_idx on public.captacao_base (categoria);

alter table public.captacao_base enable row level security;
create policy "authenticated_full_access" on public.captacao_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.captacao_base to authenticated;

-- O link público (`/cadastro-atleta-base`) roda com service_role — grant explícito aqui, na própria
-- migração que cria a tabela, e não numa correção depois (lição registrada em
-- docs/superpowers/specs/2026-08-14-vagas-staff-design.md após 0027/0060/0074): service_role ignora
-- RLS mas NÃO ignora GRANT.
grant usage on schema public to service_role;
grant select, insert on public.captacao_base to service_role;

-- ============================================================================
-- 3) Configuração do link público de Captação — mesmo formato do toggle de Staff/Comissão da Base
--    (0032_futebol_base_comissao_staff.sql): tabela singleton, editável só por quem está logado; a
--    página pública só LÊ esse valor via service_role key.
-- ============================================================================
create table public.configuracoes_cadastro_atleta_base (
  id uuid primary key default gen_random_uuid(),
  cadastro_publico_ativo boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger configuracoes_cadastro_atleta_base_set_updated_at
  before update on public.configuracoes_cadastro_atleta_base
  for each row execute function set_updated_at();

insert into public.configuracoes_cadastro_atleta_base (cadastro_publico_ativo) values (true);

alter table public.configuracoes_cadastro_atleta_base enable row level security;
create policy "authenticated_full_access" on public.configuracoes_cadastro_atleta_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, update on public.configuracoes_cadastro_atleta_base to authenticated;
grant select on public.configuracoes_cadastro_atleta_base to service_role;

-- ============================================================================
-- 4) Alojamento — só a capacidade total (singleton, mesmo formato acima). Quem está alojado é lido
--    direto de `atletas_base.alojado = true`; "vagas disponíveis" é capacidade menos essa contagem
--    (ver lib/futebol/alojamento.ts), não precisa de tabela própria pra isso.
-- ============================================================================
create table public.alojamento_base_config (
  id uuid primary key default gen_random_uuid(),
  capacidade_total integer not null default 0 check (capacidade_total >= 0),
  observacoes text,
  updated_at timestamptz not null default now()
);

create trigger alojamento_base_config_set_updated_at
  before update on public.alojamento_base_config
  for each row execute function set_updated_at();

insert into public.alojamento_base_config (capacidade_total) values (0);

alter table public.alojamento_base_config enable row level security;
create policy "authenticated_full_access" on public.alojamento_base_config
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, update on public.alojamento_base_config to authenticated;

notify pgrst, 'reload schema';
