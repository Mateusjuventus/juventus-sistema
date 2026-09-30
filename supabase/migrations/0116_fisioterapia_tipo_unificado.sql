-- Unifica a classificação de Lesões e Queixas da Fisioterapia numa taxonomia só, correta de
-- verdade — o campo "tipo" existia só em Queixas (muscular/articular) e não representava o que o
-- Mateus realmente usa no relatório em papel do departamento (Relatorio_Fisioterapia_2.pdf):
-- MUSCULAR, DOR ARTICULAR, DOR TENDÍNEA/FASCIAL, LESÕES LIGAMENTARES, ÓSSEO, TRAUMA. Lesões nunca
-- tinham "tipo" nenhum. Esta migração:
--   1) cria o "tipo" em Lesões (nova coluna) e amplia o "tipo" de Queixas pra essas 6 categorias;
--   2) reclassifica TODOS os 23 registros de Lesões e 81 de Queixas já importados do histórico em
--      papel (Copa Paulista 2026), cruzando exatamente com o que aquele relatório mostra por
--      categoria (contagens batem: Dor tendínea/fascial = 15, Lesões ligamentares = 2 em Queixas —
--      as duas categorias mais específicas do documento, validação de que a régua de classificação
--      está certa antes de aplicar nas demais).
-- O campo continua editável pela tela nos dois formulários (Nova lesão/Nova queixa) e ganha edição
-- também nos já lançados — ver app/departamento-medico/fisioterapia/[atletaId]/actions.ts.
--
-- A trava final (NOT NULL em fisioterapia_lesoes.tipo) é a migração SEGUINTE (0117), de propósito —
-- ver o comentário no fim deste arquivo.

-- =====================================================================================
-- PARTE 1 — schema: novo tipo em Lesões, tipo de Queixas ampliado pras 6 categorias
-- =====================================================================================

-- Nullable por enquanto — a Parte 2 preenche todos os registros existentes antes da Parte 3
-- travar com NOT NULL, pra nunca deixar a coluna num estado inconsistente no meio do caminho.
alter table public.fisioterapia_lesoes add column if not exists tipo text;
alter table public.fisioterapia_lesoes
  add constraint fisioterapia_lesoes_tipo_check
  check (tipo in ('muscular', 'articular', 'tendinea_fascial', 'ligamentar', 'osseo', 'trauma'));

alter table public.fisioterapia_queixas drop constraint if exists fisioterapia_queixas_tipo_check;
alter table public.fisioterapia_queixas
  add constraint fisioterapia_queixas_tipo_check
  check (tipo in ('muscular', 'articular', 'tendinea_fascial', 'ligamentar', 'osseo', 'trauma'));

-- =====================================================================================
-- PARTE 2 — reclassificação dos registros já existentes (histórico em papel, Copa Paulista 2026)
-- =====================================================================================

