-- "Formação" deixa de ser um sub-flag de "Amador" (possui_contrato_formacao) e vira um valor
-- próprio de tipo_contrato, tanto no Profissional quanto na Base — pedido do Mateus depois de ver
-- que a tela de Atletas (resumo/filtros de Contrato) já tratava "Formação" como categoria própria
-- antes do redesign, e o filtro novo precisa contar/separar do mesmo jeito. Ver
-- docs/superpowers/specs/2026-09-09-atletas-resumo-filtros-design.md e a migração original
-- 0037_tipo_contrato_atletas.sql (que introduziu tipo_contrato e possui_contrato_formacao).
--
-- O campo possui_contrato_formacao continua existindo na tabela (não é removido aqui) — fica só
-- como histórico/campo legado; o formulário mantém o checkbox pra registros antigos de "Amador",
-- mas a partir de agora o jeito certo de cadastrar um atleta em formação é escolher "Formação"
-- direto no campo de Tipo de contrato.

-- 1) Libera "formacao" nas duas tabelas.
alter table public.atletas
  drop constraint if exists atletas_tipo_contrato_check;

alter table public.atletas
  add constraint atletas_tipo_contrato_check
  check (tipo_contrato is null or tipo_contrato in ('definitivo', 'emprestimo', 'amador', 'formacao'));

alter table public.atletas_base
  drop constraint if exists atletas_base_tipo_contrato_check;

alter table public.atletas_base
  add constraint atletas_base_tipo_contrato_check
  check (tipo_contrato is null or tipo_contrato in (
    'definitivo', 'emprestimo', 'amador', 'formacao', 'iniciacao'
  ));

-- 2) Migra quem já é "Amador" com "Contrato de formação" marcado como Sim pro novo valor
-- "formacao", nas duas tabelas — e desliga a flag antiga nesses registros (agora redundante: o
-- próprio tipo_contrato já diz que é formação).
update public.atletas
set tipo_contrato = 'formacao', possui_contrato_formacao = false
where tipo_contrato = 'amador' and possui_contrato_formacao = true;

update public.atletas_base
set tipo_contrato = 'formacao', possui_contrato_formacao = false
where tipo_contrato = 'amador' and possui_contrato_formacao = true;

-- Depois de rodar esta migração, use esta consulta pra conferir quantos atletas foram migrados em
-- cada tabela:
--
--   select count(*) from public.atletas where tipo_contrato = 'formacao';
--   select count(*) from public.atletas_base where tipo_contrato = 'formacao';
