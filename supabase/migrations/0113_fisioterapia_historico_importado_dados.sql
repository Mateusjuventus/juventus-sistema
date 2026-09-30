-- Dados do relatório em papel da Copa Paulista 2026 (19/06 a 23/09/2026), importados pra
-- fisioterapia_historico_importado (ver 0112 e docs/superpowers/specs/2026-09-30-fisioterapia-
-- design.md) — pedido do Mateus. Roda em duas partes: rode a PARTE 1 primeiro (só leitura) e
-- confira se todo nome do relatório casou com EXATAMENTE 1 atleta antes de rodar a PARTE 2 (que
-- grava de verdade). Se algum nome aparecer com 0 ou mais de 1 candidato, me avise antes de rodar a
-- Parte 2 — a gente ajusta o nome_pdf daquela linha (ou o apelido do atleta) e roda de novo.

-- =====================================================================================
-- PARTE 1 — só conferência, não grava nada
-- =====================================================================================
with historico_pdf (nome_pdf, resumo) as (
  values
    ('Passareli', $$Posição: Goleiro
Queixas/incômodos: incômodo ombro E, incômodo no tendão patelar E, incômodo no adutor D, incômodo posterior E, incômodo tornozelo D, incômodo no iliopsoas D, incômodo no reto femoral D.
Lesão: Edema no músculo adutor D.
Dias afastados: 3 (edema músculo adutor D).
Atendimentos na temporada: 23.$$),
    ('Gabriel Félix', $$Posição: Goleiro
Queixas/incômodos: incômodo nos tornozelos D e E, incômodo na região torácica E.
Lesões: entorse de tornozelo E; lesão parcial do ligamento cruzado posterior D.
Dias afastados: 3 (entorse de tornozelo E); 14 dias até 23/09, ainda em andamento na data do relatório (lesão parcial do ligamento cruzado posterior D).
Atendimentos na temporada: 16 até a data do relatório.$$),
    ('Khendran', $$Posição: Goleiro
Queixas/incômodos: incômodo panturrilha bilateral, incômodo ombro E, incômodo cotovelo E.
Lesões: nenhuma.
Dias afastados: 2.
Atendimentos na temporada: 10.$$),
    ('Fernando', $$Posição: Zagueiro
Queixas/incômodos: incômodo na panturrilha D, incômodo fasceíte plantar bilateral, fasceíte plantar E, incômodo no tornozelo E.
Lesões: entorse de tornozelo E; lesão do fibular longo E.
Dias afastados: 9 (incômodo na panturrilha D); 43 dias até 23/09, ainda em andamento na data do relatório (pós-operatório fibular longo E).
Atendimentos na temporada: 57 até a data do relatório.$$),
    ('Léo Coelho', $$Posição: Zagueiro
Queixas/incômodos: torcicolo.
Lesões: lesão grau I reto femoral D.
Dias afastados: 9.
Atendimentos na temporada: 13.$$),
    ('Thomás Kayck', $$Posição: Zagueiro
Queixas/incômodos: não relatou nada para o departamento.
Lesões: nenhuma.
Dias afastados: 0.
Atendimentos na temporada: 0.$$),
    ('Justen', $$Posição: Zagueiro
Queixas/incômodos: incômodo no tornozelo E, incômodo adutor D, incômodo na posterior E, tendinite patelar joelho E, incômodo adutor E, incômodo no glúteo E, incômodo no pé E.
Lesões: nenhuma.
Dias afastados: não informado no relatório.
Atendimentos na temporada: 20.$$),
    ('V. Graziani', $$Posição: Zagueiro
Queixas/incômodos: incômodo bíceps femoral D, trauma tornozelo D, incômodo lombar, incômodo no adutor D, incômodo no pé E, incômodo no tornozelo D, fasceíte plantar D.
Lesões: nenhuma.
Dias afastados: 5 (bíceps femoral D); 2 (incômodo no pé).
Atendimentos na temporada: 28.$$),
    ('D. Guedes', $$Posição: Lateral direito
Queixas/incômodos: incômodo tornozelo E, incômodo tendão calcâneo E, lombalgia, incômodo no adutor D, lombalgia lado E.
Lesões: entorse de tornozelo E.
Dias afastados: não informado no relatório.
Atendimentos na temporada: 39.$$),
    ('Lucas Lopes', $$Posição: Lateral direito
Queixas/incômodos: incômodo na panturrilha E, incômodo na região posterior E, incômodo panturrilha D.
Lesões: entorse de tornozelo E.
Dias afastados: 2 (incômodo na posterior E e panturrilha D); 2 (incômodo posterior E).
Atendimentos na temporada: 40.$$),
    ('Eduardo', $$Posição: Lateral esquerdo
Queixas/incômodos: incômodo pé E, incômodo no tornozelo E, fasceíte plantar E, incômodo posterior D, incômodo região torácica E, incômodo no adutor D.
Lesões: nenhuma.
Dias afastados: não informado no relatório.
Atendimentos na temporada: 23.$$),
    ('M. Leal', $$Posição: Lateral esquerdo
Queixas/incômodos: tendinite patelar joelho E, incômodo posterior E, incômodo pé D e fasceíte plantar D.
Lesões: entorse de tornozelo D.
Dias afastados: 2 (incômodo posterior E).
Atendimentos na temporada: 26.$$),
    ('Felipinho', $$Posição: Lateral direito
Queixas/incômodos: incômodo no reto femoral D.
Lesões: fratura do 5º metatarso E.
Dias afastados: 57 (fratura do 5º metatarso E).
Atendimentos na temporada: 32.$$),
    ('Edinho', $$Posição: Meia
Queixas/incômodos: canelite bilateral, fasceíte plantar bilateral, incômodo no ligamento colateral medial do joelho E, incômodo no adutor D, incômodo na posterior D, incômodo na panturrilha D.
Lesões: nenhuma.
Dias afastados: 0.
Atendimentos na temporada: 50.$$),
    ('Freitas', $$Posição: Meia
Queixas/incômodos: não relatou nada para o departamento.
Lesões: nenhuma.
Dias afastados: 0.
Atendimentos na temporada: 0.$$),
    ('John Egito', $$Posição: Meia
Queixas/incômodos: incômodo na posterior D.
Lesões: trauma na panturrilha D.
Dias afastados: 4 (incômodo na posterior D).
Atendimentos na temporada: 7.$$),
    ('Keven', $$Posição: Meia
Queixas/incômodos: incômodo adutor D, incômodo próximo à pata de ganso D.
Lesões: lesão grau II de reto femoral D.
Dias afastados: 11 (lesão grau II de reto femoral D).
Atendimentos na temporada: 13.$$),
    ('M. Ferreira', $$Posição: Meia
Queixas/incômodos: incômodo no adutor D, incômodo no reto femoral D, incômodo pé D, incômodo no adutor E, incômodo no tendão patelar D.
Lesões: trauma na perna E; edema no músculo reto femoral D; lesão grau I no reto femoral D.
Dias afastados: 5 (incômodo no reto femoral); 9 (edema no reto femoral D); 19 (lesão grau I do reto femoral D).
Atendimentos na temporada: 57.$$),
    ('Rodriguinho', $$Posição: Meia
Queixas/incômodos: 4º dedo da mão esquerda.
Lesões: fratura do 4º dedo da mão esquerda.
Dias afastados: 0.
Atendimentos na temporada: 0.$$),
    ('Andrew', $$Posição: Atacante
Queixas/incômodos: incômodo no adutor D, fasceíte plantar E, incômodo no ligamento colateral lateral joelho E, incômodo no reto femoral D.
Lesões: edema póstero lateral joelho E; lesão grau II de bíceps femoral E.
Dias afastados: 7 (edema póstero lateral joelho E); 24 (lesão grau II bíceps femoral E).
Atendimentos na temporada: 57.$$),
    ('Elkin Munoz', $$Posição: Atacante
Queixas/incômodos: incômodo posterior E, tendinite patelar joelho D.
Lesões: nenhuma.
Dias afastados: não informado no relatório.
Atendimentos na temporada: 13.$$),
    ('Felipe Augusto', $$Posição: Atacante
Queixas/incômodos: não relatou nada para o departamento.
Lesões: nenhuma.
Dias afastados: 0.
Atendimentos na temporada: 0.$$),
    ('Maycon Douglas', $$Posição: Atacante
Queixas/incômodos: nenhuma relatada.
Lesões: pós-operatório de LCA joelho D.
Dias afastados: 245 dias até 23/09, ainda em andamento na data do relatório (pós-operatório de LCA D).
Atendimentos na temporada: 80 até a data do relatório.$$),
    ('Paulinho', $$Posição: Atacante
Queixas/incômodos: incômodo no tornozelo E, incômodo na região do calcâneo E, incômodo região da fíbula D, incômodo na panturrilha D, fadiga muscular em membros inferiores, incômodo no pé D.
Lesões: nenhuma.
Dias afastados: 0.
Atendimentos na temporada: 7.$$),
    ('Romário', $$Posição: Atacante
Queixas/incômodos: tendinite patelar joelho E.
Lesões: entorse de tornozelo D.
Dias afastados: 7 (entorse de tornozelo D).
Atendimentos na temporada: 15.$$),
    ('V. Spaniol', $$Posição: Atacante
Queixas/incômodos: incômodo adutor D, incômodo adutor E, incômodo reto femoral D.
Lesões: nenhuma.
Dias afastados: 2 (incômodo adutor D).
Atendimentos na temporada: 22.$$),
    ('Luiz Gustavo', $$Posição: Zagueiro
Queixas/incômodos: incômodo no reto femoral D.
Lesões: edema no reto femoral D.
Dias afastados: 9 (edema reto femoral D); 13 (incômodo no reto femoral D).
Atendimentos na temporada: 29.$$),
    ('Madson', $$Posição: Meia
Queixas/incômodos: incômodo na região infra abdominal E, incômodo no reto femoral E.
Lesões: nenhuma.
Dias afastados: 3 (incômodo reto femoral E).
Atendimentos na temporada: 7.$$),
    ('Marcelo', $$Posição: Lateral
Queixas/incômodos: tendinite patelar E.
Lesões: nenhuma.
Dias afastados: 0.
Atendimentos na temporada: 2.$$)
),
candidatos as (
  select
    p.nome_pdf,
    a.id as atleta_id,
    a.nome_completo,
    a.apelido
  from historico_pdf p
  left join public.atletas a
    on a.ativo
   and (
     a.apelido ilike p.nome_pdf
     or a.apelido ilike regexp_replace(p.nome_pdf, '^[A-Za-zÀ-ÖØ-öø-ÿ]\.\s*', '')
     or a.nome_completo ilike '%' || regexp_replace(p.nome_pdf, '^[A-Za-zÀ-ÖØ-öø-ÿ]\.\s*', '') || '%'
   )
)
select
  nome_pdf,
  count(atleta_id) as atletas_encontrados,
  string_agg(coalesce(nome_completo || ' ("' || coalesce(apelido, '—') || '")', '—'), ' | ') as candidatos
