-- Remove as duas lesões duplicadas identificadas na migração 0120: Fernando (fibular longo E) e
-- Gabriel Félix (LCP D) tinham cada um duas linhas pra mesma lesão — uma sem data, vinda da
-- importação em texto do relatório em papel (0113/antes), e outra já com data real, criada quando
-- confirmamos que a lesão seguia em andamento (0114, corrigida com a data real na 0120). O Mateus
-- confirmou (01/10/2026) que são a mesma lesão em cada caso — fica só a linha com data, a sem data
-- é removida pra não aparecer duplicada na ficha do atleta nem nos relatórios.
--
-- Nenhum atendimento fica órfão: fisioterapia_atendimentos.lesao_id aponta pra fisioterapia_lesoes
-- com "on delete set null" (ver 0111) — se algum atendimento estiver ligado a uma dessas duas
-- linhas sem data, ele só perde o vínculo (vira "sessão solta"), não é apagado.

-- Confira antes de apagar: deve devolver as 2 linhas sem data abaixo.
select id, descricao, data_inicio, data_fim
from public.fisioterapia_lesoes
where id in (
  '31789a69-9af9-4bd4-859c-26200315f2c1', -- Fernando Fonseca Ferreira — lesão do fibular longo E (duplicada, sem data)
  'f3f3801f-bf64-45ac-a37b-4fc0bef14293'  -- Gabriel Luis Gonçalves Felix — lesão parcial do ligamento cruzado posterior D (duplicada, sem data)
);

delete from public.fisioterapia_lesoes
where id in (
  '31789a69-9af9-4bd4-859c-26200315f2c1',
  'f3f3801f-bf64-45ac-a37b-4fc0bef14293'
);

notify pgrst, 'reload schema';
