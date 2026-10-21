-- Vincula à competição estruturada (`competicao_jogos_base`) os jogos do Sub-11/12/13/14 que já
-- estavam cadastrados em `jogos_base` antes desta mudança — tinham o campo de texto livre
-- `competicao` preenchido (ex.: "Campeonato Paulista Sub 11"), mas sem nenhum vínculo real com o
-- registro estruturado criado em 0138_cadastro_competicoes_paulista_base_2026.sql. É por isso que
-- a Súmula desses jogos ainda aparecia travada em 2 tempos (sem saber que o jogo pertence a uma
-- competição de 3 tempos) e sem elenco mínimo/minutos mínimos.
--
-- Casa cada jogo com a ÚNICA competição da sua própria categoria (ver
-- docs/superpowers/specs/2026-10-21-competicoes-formato-partida-design.md — "uma competição por
-- categoria", confirmado com o Mateus) usando categoria + a janela de datas da competição
-- (`data_inicio`/`data_termino`, de 0138), em vez de tentar casar pelo texto livre de
-- `jogos_base.competicao` — mais seguro, já que esse texto pode estar escrito de formas
-- diferentes ("Sub-11", "Sub 11", "SUB11" etc.) jogo a jogo. Idempotente: o `not exists` no final
-- pula qualquer jogo que já tenha algum vínculo (não cria duplicado, não mexe em jogo já vinculado).

insert into public.competicao_jogos_base (competicao_id, jogo_id, cartoes_amarelos_adversario, cartoes_vermelhos_adversario)
select c.id, j.id, 0, 0
from public.jogos_base j
join public.competicoes_base c
  on c.categoria = j.categoria
  and c.nome in (
    'Campeonato Paulista Sub-11 - 2026',
    'Campeonato Paulista Sub-12 - 2026',
    'Campeonato Paulista Sub-13 - 2026',
    'Campeonato Paulista Sub-14 - 2026'
  )
where j.categoria in ('sub11', 'sub12', 'sub13', 'sub14')
  and j.data_jogo between c.data_inicio and c.data_termino
  and not exists (
    select 1 from public.competicao_jogos_base cj where cj.jogo_id = j.id
  );

-- Confira o resultado: toda linha abaixo é um jogo que ficou vinculado (ou já estava) à sua
-- competição. Se faltar algum jogo que você esperava ver aqui, o motivo mais provável é a data do
-- jogo cair fora da janela da competição (data_inicio/data_termino) — me avise que eu ajusto.
select
  j.categoria,
  j.data_jogo,
  j.adversario_nome,
  j.competicao as texto_livre_antigo,
  c.nome as competicao_vinculada
from public.jogos_base j
join public.competicao_jogos_base cj on cj.jogo_id = j.id
join public.competicoes_base c on c.id = cj.competicao_id
where j.categoria in ('sub11', 'sub12', 'sub13', 'sub14')
order by j.categoria, j.data_jogo;