-- Lesões importadas do histórico (20 registros, ver migração 0113/insert_estruturado.sql) —
-- casadas por atleta_id (via fisioterapia_historico_importado) + descricao exata, igual ao padrão
-- de segurança já usado nesta sessão (nunca por nome, sempre por uma chave que não erra de atleta).
with mapa (historico_id, descricao, tipo_novo) as (
  values
    ('8f438dfc-629a-417d-b428-31fd0bf83776'::uuid, 'edema póstero lateral joelho E', 'trauma'),
    ('8f438dfc-629a-417d-b428-31fd0bf83776'::uuid, 'lesão grau II de bíceps femoral E', 'muscular'),
    ('881eeb9a-8fb7-460d-b835-6d5f4ca05815'::uuid, 'entorse de tornozelo E', 'ligamentar'),
    ('50605141-9137-4bcb-89b1-42ca678d3922'::uuid, 'fratura do 5º metatarso E', 'osseo'),
    ('be289d47-bdf6-4cff-b395-3974402b8a07'::uuid, 'entorse de tornozelo E', 'ligamentar'),
    ('be289d47-bdf6-4cff-b395-3974402b8a07'::uuid, 'lesão do fibular longo E', 'tendinea_fascial'),
    ('387d8b92-bbdb-43f9-9e99-947bdc9d2ab2'::uuid, 'entorse de tornozelo E', 'ligamentar'),
    ('387d8b92-bbdb-43f9-9e99-947bdc9d2ab2'::uuid, 'lesão parcial do ligamento cruzado posterior D', 'ligamentar'),
    ('5c4b27d2-d977-4647-b5f6-d3086d7cfdf1'::uuid, 'trauma na panturrilha D', 'trauma'),
    ('a6568c5a-bc1b-439e-b9eb-fcf2653ba1f3'::uuid, 'lesão grau II de reto femoral D', 'muscular'),
    ('951381af-f038-4bfc-a5ec-756a282d00fe'::uuid, 'lesão grau I reto femoral D', 'muscular'),
    ('1c9410c2-4c08-4987-9766-039d05356620'::uuid, 'entorse de tornozelo E', 'ligamentar'),
    ('aef2d63e-ece0-4b09-9dc3-6e0e58d1cf7c'::uuid, 'edema no músculo adutor D', 'muscular'),
    ('fee19757-8d27-4b1f-b5e2-1958d4de7c99'::uuid, 'trauma na perna E', 'trauma'),
    ('fee19757-8d27-4b1f-b5e2-1958d4de7c99'::uuid, 'edema no músculo reto femoral D', 'muscular'),
    ('fee19757-8d27-4b1f-b5e2-1958d4de7c99'::uuid, 'lesão grau I no reto femoral D', 'muscular'),
    ('da98a6cb-c6dc-4ad4-89f0-2f047b22d308'::uuid, 'entorse de tornozelo D', 'ligamentar'),
    ('3fdcb38d-11c7-4291-a072-7ca78e1e075a'::uuid, 'pós-operatório de LCA joelho D', 'ligamentar'),
    ('3bb87336-3a6b-4ec0-bcc3-9d2486911063'::uuid, 'fratura do 4º dedo da mão esquerda', 'osseo'),
    ('dfcc65ad-8a3a-4467-8951-2164eefe0188'::uuid, 'entorse de tornozelo D', 'ligamentar')
)
update public.fisioterapia_lesoes l
set tipo = mapa.tipo_novo
from mapa
join public.fisioterapia_historico_importado h on h.id = mapa.historico_id
where l.atleta_id = h.atleta_id and l.descricao = mapa.descricao;

-- Lesões ATIVAS lançadas direto por atleta_id (Gabriel Félix, Fernando, Maycon Douglas — migração
-- 0114, sem passar por fisioterapia_historico_importado).
update public.fisioterapia_lesoes set tipo = 'ligamentar'
  where atleta_id = '28748b9c-3f3d-4e61-88f9-59d8780422f7'::uuid
    and descricao = 'Lesão parcial do ligamento cruzado posterior (LCP) D';
update public.fisioterapia_lesoes set tipo = 'tendinea_fascial'
  where atleta_id = 'efe4b258-946a-4804-96d1-7e0714700e3e'::uuid
    and descricao = 'Lesão do fibular longo E (pós-operatório)';
update public.fisioterapia_lesoes set tipo = 'ligamentar'
  where atleta_id = '5a54696b-06e2-4fd1-8b9c-b69e9e8cbe73'::uuid
    and descricao = 'Lesão do ligamento cruzado anterior (LCA) D (pós-operatório)';

