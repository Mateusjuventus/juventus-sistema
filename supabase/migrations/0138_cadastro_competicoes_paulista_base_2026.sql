-- Cadastro das competições do Campeonato Paulista de Futebol Sub-11, Sub-12, Sub-13 e Sub-14 -
-- 2026, a partir dos dois Regulamentos Específicos da Competição (REC) da FPF anexados pelo
-- Mateus. Só dados (nenhuma mudança de schema) — usa os campos que já existem em
-- `competicoes_base`/`competicao_prazos_base` (módulo de Competições do Futebol de Base, ver
-- supabase/migrations/0130). A pedido do Mateus: cadastra só a competição, as regras de
-- disciplina e os prazos do regulamento — SEM grupos/adversários nem fases (bracket) desta
-- rodada. O formato de partida particular dessas categorias (3 tempos, elenco mínimo, regra de
-- substituição por tempo etc.) ainda não tem campo próprio no sistema — fica pra quando esse
-- design (em andamento com o Mateus em 2026-10-21) for aprovado.

insert into public.temporadas_base (nome)
select '2026'
where not exists (select 1 from public.temporadas_base where nome = '2026');

-- REC "Campeonato Paulista de Futebol Sub-11 e Sub-12 - 2026" (Art. 3°: início 28/03/2026,
-- término 12/12/2026; Art. 43: comissão técnica advertida com série de 3 cartões amarelos fica
-- impedida de participar da partida subsequente desta competição).

insert into public.competicoes_base
  (temporada_id, nome, federacao, categoria, data_inicio, data_termino, status,
   regra_amarelos_suspensao, regra_jogos_suspensao_amarelos, regra_observacoes)
select
  t.id, 'Campeonato Paulista Sub-11 - 2026', 'FPF', 'sub11', date '2026-03-28', date '2026-12-12',
  'em_andamento', 3, 1,
  'Art. 43 do REC Sub-11/Sub-12: comissão técnica advertida com série de 3 cartões amarelos fica impedida de participar da partida subsequente desta competição (ver §§1-4 pras regras de acúmulo entre amarelo+vermelho na mesma partida e complementação de jogo suspenso).'
from public.temporadas_base t where t.nome = '2026';

insert into public.competicoes_base
  (temporada_id, nome, federacao, categoria, data_inicio, data_termino, status,
   regra_amarelos_suspensao, regra_jogos_suspensao_amarelos, regra_observacoes)
select
  t.id, 'Campeonato Paulista Sub-12 - 2026', 'FPF', 'sub12', date '2026-03-28', date '2026-12-12',
  'em_andamento', 3, 1,
  'Art. 43 do REC Sub-11/Sub-12: comissão técnica advertida com série de 3 cartões amarelos fica impedida de participar da partida subsequente desta competição (ver §§1-4 pras regras de acúmulo entre amarelo+vermelho na mesma partida e complementação de jogo suspenso).'
from public.temporadas_base t where t.nome = '2026';

-- REC "Campeonato Paulista de Futebol Sub-13 e Sub-14 - 2026" (Art. 3°: início 05/04/2026,
-- término 06/12/2026; Art. 42: comissão técnica advertida com série de 3 cartões amarelos fica
-- impedida de participar da partida subsequente desta competição).

insert into public.competicoes_base
  (temporada_id, nome, federacao, categoria, data_inicio, data_termino, status,
   regra_amarelos_suspensao, regra_jogos_suspensao_amarelos, regra_observacoes)
select
  t.id, 'Campeonato Paulista Sub-13 - 2026', 'FPF', 'sub13', date '2026-04-05', date '2026-12-06',
  'em_andamento', 3, 1,
  'Art. 42 do REC Sub-13/Sub-14: comissão técnica advertida com série de 3 cartões amarelos fica impedida de participar da partida subsequente desta competição (ver §§1-4 pras regras de acúmulo entre amarelo+vermelho na mesma partida e complementação de jogo suspenso).'
from public.temporadas_base t where t.nome = '2026';

insert into public.competicoes_base
  (temporada_id, nome, federacao, categoria, data_inicio, data_termino, status,
   regra_amarelos_suspensao, regra_jogos_suspensao_amarelos, regra_observacoes)
