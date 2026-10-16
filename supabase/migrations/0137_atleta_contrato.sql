-- Dados Esportivos: empresário (telefone + e-mail) e tamanho de uniforme.
alter table public.atletas add column if not exists empresario_telefone text;
alter table public.atletas add column if not exists empresario_email text;
alter table public.atletas add column if not exists tamanho_uniforme text
  check (tamanho_uniforme is null or tamanho_uniforme in ('PP', 'P', 'M', 'G', 'GG', 'XG'));

-- atletas_base já tem empresario_telefone (ver 0076_captacao_alojamento_base.sql) — só falta e-mail
-- e tamanho de uniforme.
alter table public.atletas_base add column if not exists empresario_email text;
alter table public.atletas_base add column if not exists tamanho_uniforme text
  check (tamanho_uniforme is null or tamanho_uniforme in ('PP', 'P', 'M', 'G', 'GG', 'XG'));

-- Dados de Contrato — histórico completo por atleta, um "vigente" por vez (garantido pelo índice
-- único parcial abaixo). Mesmo espírito de atletas_status_historico (0125): tabela de
-- histórico/auditoria própria, atleta não perde o controle principal.
create table public.atleta_contratos (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  vigente boolean not null default true,
  tipo_contrato text not null check (tipo_contrato in ('definitivo', 'emprestimo', 'amador', 'formacao')),
  -- Só preenchido quando tipo_contrato = 'emprestimo'.
  clube_origem text,
  vigencia_inicio date,
  vigencia_fim date,
  salario_ctps numeric(12, 2) not null default 0,
  direito_imagem numeric(12, 2) not null default 0,
  bonificacao numeric(12, 2) not null default 0,
  auxilio_moradia numeric(12, 2) not null default 0,
  outros numeric(12, 2) not null default 0,
  criado_por_perfil_id uuid references public.perfis(id) on delete set null,
  criado_por_nome text,
  created_at timestamptz not null default now(),
  encerrado_em timestamptz
);

-- Garante no máximo um vigente por atleta.
create unique index atleta_contratos_vigente_unico_idx
  on public.atleta_contratos (atleta_id) where vigente;

create index atleta_contratos_atleta_id_idx on public.atleta_contratos (atleta_id);

alter table public.atleta_contratos enable row level security;

create policy "authenticated_full_access" on public.atleta_contratos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atleta_contratos to authenticated;

create table public.atleta_base_contratos (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas_base(id) on delete cascade,
  vigente boolean not null default true,
  tipo_contrato text not null
    check (tipo_contrato in ('definitivo', 'emprestimo', 'amador', 'formacao', 'iniciacao')),
  clube_origem text,
  vigencia_inicio date,
  vigencia_fim date,
  salario_ctps numeric(12, 2) not null default 0,
  direito_imagem numeric(12, 2) not null default 0,
  bonificacao numeric(12, 2) not null default 0,
  auxilio_moradia numeric(12, 2) not null default 0,
  outros numeric(12, 2) not null default 0,
  criado_por_perfil_id uuid references public.perfis(id) on delete set null,
  criado_por_nome text,
  created_at timestamptz not null default now(),
  encerrado_em timestamptz
);

create unique index atleta_base_contratos_vigente_unico_idx
  on public.atleta_base_contratos (atleta_id) where vigente;

create index atleta_base_contratos_atleta_id_idx on public.atleta_base_contratos (atleta_id);

alter table public.atleta_base_contratos enable row level security;

create policy "authenticated_full_access" on public.atleta_base_contratos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atleta_base_contratos to authenticated;

-- Backfill: atleta que já tem tipo_contrato preenchido hoje ganha um Contrato Vigente inicial
-- (rubricas zeradas, pra você completar depois).
insert into public.atleta_contratos (atleta_id, tipo_contrato, vigencia_inicio, vigencia_fim, criado_por_nome)
select id, tipo_contrato, data_inicio_contrato, data_fim_contrato, 'Migração do sistema'
from public.atletas
where tipo_contrato is not null;

