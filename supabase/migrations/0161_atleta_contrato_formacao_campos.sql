-- Contrato de Formação (geração automática em PDF) — ver docs/superpowers/specs/
-- 2026-11-09-contrato-formacao-design.md. Dois dados novos pedidos pelo Mateus que o modelo padrão
-- do contrato exige e que não existiam no cadastro: CPF da mãe e do pai do atleta (`atletas`,
-- preenchimento manual, ao lado de `mae_telefone`/`pai_telefone`) e o valor da bolsa de
-- aprendizagem mensal (`atleta_contratos`, só aplicável a `tipo_contrato = 'formacao'`).

alter table public.atletas
  add column if not exists mae_cpf text,
  add column if not exists pai_cpf text;

alter table public.atleta_contratos
  add column if not exists bolsa_aprendizagem numeric(12, 2) not null default 0;

-- `criar_contrato_atleta` precisa aceitar o novo parâmetro `p_bolsa_aprendizagem`. Adicionar um
-- parâmetro novo com `create or replace function` e uma contagem de parâmetros diferente cria um
-- overload ambíguo em vez de substituir a função — mesmo problema já documentado em
-- 0158_atleta_contrato_extensoes.sql. Precisa derrubar a assinatura antiga (16 parâmetros, a que
-- 0158 deixou) antes de criar a nova (17 parâmetros, com `default 0` pra quem ainda chama sem ele).
drop function if exists public.criar_contrato_atleta(
  uuid, text, text, date, date, numeric, numeric, numeric, numeric, numeric, uuid, text,
  numeric, numeric, text, numeric
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
  p_direito_economico_terceiro_pct numeric default null,
  p_bolsa_aprendizagem numeric default 0
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
    direito_economico_terceiro_nome, direito_economico_terceiro_pct,
    bolsa_aprendizagem
  ) values (
    p_atleta_id, p_tipo_contrato, p_clube_origem, p_vigencia_inicio, p_vigencia_fim,
    p_salario_ctps, p_direito_imagem, p_bonificacao, p_auxilio_moradia, p_outros,
    p_criado_por_perfil_id, p_criado_por_nome,
    p_direito_economico_juventus_pct, p_direito_economico_atleta_pct,
    p_direito_economico_terceiro_nome, p_direito_economico_terceiro_pct,
    p_bolsa_aprendizagem
  ) returning * into novo;

  update public.atletas
  set tipo_contrato = p_tipo_contrato, data_fim_contrato = p_vigencia_fim
  where id = p_atleta_id;

  return novo;
end;
$$;

-- `drop function` zera os privilégios da função antiga — precisa regravar o grant pra quem já
-- chama (mesmo lembrete de 0158).
grant execute on function public.criar_contrato_atleta to authenticated;

notify pgrst, 'reload schema';
