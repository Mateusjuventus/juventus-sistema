-- O resumo geral da temporada (fisioterapia_historico_importado, atleta_id nulo — aparece no topo
-- do Relatório Geral de Fisioterapia) ainda descrevia os tipos de lesão com a classificação antiga
-- do relatório em papel ("lesões musculares 6, entorse de tornozelo 6, traumática 3"), separada da
-- classificação unificada de 6 categorias aplicada no resto do sistema (onde "entorse de tornozelo"
-- é tipo Lesão ligamentar, não uma categoria própria) — por isso o Mateus via esse bloco como
-- "pegando referência do arquivo antigo". Troca a linha pelos totais reais, já na classificação
-- unificada, conferidos com `select tipo, count(*) from fisioterapia_lesoes group by tipo` em
-- 01/10/2026: ligamentar 8, muscular 6, trauma 3, ósseo 2, tendínea/fascial 1 (total 20 lesões).

-- Confira antes: deve devolver 1 linha, com a linha antiga "Tipos de lesões: lesões musculares 6,
-- entorse de tornozelo 6, traumática 3." ainda presente no resumo.
select id, resumo
from public.fisioterapia_historico_importado
where atleta_id is null
  and titulo = 'Copa Paulista 2026 — resumo do período';

update public.fisioterapia_historico_importado
set resumo = replace(
  resumo,
  'Tipos de lesões: lesões musculares 6, entorse de tornozelo 6, traumática 3.',
  'Tipos de lesões (classificação unificada do sistema): Lesão ligamentar 8, Muscular 6, Trauma 3, Ósseo 2, Dor tendínea/fascial 1.'
)
where atleta_id is null
  and titulo = 'Copa Paulista 2026 — resumo do período';

-- Confira depois: a linha deve ter sido trocada (compare com a consulta de cima).
select id, resumo
from public.fisioterapia_historico_importado
where atleta_id is null
  and titulo = 'Copa Paulista 2026 — resumo do período';

notify pgrst, 'reload schema';