insert into public.atleta_base_contratos (atleta_id, tipo_contrato, vigencia_inicio, vigencia_fim, criado_por_nome)
select id, tipo_contrato, data_inicio_contrato, data_fim_contrato, 'Migração do sistema'
from public.atletas_base
where tipo_contrato is not null;

-- Função de banco pra "Novo contrato": encerra o vigente atual (se existir) e insere o novo, como
-- uma operação atômica só (evita a janela entre "encerrar" e "inserir" que duas chamadas separadas
-- do supabase-js teriam). Chamada via supabase.rpc(...) nas actions. Também sincroniza
-- `tipo_contrato`/`data_fim_contrato` de volta na linha do atleta — essas duas colunas continuam
-- sendo lidas direto por `AtletasResumoFiltros` (filtros/contadores da listagem de
-- `app/atletas/page.tsx`), então sem isso a listagem ficaria desatualizada depois de uma renovação.
create function public.criar_contrato_atleta(
  p_atleta_id uuid,
  p_tipo_contrato text,
  p_clube_origem text,
  p_vigencia_inicio date,
  p_vigencia_fim date,
  p_salario_ctps numeric,
  p_direito_imagem numeric,
  p_bonificacao numeric,
  p_auxilio_moradia numeric,
  p_outros numeric,
  p_criado_por_perfil_id uuid,
  p_criado_por_nome text
) returns public.atleta_contratos
language plpgsql
as $$
declare
  novo public.atleta_contratos;
begin
  update public.atleta_contratos
  set vigente = false, encerrado_em = now()
  where atleta_id = p_atleta_id and vigente;

  insert into public.atleta_contratos (
    atleta_id, tipo_contrato, clube_origem, vigencia_inicio, vigencia_fim,
    salario_ctps, direito_imagem, bonificacao, auxilio_moradia, outros,
    criado_por_perfil_id, criado_por_nome
  ) values (
    p_atleta_id, p_tipo_contrato, p_clube_origem, p_vigencia_inicio, p_vigencia_fim,
    p_salario_ctps, p_direito_imagem, p_bonificacao, p_auxilio_moradia, p_outros,
    p_criado_por_perfil_id, p_criado_por_nome
  ) returning * into novo;

  update public.atletas
  set tipo_contrato = p_tipo_contrato, data_fim_contrato = p_vigencia_fim
  where id = p_atleta_id;

  return novo;
end;
$$;

grant execute on function public.criar_contrato_atleta to authenticated;

-- Mesma função, pra atleta_base_contratos (idêntica sincronização com atletas_base).
create function public.criar_contrato_atleta_base(
  p_atleta_id uuid,
  p_tipo_contrato text,
  p_clube_origem text,
  p_vigencia_inicio date,
  p_vigencia_fim date,
  p_salario_ctps numeric,
  p_direito_imagem numeric,
  p_bonificacao numeric,
  p_auxilio_moradia numeric,
  p_outros numeric,
  p_criado_por_perfil_id uuid,
  p_criado_por_nome text
) returns public.atleta_base_contratos
language plpgsql
as $$
declare
  novo public.atleta_base_contratos;
begin
  update public.atleta_base_contratos
  set vigente = false, encerrado_em = now()
  where atleta_id = p_atleta_id and vigente;

  insert into public.atleta_base_contratos (
    atleta_id, tipo_contrato, clube_origem, vigencia_inicio, vigencia_fim,
    salario_ctps, direito_imagem, bonificacao, auxilio_moradia, outros,
    criado_por_perfil_id, criado_por_nome
  ) values (
    p_atleta_id, p_tipo_contrato, p_clube_origem, p_vigencia_inicio, p_vigencia_fim,
    p_salario_ctps, p_direito_imagem, p_bonificacao, p_auxilio_moradia, p_outros,
    p_criado_por_perfil_id, p_criado_por_nome
  ) returning * into novo;

  update public.atletas_base
  set tipo_contrato = p_tipo_contrato, data_fim_contrato = p_vigencia_fim
  where id = p_atleta_id;

  return novo;
end;
$$;

grant execute on function public.criar_contrato_atleta_base to authenticated;

notify pgrst, 'reload schema';
