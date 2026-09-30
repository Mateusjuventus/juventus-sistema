-- Registra como lesão ATIVA de verdade (fisioterapia_lesoes, data_fim nula) os 3 casos que o
-- relatório em papel da Copa Paulista 2026 (ver 0113) já mostrava "até atual data" — Gabriel
-- Félix, Fernando e Maycon Douglas — e o Mateus confirmou (30/09/2026) que continuam machucados.
-- `data_inicio` foi calculada contando pra trás a partir de 23/09/2026 (data do relatório) com os
-- dias afastados que já constavam lá; assim "dias afastados" mostrado no sistema (sempre
-- calculado, nunca gravado — ver lib/futebol/fisioterapia.ts) já sai correto a partir de hoje.
-- Atualiza `atletas.status` pra "departamento_medico" nos 3, mesma regra que o próprio sistema
-- aplica ao registrar uma lesão pela tela (sincronizarStatusAtleta em app/departamento-medico/
-- fisioterapia/[atletaId]/actions.ts) — feito à mão aqui porque veio de SQL direto, não da Server
-- Action.
--
-- IDs diretos, não por nome: a primeira versão deste arquivo casava por nome (com `unaccent`,
-- igual 0113) e por causa disso "Fernando" quase casou com o atleta errado — "Fernando" é nome
-- comum e há mais de um "Ferreira" no elenco (ver histórico de 0113). Pra eliminar esse risco de
-- vez, os 3 atleta_id abaixo foram conferidos manualmente um a um contra o cadastro real antes de
-- escrever este arquivo:
--   Gabriel Félix  -> 28748b9c-3f3d-4e61-88f9-59d8780422f7 (cadastro: Gabriel Luis Gonçalves Felix)
--   Fernando       -> efe4b258-946a-4804-96d1-7e0714700e3e (cadastro: Fernando Fonseca Ferreira)
--   Maycon Douglas -> 5a54696b-06e2-4fd1-8b9c-b69e9e8cbe73
-- Roda em duas partes: confira a PARTE 1 (nomes batendo com o esperado) antes de rodar a PARTE 2.

-- =====================================================================================
-- PARTE 1 — só conferência, não grava nada
-- =====================================================================================
select
  id,
  nome_completo,
  apelido,
  ativo,
  status
from public.atletas
where id in (
  '28748b9c-3f3d-4e61-88f9-59d8780422f7', -- Gabriel Félix
  'efe4b258-946a-4804-96d1-7e0714700e3e', -- Fernando
  '5a54696b-06e2-4fd1-8b9c-b69e9e8cbe73'  -- Maycon Douglas
)
order by nome_completo;

-- Confira: devem vir exatamente 3 linhas, uma pra cada atleta acima (Gabriel Luis Gonçalves
-- Felix, Fernando Fonseca Ferreira, Maycon Douglas — nome completo real). Só depois disso rode a
-- Parte 2.

-- =====================================================================================
-- PARTE 2 — grava de verdade (só depois de conferir a Parte 1)
-- =====================================================================================
with casos (atleta_id, descricao, data_inicio, observacoes) as (
  values
    ('28748b9c-3f3d-4e61-88f9-59d8780422f7'::uuid, 'Lesão parcial do ligamento cruzado posterior (LCP) D', date '2026-09-10',
     'Registrada a partir do relatório em papel da Copa Paulista 2026 (14 dias afastado até 23/09) — confirmada em andamento pelo Mateus em 30/09/2026.'),
    ('efe4b258-946a-4804-96d1-7e0714700e3e'::uuid, 'Lesão do fibular longo E (pós-operatório)', date '2026-08-12',
     'Registrada a partir do relatório em papel da Copa Paulista 2026 (43 dias afastado até 23/09) — confirmada em andamento pelo Mateus em 30/09/2026.'),
    ('5a54696b-06e2-4fd1-8b9c-b69e9e8cbe73'::uuid, 'Lesão do ligamento cruzado anterior (LCA) D (pós-operatório)', date '2026-01-22',
     'Registrada a partir do relatório em papel da Copa Paulista 2026 (245 dias afastado até 23/09) — confirmada em andamento pelo Mateus em 30/09/2026.')
),
inseridos as (
  insert into public.fisioterapia_lesoes (atleta_id, descricao, data_inicio, data_fim, observacoes)
  select atleta_id, descricao, data_inicio, null, observacoes
  from casos
  returning atleta_id
)
update public.atletas
set status = 'departamento_medico'
where id in (select atleta_id from inseridos);
