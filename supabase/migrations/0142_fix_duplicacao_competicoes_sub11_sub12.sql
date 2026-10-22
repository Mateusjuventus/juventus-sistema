-- Corrige um erro meu: 0138_cadastro_competicoes_paulista_base_2026.sql criou competições novas
-- pra Sub-11 e Sub-12 sem checar que elas JÁ existiam no banco (criadas em 2026-10-07, antes desta
-- sessão — "Campeonato paulista sub 11 2026" id f9731c58-d4b5-4bbe-b4ae-58259e60a66e e
-- "Campeonato paulista sub 12 2026" id 63509fd3-6eae-44c0-ba11-6c167a2b157d). Resultado: cada
-- categoria ficou com 2 registros de competição. A antiga é a "oficial" — já tinha quase todos os
-- jogos vinculados antes desta sessão; a nova (criada por engano em 0138, ids
-- 10844b94-939b-44c8-88da-b17705df0ec0 / 82ccb746-4b25-4970-90f5-3bdee73076c8) só ficou com o
-- formato de partida/observação que cadastrei, os 4 prazos que vieram junto, e 1 jogo cada (o
-- único, por categoria, que 0141_vincular_jogos_antigos_campeonato_paulista_base_2026.sql não
-- achou já vinculado em nenhum lugar).
--
-- Esta migration: 1) leva o formato de partida (3 tempos, Art. 19-20) e a observação (Art. 43) pra
-- competição antiga de cada categoria; 2) corrige um typo de digitação na data_termino da antiga
-- de Sub-11 (2026-02-12, impossível por vir antes da data_inicio 2026-03-28 — o certo é
-- 2026-12-12, igual ao REC e à irmã Sub-12); 3) repassa o jogo e os prazos que foram parar nas
-- duplicadas pra competição antiga; 4) apaga as 2 competições duplicadas, agora sem vínculo nenhum.

update public.competicoes_base
set
  data_termino = '2026-12-12',
  regra_observacoes = 'Art. 43 do REC Sub-11/Sub-12: comissão técnica advertida com série de 3 cartões amarelos fica impedida de participar da partida subsequente desta competição (ver §§1-4 pras regras de acúmulo entre amarelo+vermelho na mesma partida e complementação de jogo suspenso).',
  numero_tempos = 3,
  duracao_tempo_1_minutos = 17,
  duracao_tempo_2_minutos = 17,
  duracao_tempo_3_minutos = 17,
  duracao_intervalo_minutos = 5,
  elenco_minimo_em_campo = 18,
  minutos_minimos_por_atleta = 17,
  regra_tempo_1 = 'somente_titulares',
  regra_tempo_2 = 'somente_reservas',
  regra_tempo_3 = 'livre_ilimitada'
where id = 'f9731c58-d4b5-4bbe-b4ae-58259e60a66e'; -- Campeonato paulista sub 11 2026 (antiga)

update public.competicoes_base
set
  regra_observacoes = 'Art. 43 do REC Sub-11/Sub-12: comissão técnica advertida com série de 3 cartões amarelos fica impedida de participar da partida subsequente desta competição (ver §§1-4 pras regras de acúmulo entre amarelo+vermelho na mesma partida e complementação de jogo suspenso).',
  numero_tempos = 3,
  duracao_tempo_1_minutos = 17,
  duracao_tempo_2_minutos = 17,
  duracao_tempo_3_minutos = 17,
  duracao_intervalo_minutos = 5,
  elenco_minimo_em_campo = 18,
  minutos_minimos_por_atleta = 17,
  regra_tempo_1 = 'somente_titulares',
  regra_tempo_2 = 'somente_reservas',
  regra_tempo_3 = 'livre_ilimitada'
where id = '63509fd3-6eae-44c0-ba11-6c167a2b157d'; -- Campeonato paulista sub 12 2026 (antiga)

-- Repassa jogos e prazos da duplicada pra competição antiga, antes de apagar a duplicada.
update public.competicao_jogos_base
set competicao_id = 'f9731c58-d4b5-4bbe-b4ae-58259e60a66e'
where competicao_id = '10844b94-939b-44c8-88da-b17705df0ec0';

update public.competicao_jogos_base
set competicao_id = '63509fd3-6eae-44c0-ba11-6c167a2b157d'
where competicao_id = '82ccb746-4b25-4970-90f5-3bdee73076c8';

update public.competicao_prazos_base
set competicao_id = 'f9731c58-d4b5-4bbe-b4ae-58259e60a66e'
where competicao_id = '10844b94-939b-44c8-88da-b17705df0ec0';

update public.competicao_prazos_base
set competicao_id = '63509fd3-6eae-44c0-ba11-6c167a2b157d'
where competicao_id = '82ccb746-4b25-4970-90f5-3bdee73076c8';

-- Apaga as duplicadas. Se sobrar alguma outra tabela referenciando esses ids (ex.: documentos,
-- inscrições) que eu não previ, o banco recusa o delete com erro de chave estrangeira em vez de
-- apagar silenciosamente — me avise se isso acontecer, que eu reviso.
delete from public.competicoes_base where id in (
  '10844b94-939b-44c8-88da-b17705df0ec0',
  '82ccb746-4b25-4970-90f5-3bdee73076c8'
);

-- Confira: deve sobrar só 1 linha por categoria agora, já com o formato de 3 tempos.
select id, nome, categoria, data_termino, numero_tempos, duracao_tempo_1_minutos,
       elenco_minimo_em_campo, minutos_minimos_por_atleta, regra_observacoes
from public.competicoes_base
where categoria in ('sub11', 'sub12')
order by categoria;
