-- Atletas: Desativação com motivo + histórico, Transição de categoria e Dados de Pagamento (ver
-- docs/superpowers/specs/2026-11-04-atletas-desativacao-transicao-pagamento-design.md).

-- Frente 1: histórico de ativação/desativação (independente de atletas_status_historico — são
-- dois eixos diferentes: ativo/inativo x liberado/departamento médico/transição/dispensado). Mesmos
-- moldes de atleta_contrato_gatilhos (0159): RLS "authenticated_full_access" + grants.
create table public.atletas_ativo_historico (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  ativo boolean not null,
  -- Só preenchido ao desativar (um dos 5 valores de MOTIVO_DESATIVACAO_ATLETA_OPTIONS, incluindo o
  -- texto digitado quando for "Outro"); null na reativação.
  motivo text,
  -- Opcional na desativação; obrigatório na reativação (motivo/observação da volta).
  observacao text,
  data date not null default current_date,
  criado_por_perfil_id uuid references public.perfis(id) on delete set null,
  criado_por_nome text,
  created_at timestamptz not null default now()
);

create index atletas_ativo_historico_atleta_id_idx
  on public.atletas_ativo_historico (atleta_id);

alter table public.atletas_ativo_historico enable row level security;

create policy "authenticated_full_access" on public.atletas_ativo_historico
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atletas_ativo_historico to authenticated;

-- Frente 3: Dados de Pagamento no cadastro do atleta (sem vínculo direto com atleta_contratos —
-- só a VISIBILIDADE da seção no formulário depende do tipo_contrato vigente, ver
-- `atletaTemDadosPagamento` em lib/futebol/contrato.ts).
alter table public.atletas
  add column tipo_pagamento text check (tipo_pagamento in ('pf', 'pj')),
  add column empresa_imagem_nome text,
  add column empresa_imagem_cnpj text;

-- Frente 2: permissão nova, marcável em qualquer perfil (não é exclusiva de nenhum `role`) — dá
-- acesso à ação "Transitar atleta" entre qualquer categoria (Base e Profissional), inclusive
-- ignorando departamentos_permitidos/categorias_base_permitidas só pra essa ação específica (ver
-- getPodeTransitarCategoriaAtleta em lib/auth/role.ts).
alter table public.perfis add column pode_transitar_categoria_atleta boolean;

notify pgrst, 'reload schema';