from candidatos
group by nome_pdf
order by atletas_encontrados, nome_pdf;

-- Confira o resultado acima: toda linha deve ter atletas_encontrados = 1. Só depois disso rode a
-- Parte 2 abaixo.

-- =====================================================================================
-- PARTE 2 — grava de verdade (só depois de conferir a Parte 1)
-- =====================================================================================
with historico_pdf (nome_pdf, titulo, resumo) as (
  values
    ('Passareli', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Goleiro
Queixas/incômodos: incômodo ombro E, incômodo no tendão patelar E, incômodo no adutor D, incômodo posterior E, incômodo tornozelo D, incômodo no iliopsoas D, incômodo no reto femoral D.
Lesão: Edema no músculo adutor D.
Dias afastados: 3 (edema músculo adutor D).
Atendimentos na temporada: 23.$$),
    ('Gabriel Félix', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Goleiro
Queixas/incômodos: incômodo nos tornozelos D e E, incômodo na região torácica E.
Lesões: entorse de tornozelo E; lesão parcial do ligamento cruzado posterior D.
Dias afastados: 3 (entorse de tornozelo E); 14 dias até 23/09, ainda em andamento na data do relatório (lesão parcial do ligamento cruzado posterior D).
Atendimentos na temporada: 16 até a data do relatório.$$),
    ('Khendran', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Goleiro
Queixas/incômodos: incômodo panturrilha bilateral, incômodo ombro E, incômodo cotovelo E.
Lesões: nenhuma.
Dias afastados: 2.
Atendimentos na temporada: 10.$$),
    ('Fernando', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Zagueiro
Queixas/incômodos: incômodo na panturrilha D, incômodo fasceíte plantar bilateral, fasceíte plantar E, incômodo no tornozelo E.
Lesões: entorse de tornozelo E; lesão do fibular longo E.
Dias afastados: 9 (incômodo na panturrilha D); 43 dias até 23/09, ainda em andamento na data do relatório (pós-operatório fibular longo E).
Atendimentos na temporada: 57 até a data do relatório.$$),
    ('Léo Coelho', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Zagueiro
Queixas/incômodos: torcicolo.
Lesões: lesão grau I reto femoral D.
Dias afastados: 9.
Atendimentos na temporada: 13.$$),
    ('Thomás Kayck', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Zagueiro
Queixas/incômodos: não relatou nada para o departamento.
Lesões: nenhuma.
Dias afastados: 0.
Atendimentos na temporada: 0.$$),
    ('Justen', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Zagueiro
Queixas/incômodos: incômodo no tornozelo E, incômodo adutor D, incômodo na posterior E, tendinite patelar joelho E, incômodo adutor E, incômodo no glúteo E, incômodo no pé E.
Lesões: nenhuma.
Dias afastados: não informado no relatório.
Atendimentos na temporada: 20.$$),
    ('V. Graziani', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Zagueiro
Queixas/incômodos: incômodo bíceps femoral D, trauma tornozelo D, incômodo lombar, incômodo no adutor D, incômodo no pé E, incômodo no tornozelo D, fasceíte plantar D.
Lesões: nenhuma.
Dias afastados: 5 (bíceps femoral D); 2 (incômodo no pé).
Atendimentos na temporada: 28.$$),
    ('D. Guedes', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Lateral direito
Queixas/incômodos: incômodo tornozelo E, incômodo tendão calcâneo E, lombalgia, incômodo no adutor D, lombalgia lado E.
Lesões: entorse de tornozelo E.
Dias afastados: não informado no relatório.
Atendimentos na temporada: 39.$$),
    ('Lucas Lopes', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Lateral direito
Queixas/incômodos: incômodo na panturrilha E, incômodo na região posterior E, incômodo panturrilha D.
Lesões: entorse de tornozelo E.
Dias afastados: 2 (incômodo na posterior E e panturrilha D); 2 (incômodo posterior E).
Atendimentos na temporada: 40.$$),
    ('Eduardo', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Lateral esquerdo
Queixas/incômodos: incômodo pé E, incômodo no tornozelo E, fasceíte plantar E, incômodo posterior D, incômodo região torácica E, incômodo no adutor D.
Lesões: nenhuma.
Dias afastados: não informado no relatório.
Atendimentos na temporada: 23.$$),
    ('M. Leal', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Lateral esquerdo
Queixas/incômodos: tendinite patelar joelho E, incômodo posterior E, incômodo pé D e fasceíte plantar D.
Lesões: entorse de tornozelo D.
Dias afastados: 2 (incômodo posterior E).
Atendimentos na temporada: 26.$$),
    ('Felipinho', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Lateral direito
Queixas/incômodos: incômodo no reto femoral D.
Lesões: fratura do 5º metatarso E.
Dias afastados: 57 (fratura do 5º metatarso E).
Atendimentos na temporada: 32.$$),
    ('Edinho', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Meia
Queixas/incômodos: canelite bilateral, fasceíte plantar bilateral, incômodo no ligamento colateral medial do joelho E, incômodo no adutor D, incômodo na posterior D, incômodo na panturrilha D.
Lesões: nenhuma.
Dias afastados: 0.
Atendimentos na temporada: 50.$$),
    ('Freitas', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Meia
Queixas/incômodos: não relatou nada para o departamento.
Lesões: nenhuma.
Dias afastados: 0.
Atendimentos na temporada: 0.$$),
    ('John Egito', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Meia
Queixas/incômodos: incômodo na posterior D.
Lesões: trauma na panturrilha D.
Dias afastados: 4 (incômodo na posterior D).
Atendimentos na temporada: 7.$$),
    ('Keven', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Meia
Queixas/incômodos: incômodo adutor D, incômodo próximo à pata de ganso D.
Lesões: lesão grau II de reto femoral D.
Dias afastados: 11 (lesão grau II de reto femoral D).
Atendimentos na temporada: 13.$$),
    ('M. Ferreira', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Meia
Queixas/incômodos: incômodo no adutor D, incômodo no reto femoral D, incômodo pé D, incômodo no adutor E, incômodo no tendão patelar D.
Lesões: trauma na perna E; edema no músculo reto femoral D; lesão grau I no reto femoral D.
Dias afastados: 5 (incômodo no reto femoral); 9 (edema no reto femoral D); 19 (lesão grau I do reto femoral D).
Atendimentos na temporada: 57.$$),
    ('Rodriguinho', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Meia
Queixas/incômodos: 4º dedo da mão esquerda.
Lesões: fratura do 4º dedo da mão esquerda.
Dias afastados: 0.
Atendimentos na temporada: 0.$$),
    ('Andrew', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Atacante
Queixas/incômodos: incômodo no adutor D, fasceíte plantar E, incômodo no ligamento colateral lateral joelho E, incômodo no reto femoral D.
Lesões: edema póstero lateral joelho E; lesão grau II de bíceps femoral E.
Dias afastados: 7 (edema póstero lateral joelho E); 24 (lesão grau II bíceps femoral E).
Atendimentos na temporada: 57.$$),
    ('Elkin Munoz', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Atacante
Queixas/incômodos: incômodo posterior E, tendinite patelar joelho D.
Lesões: nenhuma.
Dias afastados: não informado no relatório.
Atendimentos na temporada: 13.$$),
    ('Felipe Augusto', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Atacante
Queixas/incômodos: não relatou nada para o departamento.
Lesões: nenhuma.
Dias afastados: 0.
Atendimentos na temporada: 0.$$),
    ('Maycon Douglas', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Atacante
Queixas/incômodos: nenhuma relatada.
Lesões: pós-operatório de LCA joelho D.
Dias afastados: 245 dias até 23/09, ainda em andamento na data do relatório (pós-operatório de LCA D).
Atendimentos na temporada: 80 até a data do relatório.$$),
    ('Paulinho', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Atacante
Queixas/incômodos: incômodo no tornozelo E, incômodo na região do calcâneo E, incômodo região da fíbula D, incômodo na panturrilha D, fadiga muscular em membros inferiores, incômodo no pé D.
Lesões: nenhuma.
Dias afastados: 0.
Atendimentos na temporada: 7.$$),
    ('Romário', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Atacante
Queixas/incômodos: tendinite patelar joelho E.
Lesões: entorse de tornozelo D.
Dias afastados: 7 (entorse de tornozelo D).
Atendimentos na temporada: 15.$$),
    ('V. Spaniol', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Atacante
Queixas/incômodos: incômodo adutor D, incômodo adutor E, incômodo reto femoral D.
Lesões: nenhuma.
Dias afastados: 2 (incômodo adutor D).
Atendimentos na temporada: 22.$$),
    ('Luiz Gustavo', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Zagueiro
Queixas/incômodos: incômodo no reto femoral D.
Lesões: edema no reto femoral D.
Dias afastados: 9 (edema reto femoral D); 13 (incômodo no reto femoral D).
Atendimentos na temporada: 29.$$),
    ('Madson', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Meia
Queixas/incômodos: incômodo na região infra abdominal E, incômodo no reto femoral E.
Lesões: nenhuma.
Dias afastados: 3 (incômodo reto femoral E).
Atendimentos na temporada: 7.$$),
    ('Marcelo', 'Copa Paulista 2026 — histórico anterior ao sistema', $$Posição: Lateral
Queixas/incômodos: tendinite patelar E.
Lesões: nenhuma.
Dias afastados: 0.
Atendimentos na temporada: 2.$$)
),
candidatos as (
  select
    p.nome_pdf,
    p.titulo,
    p.resumo,
    a.id as atleta_id,
    row_number() over (
      partition by p.nome_pdf
      order by (a.apelido ilike p.nome_pdf) desc
    ) as prioridade
  from historico_pdf p
  left join public.atletas a
    on a.ativo
   and (
     a.apelido ilike p.nome_pdf
     or a.apelido ilike regexp_replace(p.nome_pdf, '^[A-Za-zÀ-ÖØ-öø-ÿ]\.\s*', '')
     or a.nome_completo ilike '%' || regexp_replace(p.nome_pdf, '^[A-Za-zÀ-ÖØ-öø-ÿ]\.\s*', '') || '%'
   )
)
insert into public.fisioterapia_historico_importado (atleta_id, titulo, resumo)
select atleta_id, titulo, resumo
from candidatos
where prioridade = 1
  and atleta_id is not null;

