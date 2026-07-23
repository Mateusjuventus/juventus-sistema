-- Adiciona dois novos tipos de Solicitação: "Transporte" e "Hospedagem" (Profissional e Base).
--
-- Transporte reaproveita as mesmas colunas de Passagem Aérea em solicitacao_itens/_base
-- (passageiro/origem/destino/data_voo/horario_voo), mais o campo valor (já existente) — é um tipo
-- de solicitação separado de Passagem Aérea, só com o mesmo formato de campos.
--
-- Hospedagem precisa de 5 colunas novas: cidade, hotel, data_entrada, data_saida, tipo_acomodacao.

alter table public.solicitacoes drop constraint if exists solicitacoes_tipo_check;
alter table public.solicitacoes add constraint solicitacoes_tipo_check
  check (tipo in ('compra', 'pagamento', 'exame_medico', 'reembolso', 'passagem_aerea', 'transporte', 'hospedagem'));

alter table public.solicitacoes_base drop constraint if exists solicitacoes_base_tipo_check;
alter table public.solicitacoes_base add constraint solicitacoes_base_tipo_check
  check (tipo in ('compra', 'pagamento', 'exame_medico', 'reembolso', 'passagem_aerea', 'transporte', 'hospedagem'));

alter table public.solicitacao_itens
  add column if not exists cidade text,
  add column if not exists hotel text,
  add column if not exists data_entrada date,
  add column if not exists data_saida date,
  add column if not exists tipo_acomodacao text;

alter table public.solicitacao_itens_base
  add column if not exists cidade text,
  add column if not exists hotel text,
  add column if not exists data_entrada date,
  add column if not exists data_saida date,
  add column if not exists tipo_acomodacao text;
