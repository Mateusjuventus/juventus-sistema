-- Extensões do Contrato do Atleta (ver docs/superpowers/specs/
-- 2026-11-04-contrato-atleta-extensoes-design.md): direitos econômicos (até 3 partes em %) e
-- evolução salarial (agenda de mudanças futuras de uma rubrica, presa ao contrato). Em cima do
-- sistema já existente desde 0137_atleta_contrato.sql (unificado Base+Profissional em
-- 0150_unificacao_atletas.sql) — nada aqui muda o comportamento já em produção.

-- Direitos econômicos: Juventus (%), Atleta (%) e um terceiro clube (nome digitável + %). Todos
-- opcionais — nem sempre as partes já estão 100% negociadas, por isso a soma pode ficar abaixo de
-- 100, só não pode passar.
alter table public.atleta_contratos
  add column if not exists direito_economico_juventus_pct numeric(5, 2),
  add column if not exists direito_economico_atleta_pct numeric(5, 2),
  add column if not exists direito_economico_terceiro_nome text,
  add column if not exists direito_economico_terceiro_pct numeric(5, 2);

alter table public.atleta_contratos
  add constraint atleta_contratos_direitos_economicos_pct_check
  check (
    (direito_economico_juventus_pct is null or (direito_economico_juventus_pct between 0 and 100))
    and (direito_economico_atleta_pct is null or (direito_economico_atleta_pct between 0 and 100))
    and (direito_economico_terceiro_pct is null or (direito_economico_terceiro_pct between 0 and 100))
    and (
      coalesce(direito_economico_juventus_pct, 0)
      + coalesce(direito_economico_atleta_pct, 0)
      + coalesce(direito_economico_terceiro_pct, 0)
    ) <= 100
  );

-- Evolução salarial — histórico/agenda de mudanças futuras de uma rubrica específica, presa ao
-- contrato (faz sentido editar só enquanto o contrato é o vigente; um contrato já histórico
-- mantém as evoluções que teve, só sem os controles de adicionar/remover — ver UI).
create table public.atleta_contrato_evolucao_salarial (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.atleta_contratos(id) on delete cascade,
  rubrica text not null check (
    rubrica in ('salario_ctps', 'direito_imagem', 'bonificacao', 'auxilio_moradia', 'outros')
  ),
  data_vigencia date not null,
  novo_valor numeric(12, 2) not null,
  criado_por_perfil_id uuid references public.perfis(id) on delete set null,
  criado_por_nome text,
  created_at timestamptz not null default now()
);

create index atleta_contrato_evolucao_salarial_contrato_id_idx
  on public.atleta_contrato_evolucao_salarial (contrato_id);

alter table public.atleta_contrato_evolucao_salarial enable row level security;

create policy "authenticated_full_access" on public.atleta_contrato_evolucao_salarial
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atleta_contrato_evolucao_salarial to authenticated;

-- `criar_contrato_atleta` ganha 4 parâmetros novos (com default null) pros direitos econômicos.
-- Importante: como a lista de parâmetros muda de tamanho, `create or replace function` com a
-- assinatura nova NÃO substitui a função antiga de 12 parâmetros — cria uma segunda função
-- sobrecarregada (overload), e aí uma chamada só com os 12 parâmetros originais vira ambígua pro
-- Postgres (bate com as duas). Por isso dropamos a assinatura antiga primeiro, deixando só uma
-- função — chamadas existentes (sem os 4 novos parâmetros, que têm default) continuam funcionando
-- sem nenhuma mudança de código.
drop function if exists public.criar_contrato_atleta(
  uuid, text, text, date, date, numeric, numeric, numeric, numeric, numeric, uuid, text
);

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
  p_criado_por_nome text,
  p_direito_economico_juventus_pct numeric default null,
  p_direito_economico_atleta_pct numeric default null,
  p_direito_economico_terceiro_nome text default null,
  p_direito_economico_terceiro_pct numeric default null
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
    criado_por_perfil_id, criado_por_nome,
    direito_economico_juventus_pct, direito_economico_atleta_pct,
    direito_economico_terceiro_nome, direito_economico_terceiro_pct
  ) values (
    p_atleta_id, p_tipo_contrato, p_clube_origem, p_vigencia_inicio, p_vigencia_fim,
    p_salario_ctps, p_direito_imagem, p_bonificacao, p_auxilio_moradia, p_outros,
    p_criado_por_perfil_id, p_criado_por_nome,
    p_direito_economico_juventus_pct, p_direito_economico_atleta_pct,
    p_direito_economico_terceiro_nome, p_direito_economico_terceiro_pct
  ) returning * into novo;

  update public.atletas
  set tipo_contrato = p_tipo_contrato, data_fim_contrato = p_vigencia_fim
  where id = p_atleta_id;

  return novo;
end;
$$;

-- `drop function` acima apaga os privilégios da função antiga junto com ela — precisa conceder de
-- novo nesta (mesmo grant que a 0137 já dava).
grant execute on function public.criar_contrato_atleta to authenticated;

notify pgrst, 'reload schema';
