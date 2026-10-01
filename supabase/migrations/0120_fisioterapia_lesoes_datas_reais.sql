-- Completa com as datas reais (entrada no Depto. Médico / liberado) as lesões que vieram do
-- relatório em papel sem data exata (ver 0115) — pedido do Mateus depois de notar que o Relatório
-- Geral de Fisioterapia mostrava "Dias afastado" errado pra quase todo mundo: a coluna só soma
-- lesões com data_inicio/data_fim reais (ver `montarResumoGeralFisioterapia` em
-- lib/futebol/fisioterapia.ts), e as importadas do papel não tinham data — por isso o total saía
-- bem menor que a realidade (ou zerado), não porque o cálculo estivesse errado.
--
-- Atualiza por `id` (não por nome/descrição) — mesmo cuidado já aplicado nas migrações 0118/0119
-- desta mesma tabela, depois do problema de UPDATE por texto silenciosamente não achar a linha.
--
-- Duas lesões já ativas (Fernando — fibular longo E; Gabriel Félix — LCP D) tinham uma data de
-- início ESTIMADA (calculada contando pra trás a partir do relatório de 23/09, ver 0114) — o Mateus
-- deu agora a data real de entrada de cada uma, então a estimativa é substituída pela data certa
-- (a observação antiga, que citava a conta estimada, também é atualizada pra não ficar
-- contraditória). Nenhuma das duas tem liberado ainda — continuam em andamento (`data_fim` nula).

update public.fisioterapia_lesoes set data_inicio = '2026-06-18', data_fim = '2026-06-29'
  where id = 'e58a8928-94c6-4d54-a0cc-26e8725fd0c6'; -- Keven Vinicius Duarte Silva — lesão grau II de reto femoral D

update public.fisioterapia_lesoes set data_inicio = '2026-06-30', data_fim = '2026-07-08'
  where id = 'c602752c-8ba0-4ac6-b213-1521878aee70'; -- Andrew Lucas Balbino Drummond — edema póstero lateral joelho E

update public.fisioterapia_lesoes set data_inicio = '2026-06-30', data_fim = '2026-07-08'
  where id = '07f85cb7-278c-48e4-9596-150f5957ac72'; -- Romário Simões de Oliveira Santos — entorse de tornozelo D

update public.fisioterapia_lesoes
  set data_inicio = '2026-06-01',
      data_fim = '2026-07-27',
      observacoes = 'Liberado do RoboFoot em 13/07/2026; liberado para atividade plena em 27/07/2026.'
  where id = '345b6420-0845-4da5-a0a7-7c3bd03dd589'; -- Felipe Santos da Silva (Felipinho) — fratura do 5º metatarso E

update public.fisioterapia_lesoes set data_inicio = '2026-07-03', data_fim = '2026-07-14'
  where id = 'b111eb73-5ef0-48d8-b105-f50ea1ab5924'; -- Lucas dos Santos Lopes — entorse de tornozelo E

update public.fisioterapia_lesoes set data_inicio = '2026-08-01', data_fim = '2026-08-10'
  where id = '856572ca-4733-40ed-83a1-880194f4966e'; -- Matheus Ferreira de Souza — edema no músculo reto femoral D

update public.fisioterapia_lesoes set data_inicio = '2026-08-12', data_fim = '2026-08-31'
  where id = 'a0a8a1bc-5ecf-4043-859c-8d2f13cb9dd3'; -- Matheus Ferreira de Souza — lesão grau I no reto femoral D

update public.fisioterapia_lesoes set data_inicio = '2026-08-16', data_fim = '2026-09-09'
  where id = '58e302d2-7984-4dd3-bfef-d9291fe7d78e'; -- Andrew Lucas Balbino Drummond — lesão grau II de bíceps femoral E

update public.fisioterapia_lesoes
  set data_inicio = '2026-08-21',
      data_fim = null,
      observacoes = 'Entrada no Depto. Médico em 21/08/2026; cirurgia realizada em 01/09/2026. Ainda em andamento.'
  where id = '60fe4b55-32c1-4afd-ba60-cf4e30e39e01'; -- Fernando Fonseca Ferreira — Lesão do fibular longo E (pós-operatório) — data de entrada corrigida (era estimativa)

update public.fisioterapia_lesoes set data_inicio = '2026-09-09', data_fim = '2026-09-18'
  where id = 'f927c2f2-52ef-4ddb-84cf-d63914cb290b'; -- Leonardo Henriques Coelho (Léo Coelho) — lesão grau I reto femoral D

update public.fisioterapia_lesoes
  set data_inicio = '2026-09-19',
      data_fim = null,
      observacoes = 'Entrada no Depto. Médico em 19/09/2026. Ainda em andamento.'
  where id = 'ce0236a6-3aa8-4b56-81b0-2e09dd80e501'; -- Gabriel Luis Gonçalves Felix — Lesão parcial do ligamento cruzado posterior (LCP) D — data de entrada corrigida (era estimativa)

-- Confira: as 11 linhas acima devem aparecer com data_inicio preenchida (e data_fim preenchida,
-- exceto Fernando e Gabriel Félix, que continuam em andamento).
select id, descricao, data_inicio, data_fim, observacoes
from public.fisioterapia_lesoes
where id in (
  'e58a8928-94c6-4d54-a0cc-26e8725fd0c6',
  'c602752c-8ba0-4ac6-b213-1521878aee70',
  '07f85cb7-278c-48e4-9596-150f5957ac72',
  '345b6420-0845-4da5-a0a7-7c3bd03dd589',
  'b111eb73-5ef0-48d8-b105-f50ea1ab5924',
  '856572ca-4733-40ed-83a1-880194f4966e',
  'a0a8a1bc-5ecf-4043-859c-8d2f13cb9dd3',
  '58e302d2-7984-4dd3-bfef-d9291fe7d78e',
  '60fe4b55-32c1-4afd-ba60-cf4e30e39e01',
  'f927c2f2-52ef-4ddb-84cf-d63914cb290b',
  'ce0236a6-3aa8-4b56-81b0-2e09dd80e501'
)
order by data_inicio;

-- Lookup pra eu conseguir inserir as duas lesões do Luiz Gustavo (não existem ainda na tabela —
-- ver mensagem no chat): rode esta consulta e me mande o resultado (espero 1 única linha).
select id, nome_completo, apelido, ativo
from public.atletas
where unaccent(nome_completo) ilike '%luiz%gustavo%' or unaccent(apelido) ilike '%luiz%gustavo%';

notify pgrst, 'reload schema';