select
  t.id, 'Campeonato Paulista Sub-14 - 2026', 'FPF', 'sub14', date '2026-04-05', date '2026-12-06',
  'em_andamento', 3, 1,
  'Art. 42 do REC Sub-13/Sub-14: comissão técnica advertida com série de 3 cartões amarelos fica impedida de participar da partida subsequente desta competição (ver §§1-4 pras regras de acúmulo entre amarelo+vermelho na mesma partida e complementação de jogo suspenso).'
from public.temporadas_base t where t.nome = '2026';

-- Prazos importantes de cada competição (seção "DATAS IMPORTANTES" + Art. 46 de cada REC).
-- Critérios de desempate (Art. 15 dos dois RECs: vitórias -> saldo -> gols marcados -> menos
-- vermelhos -> menos amarelos -> sorteio) já batem com o valor padrão de
-- `competicoes_base.criterios_desempate` — não precisou de override.

insert into public.competicao_prazos_base (competicao_id, titulo, data_fim)
select c.id, p.titulo, p.data_fim
from public.competicoes_base c
join (values
  ('Vínculo desportivo protocolado - equipes que jogam na 1ª rodada', date '2026-03-13'),
  ('Vínculo desportivo protocolado - equipe com folga na 1ª rodada', date '2026-04-06'),
  ('Inscrição de atletas - equipes que jogam na 1ª rodada', date '2026-03-27'),
  ('Inscrição de atletas - equipe com folga na 1ª rodada', date '2026-04-10'),
  ('Registro e inscrição final no DRT/portal da FPF', date '2026-10-09'),
  ('Entrega do plano de ação social (Art. 46)', date '2026-09-11')
) as p(titulo, data_fim) on true
where c.nome = 'Campeonato Paulista Sub-11 - 2026';

insert into public.competicao_prazos_base (competicao_id, titulo, data_fim)
select c.id, p.titulo, p.data_fim
from public.competicoes_base c
join (values
  ('Vínculo desportivo protocolado - equipes que jogam na 1ª rodada', date '2026-03-13'),
  ('Vínculo desportivo protocolado - equipe com folga na 1ª rodada', date '2026-04-06'),
  ('Inscrição de atletas - equipes que jogam na 1ª rodada', date '2026-03-27'),
  ('Inscrição de atletas - equipe com folga na 1ª rodada', date '2026-04-10'),
  ('Registro e inscrição final no DRT/portal da FPF', date '2026-10-09'),
  ('Entrega do plano de ação social (Art. 46)', date '2026-09-11')
) as p(titulo, data_fim) on true
where c.nome = 'Campeonato Paulista Sub-12 - 2026';

insert into public.competicao_prazos_base (competicao_id, titulo, data_fim)
select c.id, p.titulo, p.data_fim
from public.competicoes_base c
join (values
  ('Vínculo desportivo protocolado - equipes que jogam na 1ª rodada', date '2026-03-20'),
  ('Vínculo desportivo protocolado - equipe com folga na 1ª rodada', date '2026-04-13'),
  ('Inscrição de atletas - equipes que jogam na 1ª rodada', date '2026-04-02'),
  ('Inscrição de atletas - equipe com folga na 1ª rodada', date '2026-04-17'),
  ('Registro e inscrição final no DRT/portal da FPF', date '2026-09-25'),
  ('Entrega do plano de ação social (Art. 46)', date '2026-09-04')
) as p(titulo, data_fim) on true
where c.nome = 'Campeonato Paulista Sub-13 - 2026';

insert into public.competicao_prazos_base (competicao_id, titulo, data_fim)
select c.id, p.titulo, p.data_fim
from public.competicoes_base c
join (values
  ('Vínculo desportivo protocolado - equipes que jogam na 1ª rodada', date '2026-03-20'),
  ('Vínculo desportivo protocolado - equipe com folga na 1ª rodada', date '2026-04-13'),
  ('Inscrição de atletas - equipes que jogam na 1ª rodada', date '2026-04-02'),
  ('Inscrição de atletas - equipe com folga na 1ª rodada', date '2026-04-17'),
  ('Registro e inscrição final no DRT/portal da FPF', date '2026-09-25'),
  ('Entrega do plano de ação social (Art. 46)', date '2026-09-04')
) as p(titulo, data_fim) on true
where c.nome = 'Campeonato Paulista Sub-14 - 2026';