-- Resumo geral da temporada (agregados do departamento, não de um atleta específico) — aparece no
-- Relatório Geral da Fisioterapia (atleta_id nulo).
insert into public.fisioterapia_historico_importado (atleta_id, titulo, resumo)
values (
  null,
  'Copa Paulista 2026 — resumo do período',
  $$Período: 19/06 a 23/09/2026
Jogos: 8
Treinos: 96 sessões
Atendimentos no período: 686

Tipos de lesões: lesões musculares 6, entorse de tornozelo 6, traumática 3.

Incômodos musculares: 43 casos. Local: adutor direito 10, adutor esquerdo 3, reto femoral direito 6, reto femoral esquerdo 1, posterior direita 3, posterior esquerda 5, iliopsoas direito 1, panturrilha direita 5, panturrilha esquerda 2, lombar 3, torácica 2, infra abdominal 1, glúteo 1.

Incômodos articulares: 17 casos. Tornozelo direito 3, tornozelo esquerdo 6, pé direito 2, pé esquerdo 3, ombro esquerdo 2, cotovelo esquerdo 1.

Incômodo tendíneo/fascial: 15 casos. Tendinite patelar joelho direito 2, tendinite patelar joelho esquerdo 5, fasceíte plantar direito 3, fasceíte plantar esquerdo 4, próximo à pata de ganso direito 1.

Incômodo ligamentar: 2 casos. Ligamento colateral medial joelho esquerdo 1, ligamento colateral lateral joelho esquerdo 1.

Incômodo ósseo: 4 casos. Fíbula direita 1, calcâneo esquerdo 1, canelite direita 1, canelite esquerda 1.

Incômodo trauma: 3 casos. Tornozelo direito 1, perna esquerda 1, panturrilha direita 1.$$
);

notify pgrst, 'reload schema';
