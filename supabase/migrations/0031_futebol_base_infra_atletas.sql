-- Fase 1 do Futebol de Base (ver docs/superpowers/specs/2026-07-20-futebol-de-base-design.md):
-- infraestrutura de permissão por módulo do novo departamento + módulo Atletas completo.
--
-- 1) `modulos_base_permitidos` — espelha `modulos_permitidos` (0024_perfil_modulos.sql), mas para
--    os módulos do Futebol de Base. Mesma regra: todo mundo começa com tudo liberado, pra não
--    tirar acesso de ninguém sem querer quando esta coluna passa a existir. Ter algo aqui só
--    importa pra quem também tem "futebol_base" em `departamentos_permitidos`
--    (0025_departamentos_e_categorias_tarefas.sql) — ver lib/auth/role.ts getModulosBasePermitidos().
alter table public.perfis
  add column if not exists modulos_base_permitidos text[] not null default array[
    'atletas',
    'comissao_tecnica',
    'staff_operacional',
    'jogos',
    'solicitacoes',
    'estoque',
    'financeiro'
  ];

-- 2) `atletas_base` — mesmos campos de `atletas` (nome completo, apelido, rg, cpf, data de
--    nascimento, posição, número da camisa, pé dominante, telefone, cidade/UF natal, endereço
--    atual, data início clube, empresário, status, data fim contrato, foto), mais a coluna nova
--    `categoria`, que separa os atletas em Sub20 a Sub11. Tabela totalmente independente de
--    `atletas` — nenhuma linha de código do Futebol Profissional muda (ver "Arquitetura de dados"
--    na spec).
create table public.atletas_base (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('sub20', 'sub17', 'sub15', 'sub14', 'sub13', 'sub12', 'sub11')),
  nome_completo text not null,
  apelido text,
  rg text not null,
  cpf text not null,
  data_nascimento date not null,
  posicao text not null,
  numero_camisa integer,
  pe_dominante text check (pe_dominante in ('destro', 'canhoto', 'ambidestro')),
  telefone text,
  cidade_natal text,
  uf_natal char(2),
  endereco_atual text,
  data_inicio_clube date,
  empresario_nome text,
  foto_path text,
  status text not null default 'liberado' check (status in ('liberado', 'suspenso', 'departamento_medico')),
  data_fim_contrato date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atletas_base_cpf_unique unique (cpf),
  constraint atletas_base_rg_unique unique (rg),
  constraint atletas_base_cpf_format check (cpf ~ '^\d{11}$')
);

create trigger atletas_base_set_updated_at
  before update on public.atletas_base
  for each row execute function set_updated_at();

create index atletas_base_categoria_idx on public.atletas_base (categoria);
create index atletas_base_nome_idx on public.atletas_base using gin (to_tsvector('portuguese', nome_completo));

alter table public.atletas_base enable row level security;
create policy "authenticated_full_access" on public.atletas_base for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.atletas_base to authenticated;
