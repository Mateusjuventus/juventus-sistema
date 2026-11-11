-- Fase 2 do Contrato de Formação (tela própria) — ver docs/superpowers/specs/
-- 2026-11-11-contrato-formacao-fase2-design.md. Dois dados novos pedidos pelo Mateus:
--
-- 1. Vigência do BID (registro do atleta na CBF/FPF) — é um dado do ATLETA, independente de qual
--    contrato está vigente ou arquivado (pode divergir da vigência do próprio Contrato de
--    Formação, e precisa continuar editável mesmo depois do contrato anterior ser encerrado). Vive
--    em `atletas`, mesmo princípio de `valor_ajuda_custo`.
--
-- 2. Uma forma de EDITAR o contrato de Formação vigente sem encerrá-lo/criar histórico (sem
--    Aditivo) — a única função que existe hoje (`criar_contrato_atleta`) sempre encerra o vigente
--    atual e insere um novo. `atualizar_contrato_formacao_vigente` faz um UPDATE simples no mesmo
--    registro, restrito a `tipo_contrato = 'formacao'` (guarda contra uso indevido em qualquer
--    outro tipo de contrato).

alter table public.atletas
  add column if not exists vigencia_bid_inicio date,
  add column if not exists vigencia_bid_fim date;

create function public.atualizar_contrato_formacao_vigente(
  p_atleta_id uuid,
  p_vigencia_inicio date,
  p_vigencia_fim date,
  p_bolsa_aprendizagem numeric
) returns public.atleta_contratos
language plpgsql
security definer
as $$
declare
  atualizado public.atleta_contratos;
begin
  update public.atleta_contratos
  set vigencia_inicio = p_vigencia_inicio,
      vigencia_fim = p_vigencia_fim,
      bolsa_aprendizagem = p_bolsa_aprendizagem
  where atleta_id = p_atleta_id and vigente and tipo_contrato = 'formacao'
  returning * into atualizado;

  if atualizado is null then
    raise exception 'Nenhum contrato de Formação vigente encontrado para este atleta.';
  end if;

  update public.atletas
  set data_fim_contrato = p_vigencia_fim
  where id = p_atleta_id;

  return atualizado;
end;
$$;

grant execute on function public.atualizar_contrato_formacao_vigente to authenticated;

notify pgrst, 'reload schema';
