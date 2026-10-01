-- Remove o texto de observação "auto-gerado" (placeholder da importação do relatório em papel) que
-- ainda sobrou na lesão do Maycon Douglas — pedido do Mateus em 2026-10-01: "Essa parte do registro
-- na observação, remover também. Não aparecer no de ninguém, a não ser que a pessoa inclua." As
-- lesões do Fernando e do Gabriel Félix já tiveram essa mesma observação SUBSTITUÍDA por uma nota
-- factual na migração 0120 ("Entrada no Depto. Médico em .../ Ainda em andamento.") — não mexer
-- nelas. Só a lesão do Maycon (id abaixo, a que sobrou depois da limpeza de duplicata feita na
-- 0122) ainda carrega o texto original da importação.

-- Confira antes de apagar: deve devolver só a linha do Maycon abaixo, com observações começando
-- com "Registrada a partir do relatório em papel".
select id, atleta_id, descricao, observacoes
from public.fisioterapia_lesoes
where observacoes like 'Registrada a partir do relatório em papel%';

-- Casa por id (não por texto) — o "like" abaixo é só uma trava extra pra não zerar a observação à
-- toa caso o id não seja mais o que a gente espera.
update public.fisioterapia_lesoes
set observacoes = null, updated_at = now()
where id = '5a54696b-06e2-4fd1-8b9c-b69e9e8cbe73'
  and observacoes like 'Registrada a partir do relatório em papel%';

-- Confira depois: observacoes deve estar null agora.
select id, atleta_id, descricao, observacoes
from public.fisioterapia_lesoes
where id = '5a54696b-06e2-4fd1-8b9c-b69e9e8cbe73';
