-- Formato de partida + prazos pro Sub-15, Sub-17 e Sub-20, a partir dos RECs "Campeonato Paulista
-- Sub-15 e Sub-17 - 2026" e "Campeonato Paulista Sub-20 Série A - 2026" — mesmo exercício feito
-- pro Sub-11/12/13/14 (ver docs/superpowers/specs/2026-10-21-competicoes-formato-partida-
-- design.md), mas SEM criar competição nova: dessa vez atualiza direto a competição que já existe
-- pra cada categoria (lição do erro de duplicação do Sub-11/12 — confirmado por diagnóstico que só
-- existe 1 linha por categoria hoje em sub15/sub17/sub20, então o `where categoria = ...` abaixo é
-- seguro e não cria nenhuma linha nova em `competicoes_base`).
--
-- Diferença importante de particularidade: Sub-15/17/20 NÃO têm a regra de 3 tempos nem de elenco
-- mínimo/minutos mínimos por atleta (essa é exclusiva do REC Sub-11/12/13/14, Art. 19-20) — aqui é
-- o formato padrão de 2 tempos, só com duração diferente do padrão de 45min no Sub-15 e Sub-17
-- (Art. 35/36 do REC): Sub-15 = 2x35min, Sub-17 = 2x40min, intervalo de 15min nos dois. O Sub-20
-- não tem artigo de duração específico no REC (seção "Sistema de Disputa" não fixa duração
-- diferente do padrão), então fica sem numero_tempos/duração customizados — a Súmula já assume
-- 45min por tempo quando a competição não diz o contrário.

update public.competicoes_base
set
  data_inicio = '2026-04-25',
  data_termino = '2026-12-05',
  numero_tempos = 2,
  duracao_tempo_1_minutos = 35,
  duracao_tempo_2_minutos = 35,
  duracao_intervalo_minutos = 15,
  regra_amarelos_suspensao = 3,
  regra_jogos_suspensao_amarelos = 1,
  regra_jogos_suspensao_vermelho = 1,
  regra_observacoes = 'Art. 45 do REC Sub-15/Sub-17: atleta ou membro da comissão técnica advertido com série de 3 cartões amarelos fica impedido de participar da partida subsequente desta competição (ver §§1-4 pras regras de acúmulo entre amarelo+vermelho na mesma partida e complementação de jogo suspenso). Art. 35: partida com duração total de 70min, 2 tempos de 35min, intervalo de 15min.'
where categoria = 'sub15' and temporada_id = '4d1c7413-48ed-4f6f-bcc3-40bccfbdd770';

update public.competicoes_base
set
  data_inicio = '2026-04-25',
  data_termino = '2026-12-05',
  numero_tempos = 2,
  duracao_tempo_1_minutos = 40,
  duracao_tempo_2_minutos = 40,
  duracao_intervalo_minutos = 15,
  regra_amarelos_suspensao = 3,
  regra_jogos_suspensao_amarelos = 1,
  regra_jogos_suspensao_vermelho = 1,
  regra_observacoes = 'Art. 45 do REC Sub-15/Sub-17: atleta ou membro da comissão técnica advertido com série de 3 cartões amarelos fica impedido de participar da partida subsequente desta competição (ver §§1-4 pras regras de acúmulo entre amarelo+vermelho na mesma partida e complementação de jogo suspenso). Art. 36: partida com duração total de 80min, 2 tempos de 40min, intervalo de 15min.'
where categoria = 'sub17' and temporada_id = '4d1c7413-48ed-4f6f-bcc3-40bccfbdd770';

update public.competicoes_base
set
  data_inicio = '2026-05-29',
  data_termino = '2026-11-28',
  regra_amarelos_suspensao = 3,
  regra_jogos_suspensao_amarelos = 1,
  regra_jogos_suspensao_vermelho = 1,
  regra_observacoes = 'Art. 41 do REC Sub-20 Série A: atleta ou membro da comissão técnica advertido com série de 3 cartões amarelos fica impedido de participar da partida subsequente desta competição (ver §§1-4 pras regras de acúmulo entre amarelo+vermelho na mesma partida e complementação de jogo suspenso).'
where categoria = 'sub20' and temporada_id = '4d1c7413-48ed-4f6f-bcc3-40bccfbdd770';