-- Queixas importadas do histórico (81 registros) — troca o "muscular"/"articular" original pela
-- categoria correta das 6, na mesma lógica de casamento por atleta_id + descricao exata.
with mapa (historico_id, descricao, tipo_novo) as (
  values
    ('8f438dfc-629a-417d-b428-31fd0bf83776'::uuid, 'mialgia no adutor D', 'muscular'),
    ('8f438dfc-629a-417d-b428-31fd0bf83776'::uuid, 'fasceite plantar E', 'tendinea_fascial'),
    ('8f438dfc-629a-417d-b428-31fd0bf83776'::uuid, 'desconforto no Ligamento Colateral Lateral joelho E', 'ligamentar'),
    ('8f438dfc-629a-417d-b428-31fd0bf83776'::uuid, 'mialgia no reto femoral D', 'muscular'),
    ('881eeb9a-8fb7-460d-b835-6d5f4ca05815'::uuid, 'desconforto tornozelo E', 'articular'),
    ('881eeb9a-8fb7-460d-b835-6d5f4ca05815'::uuid, 'desconforto tendão calcâneo E', 'tendinea_fascial'),
    ('881eeb9a-8fb7-460d-b835-6d5f4ca05815'::uuid, 'lombalgia', 'articular'),
    ('881eeb9a-8fb7-460d-b835-6d5f4ca05815'::uuid, 'mialgia no adutor D', 'muscular'),
    ('881eeb9a-8fb7-460d-b835-6d5f4ca05815'::uuid, 'lombalgia lado E', 'articular'),
    ('faba8424-d318-4988-9a56-7819ba77871f'::uuid, 'canelite bilateral', 'osseo'),
    ('faba8424-d318-4988-9a56-7819ba77871f'::uuid, 'fasceite plantar bilateral', 'tendinea_fascial'),
    ('faba8424-d318-4988-9a56-7819ba77871f'::uuid, 'desconforto no Ligamento Colateral Medial do joelho E', 'ligamentar'),
    ('faba8424-d318-4988-9a56-7819ba77871f'::uuid, 'mialgia no adutor D', 'muscular'),
    ('faba8424-d318-4988-9a56-7819ba77871f'::uuid, 'mialgia na posterior D', 'muscular'),
    ('faba8424-d318-4988-9a56-7819ba77871f'::uuid, 'mialgia na panturrilha D', 'muscular'),
    ('f2581128-ee32-4676-8d8d-04f29a4ce8f9'::uuid, 'desconforto pé E', 'articular'),
    ('f2581128-ee32-4676-8d8d-04f29a4ce8f9'::uuid, 'desconforto no tornozelo E', 'articular'),
    ('f2581128-ee32-4676-8d8d-04f29a4ce8f9'::uuid, 'fasceite plantar E', 'tendinea_fascial'),
    ('f2581128-ee32-4676-8d8d-04f29a4ce8f9'::uuid, 'mialgia posterior D', 'muscular'),
    ('f2581128-ee32-4676-8d8d-04f29a4ce8f9'::uuid, 'desconforto região torácica E', 'articular'),
    ('f2581128-ee32-4676-8d8d-04f29a4ce8f9'::uuid, 'mialgia no adutor D', 'muscular'),
    ('4c4f6324-50de-4d00-be66-992442c61b28'::uuid, 'mialgia posterior E', 'muscular'),
    ('4c4f6324-50de-4d00-be66-992442c61b28'::uuid, 'tendinite patelar joelho D', 'tendinea_fascial'),
    ('50605141-9137-4bcb-89b1-42ca678d3922'::uuid, 'mialgia no reto femoral D', 'muscular'),
    ('be289d47-bdf6-4cff-b395-3974402b8a07'::uuid, 'mialgia na panturrilha D', 'muscular'),
    ('be289d47-bdf6-4cff-b395-3974402b8a07'::uuid, 'fasceite plantar bilateral', 'tendinea_fascial'),
    ('be289d47-bdf6-4cff-b395-3974402b8a07'::uuid, 'fasceite plantar E', 'tendinea_fascial'),
    ('be289d47-bdf6-4cff-b395-3974402b8a07'::uuid, 'desconforto no tornozelo E', 'articular'),
    ('387d8b92-bbdb-43f9-9e99-947bdc9d2ab2'::uuid, 'desconforto nos tornozelos D e E', 'articular'),
    ('387d8b92-bbdb-43f9-9e99-947bdc9d2ab2'::uuid, 'desconforto na região torácica E', 'articular'),
    ('5c4b27d2-d977-4647-b5f6-d3086d7cfdf1'::uuid, 'mialgia na posterior D', 'muscular'),
    ('a6568c5a-bc1b-439e-b9eb-fcf2653ba1f3'::uuid, 'mialgia adutor D', 'muscular'),
    ('a6568c5a-bc1b-439e-b9eb-fcf2653ba1f3'::uuid, 'desconforto próximo à pata de ganso D', 'tendinea_fascial'),
    ('b24f30cf-89d6-4e99-97ac-8ded19543e5c'::uuid, 'incômodo panturrilha bilateral', 'muscular'),
    ('b24f30cf-89d6-4e99-97ac-8ded19543e5c'::uuid, 'incômodo ombro E', 'articular'),
    ('b24f30cf-89d6-4e99-97ac-8ded19543e5c'::uuid, 'incômodo cotovelo E', 'articular'),
    ('951381af-f038-4bfc-a5ec-756a282d00fe'::uuid, 'torcicolo', 'articular'),
    ('a72592a9-f07d-46dd-bcf1-76764e18b0d8'::uuid, 'desconforto no tornozelo E', 'articular'),
    ('a72592a9-f07d-46dd-bcf1-76764e18b0d8'::uuid, 'mialgia adutor D', 'muscular'),
    ('a72592a9-f07d-46dd-bcf1-76764e18b0d8'::uuid, 'mialgia na posterior E', 'muscular'),
    ('a72592a9-f07d-46dd-bcf1-76764e18b0d8'::uuid, 'tendinite patelar joelho E', 'tendinea_fascial'),
    ('a72592a9-f07d-46dd-bcf1-76764e18b0d8'::uuid, 'mialgia adutor E', 'muscular'),
    ('a72592a9-f07d-46dd-bcf1-76764e18b0d8'::uuid, 'mialgia no glúteo E', 'muscular'),
    ('a72592a9-f07d-46dd-bcf1-76764e18b0d8'::uuid, 'desconforto no pé E', 'articular'),
    ('1c9410c2-4c08-4987-9766-039d05356620'::uuid, 'mialgia na panturrilha E', 'muscular'),
    ('1c9410c2-4c08-4987-9766-039d05356620'::uuid, 'mialgia na região posterior E', 'muscular'),
    ('1c9410c2-4c08-4987-9766-039d05356620'::uuid, 'mialgia panturrilha D', 'muscular'),
    ('aef2d63e-ece0-4b09-9dc3-6e0e58d1cf7c'::uuid, 'dor ombro E', 'articular'),
    ('aef2d63e-ece0-4b09-9dc3-6e0e58d1cf7c'::uuid, 'desconforto no tendão patelar E', 'tendinea_fascial'),
    ('aef2d63e-ece0-4b09-9dc3-6e0e58d1cf7c'::uuid, 'mialgia no adutor D', 'muscular'),
    ('aef2d63e-ece0-4b09-9dc3-6e0e58d1cf7c'::uuid, 'mialgia posterior E', 'muscular'),
    ('aef2d63e-ece0-4b09-9dc3-6e0e58d1cf7c'::uuid, 'desconforto tornozelo D', 'articular'),
    ('aef2d63e-ece0-4b09-9dc3-6e0e58d1cf7c'::uuid, 'mialgia no iliopsoas D', 'muscular'),
    ('aef2d63e-ece0-4b09-9dc3-6e0e58d1cf7c'::uuid, 'desconforto no reto femoral D', 'muscular'),
    ('fee19757-8d27-4b1f-b5e2-1958d4de7c99'::uuid, 'mialgia no adutor D', 'muscular'),
    ('fee19757-8d27-4b1f-b5e2-1958d4de7c99'::uuid, 'mialgia no reto femoral D', 'muscular'),
    ('fee19757-8d27-4b1f-b5e2-1958d4de7c99'::uuid, 'desconforto pé D', 'articular'),
    ('fee19757-8d27-4b1f-b5e2-1958d4de7c99'::uuid, 'mialgia no adutor E', 'muscular'),
    ('fee19757-8d27-4b1f-b5e2-1958d4de7c99'::uuid, 'desconforto no tendão patelar D', 'tendinea_fascial'),
    ('da98a6cb-c6dc-4ad4-89f0-2f047b22d308'::uuid, 'tendinite patelar joelho E', 'tendinea_fascial'),
    ('da98a6cb-c6dc-4ad4-89f0-2f047b22d308'::uuid, 'mialgia posterior E', 'muscular'),
    ('da98a6cb-c6dc-4ad4-89f0-2f047b22d308'::uuid, 'desconforto pé D', 'articular'),
    ('da98a6cb-c6dc-4ad4-89f0-2f047b22d308'::uuid, 'fasceite plantar D', 'tendinea_fascial'),
    ('8791b659-31a7-4ed2-8e7d-85fa4eda2120'::uuid, 'desconforto no tornozelo E', 'articular'),
    ('8791b659-31a7-4ed2-8e7d-85fa4eda2120'::uuid, 'desconforto na região do calcâneo E', 'osseo'),
    ('8791b659-31a7-4ed2-8e7d-85fa4eda2120'::uuid, 'desconforto região da fíbula D', 'osseo'),
    ('8791b659-31a7-4ed2-8e7d-85fa4eda2120'::uuid, 'mialgia na panturrilha D', 'muscular'),
    ('8791b659-31a7-4ed2-8e7d-85fa4eda2120'::uuid, 'fadiga muscular em membros inferiores', 'muscular'),
    ('8791b659-31a7-4ed2-8e7d-85fa4eda2120'::uuid, 'desconforto no pé D', 'articular'),
    ('3bb87336-3a6b-4ec0-bcc3-9d2486911063'::uuid, '4º dedo da mão esquerda', 'articular'),
    ('dfcc65ad-8a3a-4467-8951-2164eefe0188'::uuid, 'tendinite patelar joelho E', 'tendinea_fascial'),
    ('a3072031-d697-4f91-a1b0-440b27f80315'::uuid, 'mialgia adutor D', 'muscular'),
    ('a3072031-d697-4f91-a1b0-440b27f80315'::uuid, 'mialgia adutor E', 'muscular'),
    ('a3072031-d697-4f91-a1b0-440b27f80315'::uuid, 'mialgia reto femoral D', 'muscular'),
    ('c3d77dc7-f4e2-47da-be4e-c7aa59a73e51'::uuid, 'mialgia bíceps femoral D', 'muscular'),
    ('c3d77dc7-f4e2-47da-be4e-c7aa59a73e51'::uuid, 'trauma tornozelo D', 'trauma'),
    ('c3d77dc7-f4e2-47da-be4e-c7aa59a73e51'::uuid, 'mialgia lombar', 'muscular'),
    ('c3d77dc7-f4e2-47da-be4e-c7aa59a73e51'::uuid, 'mialgia no adutor D', 'muscular'),
    ('c3d77dc7-f4e2-47da-be4e-c7aa59a73e51'::uuid, 'desconforto no pé E', 'articular'),
    ('c3d77dc7-f4e2-47da-be4e-c7aa59a73e51'::uuid, 'desconforto no tornozelo D', 'articular'),
    ('c3d77dc7-f4e2-47da-be4e-c7aa59a73e51'::uuid, 'fasceite plantar D', 'tendinea_fascial')
)
update public.fisioterapia_queixas q
set tipo = mapa.tipo_novo
from mapa
join public.fisioterapia_historico_importado h on h.id = mapa.historico_id
where q.atleta_id = h.atleta_id and q.descricao = mapa.descricao;

-- Confira o resultado das duas consultas abaixo — devem devolver 0. Se alguma vier > 0, NÃO rode
-- a migração 0117 ainda: mande o resultado da consulta de diagnóstico (ver comentário no início da
-- 0117) pra investigar antes de travar a coluna com NOT NULL.
--
-- IMPORTANTE: esta migração (0116) termina aqui, de propósito — ela NÃO trava a coluna com NOT
-- NULL. Isso porque o SQL Editor do Supabase roda o script inteiro colado como uma transação só:
-- se a trava (NOT NULL) falhasse por sobrar algum registro sem tipo, TUDO seria desfeito de volta,
-- inclusive a coluna e a reclassificação já feitas aqui em cima. Por isso a trava vira a migração
-- 0117, separada, rodada só depois de confirmar as duas contagens abaixo em 0.
select count(*) as lesoes_sem_tipo from public.fisioterapia_lesoes where tipo is null;
select count(*) as queixas_sem_tipo from public.fisioterapia_queixas where tipo is null;

notify pgrst, 'reload schema';
