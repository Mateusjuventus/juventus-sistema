-- Vigência do contrato PJ da Comissão Técnica/Diretoria — pedido do Mateus em 14/11/2026 (mesmo
-- dia do Setor livre): "preciso da vigência do contrato, quando for PJ". `data_inicio` (já existe,
-- 0164) vira o "Início" do par de Vigência quando `tipo_contrato` é "pj" (reaproveitado, sem
-- migração pra ele); esta coluna nova é só o "Término", que não existia antes. Pros demais tipos
-- de contrato (CLT/sem contrato), `data_inicio` continua sendo só "Quando iniciou", sem par — e
-- esta coluna fica `null` (ver `app/comissao-tecnica/actions.ts`, zerada quando não é PJ).

alter table public.comissao_tecnica
  add column data_fim date;

notify pgrst, 'reload schema';