-- Prazos (Art. 18 do REC Sub-15/17 / Art. 16 do REC Sub-20, seção "DATAS IMPORTANTES"). Com
-- `not exists` em cada insert pra não duplicar caso algum desses prazos já tenha sido cadastrado
-- manualmente antes — mesma cautela do episódio de duplicação do Sub-11/12.
insert into public.competicao_prazos_base (competicao_id, titulo, data_fim)
select c.id, p.titulo, p.data_fim
from public.competicoes_base c
cross join (values
  ('Vínculo desportivo protocolado — equipes que jogam na 1ª rodada', date '2026-04-10'),
  ('Vínculo desportivo protocolado — equipes que folgam na 1ª rodada', date '2026-04-22'),
  ('Inscrição de atletas — equipes que jogam na 1ª rodada', date '2026-04-24'),
  ('Inscrição de atletas — equipes que folgam na 1ª rodada', date '2026-04-30'),
  ('Registro e inscrição final no DRT/portal da FPF', date '2026-09-30'),
  ('Entrega do plano de ação social (Art. 48)', date '2026-08-21')
) as p(titulo, data_fim)
where c.categoria = 'sub15' and c.temporada_id = '4d1c7413-48ed-4f6f-bcc3-40bccfbdd770'
  and not exists (
    select 1 from public.competicao_prazos_base cp
    where cp.competicao_id = c.id and cp.titulo = p.titulo
  );

insert into public.competicao_prazos_base (competicao_id, titulo, data_fim)
select c.id, p.titulo, p.data_fim
from public.competicoes_base c
cross join (values
  ('Vínculo desportivo protocolado — equipes que jogam na 1ª rodada', date '2026-04-10'),
  ('Vínculo desportivo protocolado — equipes que folgam na 1ª rodada', date '2026-04-22'),
  ('Inscrição de atletas — equipes que jogam na 1ª rodada', date '2026-04-24'),
  ('Inscrição de atletas — equipes que folgam na 1ª rodada', date '2026-04-30'),
  ('Registro e inscrição final no DRT/portal da FPF', date '2026-09-30'),
  ('Entrega do plano de ação social (Art. 48)', date '2026-08-21')
) as p(titulo, data_fim)
where c.categoria = 'sub17' and c.temporada_id = '4d1c7413-48ed-4f6f-bcc3-40bccfbdd770'
  and not exists (
    select 1 from public.competicao_prazos_base cp
    where cp.competicao_id = c.id and cp.titulo = p.titulo
  );

-- Sub-20 não tem artigo de "plano de ação social" no REC (Art. 48 dele é só "disposições finais")
-- — por isso só os 5 prazos de vínculo/inscrição/registro, sem o de ação social.
insert into public.competicao_prazos_base (competicao_id, titulo, data_fim)
select c.id, p.titulo, p.data_fim
from public.competicoes_base c
cross join (values
  ('Vínculo desportivo protocolado — equipes que jogam na 1ª rodada', date '2026-05-15'),
  ('Vínculo desportivo protocolado — equipes que folgam na 1ª rodada', date '2026-05-25'),
  ('Inscrição de atletas — equipes que jogam na 1ª rodada', date '2026-05-28'),
  ('Inscrição de atletas — equipes que folgam na 1ª rodada', date '2026-06-03'),
  ('Registro e inscrição final no DRT/portal da FPF', date '2026-09-24')
) as p(titulo, data_fim)
where c.categoria = 'sub20' and c.temporada_id = '4d1c7413-48ed-4f6f-bcc3-40bccfbdd770'
  and not exists (
    select 1 from public.competicao_prazos_base cp
    where cp.competicao_id = c.id and cp.titulo = p.titulo
  );

-- Confira: 1 linha por categoria, já com o formato de partida (Sub-15/17 com 2x35/2x40min; Sub-20
-- sem duração customizada), e a contagem de prazos de cada uma.
select
  c.nome,
  c.categoria,
  c.data_inicio,
  c.data_termino,
  c.numero_tempos,
  c.duracao_tempo_1_minutos,
  c.duracao_tempo_2_minutos,
  c.duracao_intervalo_minutos,
  (select count(*) from public.competicao_prazos_base cp where cp.competicao_id = c.id) as qtd_prazos
from public.competicoes_base c
where c.categoria in ('sub15', 'sub17', 'sub20')
order by c.categoria;
