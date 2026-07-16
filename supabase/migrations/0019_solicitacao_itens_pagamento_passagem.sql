-- Generaliza solicitacao_itens pra suportar itens de Pagamento/Reembolso (descrição, observação,
-- valor) e Passagem Aérea (passageiro, origem, destino, data/horário do voo, observação), além dos
-- itens de Compra (quantidade, item, foto) que já existiam. quantidade/item viram opcionais, já
-- que só são usados quando a solicitação é do tipo Compra.
alter table public.solicitacao_itens alter column quantidade drop not null;
alter table public.solicitacao_itens alter column item drop not null;

alter table public.solicitacao_itens add column descricao text;
alter table public.solicitacao_itens add column observacao text;
alter table public.solicitacao_itens add column valor numeric(10, 2);
alter table public.solicitacao_itens add column passageiro text;
alter table public.solicitacao_itens add column origem text;
alter table public.solicitacao_itens add column destino text;
alter table public.solicitacao_itens add column data_voo date;
alter table public.solicitacao_itens add column horario_voo time;

-- Os campos de passagem aérea que ficavam direto na solicitação (migração 0018) agora vivem em
-- solicitacao_itens (uma linha por passageiro/trecho, já que uma solicitação pode ter vários
-- passageiros) — as colunas abaixo continuam existindo em solicitacoes sem problema, só deixam de
-- ser preenchidas em solicitações novas.
-- passageiro / origem / destino / data_voo / horario_voo (solicitacoes)
