-- Mesmo caso da migração 0121: Maycon Douglas tinha duas linhas pra mesma lesão (LCA joelho D) —
-- uma sem data, vinda da importação em texto do relatório em papel, e outra já com data real
-- (2026-01-22, criada na migração 0114). O Mateus confirmou (01/10/2026) que é a mesma lesão —
-- fica só a linha com data.
--
-- Nenhum atendimento fica órfão: fisioterapia_atendimentos.lesao_id aponta pra fisioterapia_lesoes
-- com "on delete set null" (ver 0111) — se algum atendimento estiver ligado à linha sem data, ele
-- só perde o vínculo (vira "sessão solta"), não é apagado.

-- Confira antes de apagar: deve devolver a linha sem data abaixo.
select id, descricao, data_inicio, data_fim
from public.fisioterapia_lesoes
where id = '4dc415e2-e32a-43e8-82ef-0766e8420beb'; -- Maycon Douglas Oliveira Silva — pós-operatório de LCA joelho D (duplicada, sem data)

delete from public.fisioterapia_lesoes
where id = '4dc415e2-e32a-43e8-82ef-0766e8420beb';

notify pgrst, 'reload schema';
