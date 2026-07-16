-- Adiciona o tipo "Passagem Aérea" ao módulo de Solicitações, com os campos próprios desse tipo
-- (passageiro, origem, destino, data/horário do voo). Os outros tipos (Compra, Pagamento, Exame
-- Médico, Reembolso) não usam essas colunas — ficam nulas.
-- Aplicar via SQL editor do painel Supabase, depois de 0001 a 0017.

alter table public.solicitacoes drop constraint solicitacoes_tipo_check;
alter table public.solicitacoes add constraint solicitacoes_tipo_check
  check (tipo in ('compra', 'pagamento', 'exame_medico', 'reembolso', 'passagem_aerea'));

alter table public.solicitacoes add column passageiro text;
alter table public.solicitacoes add column origem text;
alter table public.solicitacoes add column destino text;
alter table public.solicitacoes add column data_voo date;
alter table public.solicitacoes add column horario_voo time;
