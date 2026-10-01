-- As seções de "incômodos" do resumo geral (fisioterapia_historico_importado, atleta_id nulo)
-- usavam nomes inventados na hora da importação ("Incômodos musculares", "Incômodos articulares",
-- "Incômodo tendíneo/fascial", "Incômodo ligamentar", "Incômodo ósseo", "Incômodo trauma") que não
-- aparecem em lugar nenhum do relatório em papel — o Mateus mostrou print do documento confirmando
-- (01/10/2026). No documento (e no resto do sistema, em `FISIOTERAPIA_TIPO_OPTIONS`, lib/futebol/
-- fisioterapia.ts) os 6 nomes são: Muscular, Dor articular, Dor tendínea/fascial, Lesão ligamentar,
-- Ósseo, Trauma. Troca os cabeçalhos pra usar exatamente esses nomes.

-- Confira antes: deve devolver 1 linha, ainda com "Incômodos musculares" etc.
select id, resumo
from public.fisioterapia_historico_importado
where atleta_id is null
  and titulo = 'Copa Paulista 2026 — resumo do período';

update public.fisioterapia_historico_importado
set resumo = replace(
  replace(
    replace(
      replace(
        replace(
          replace(resumo, 'Incômodos musculares: 43 casos.', 'Muscular: 43 casos.'),
          'Incômodos articulares: 17 casos.', 'Dor articular: 17 casos.'
        ),
        'Incômodo tendíneo/fascial: 15 casos.', 'Dor tendínea/fascial: 15 casos.'
      ),
      'Incômodo ligamentar: 2 casos.', 'Lesão ligamentar: 2 casos.'
    ),
    'Incômodo ósseo: 4 casos.', 'Ósseo: 4 casos.'
  ),
  'Incômodo trauma: 3 casos.', 'Trauma: 3 casos.'
)
where atleta_id is null
  and titulo = 'Copa Paulista 2026 — resumo do período';

-- Confira depois: nenhuma das 6 seções deve mais começar com "Incômodo".
select id, resumo
from public.fisioterapia_historico_importado
where atleta_id is null
  and titulo = 'Copa Paulista 2026 — resumo do período';

notify pgrst, 'reload schema';
