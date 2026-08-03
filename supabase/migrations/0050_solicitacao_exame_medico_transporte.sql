-- Exame Médico ganha itens de verdade (nome do paciente, exame, data, local e uma opção de
-- transporte de ida e volta) — hoje esse tipo de solicitação não guarda nenhuma informação
-- estruturada, só a "Descrição da necessidade" genérica.
--
-- Reaproveita colunas já existentes na tabela de itens pra Nome do Paciente (passageiro), Exame
-- (item), Observação (observacao) e o trecho de IDA do transporte (origem/destino/data_voo/
-- horario_voo, já usadas por Passagem Aérea/Transporte e não usadas por Exame Médico) — só os
-- campos exclusivos do exame e o trecho de VOLTA são colunas novas.
--
-- Aplicar via SQL editor do painel Supabase.

alter table public.solicitacao_itens add column if not exists data_exame date;
alter table public.solicitacao_itens add column if not exists local_exame text;
alter table public.solicitacao_itens add column if not exists houve_transporte boolean not null default false;
alter table public.solicitacao_itens add column if not exists origem_volta text;
alter table public.solicitacao_itens add column if not exists destino_volta text;
alter table public.solicitacao_itens add column if not exists data_volta date;
alter table public.solicitacao_itens add column if not exists horario_volta time;

alter table public.solicitacao_itens_base add column if not exists data_exame date;
alter table public.solicitacao_itens_base add column if not exists local_exame text;
alter table public.solicitacao_itens_base add column if not exists houve_transporte boolean not null default false;
alter table public.solicitacao_itens_base add column if not exists origem_volta text;
alter table public.solicitacao_itens_base add column if not exists destino_volta text;
alter table public.solicitacao_itens_base add column if not exists data_volta date;
alter table public.solicitacao_itens_base add column if not exists horario_volta time;
