-- 0) Sub-15 não existia em `competicoes_base` (diferente de Sub-17/Sub-20, que já existiam e a
--    0143 atualizou normal) — por isso a 0143 não teve efeito nela (UPDATE e o INSERT de prazos
--    guardado por NOT EXISTS, os dois viram no-op quando não acham a linha). Cria agora, já com o
--    formato de partida do REC Sub-15/Sub-17 (Art. 35: 2 tempos de 35min, intervalo 15min) — mesmo
--    padrão usado em 0138 pra Sub-13/14, que também não existiam. Guardado por NOT EXISTS pra não
--    duplicar se, por acaso, já existir sob outra temporada.
insert into public.competicoes_base (
  temporada_id, nome, federacao, categoria, data_inicio, data_termino, status,
  regra_amarelos_suspensao, regra_jogos_suspensao_amarelos, regra_jogos_suspensao_vermelho,
  regra_observacoes, criterios_desempate,
  numero_tempos, duracao_tempo_1_minutos, duracao_tempo_2_minutos, duracao_intervalo_minutos
)
select
  '4d1c7413-48ed-4f6f-bcc3-40bccfbdd770', 'Campeonato Paulista Sub-15 - 2026', 'FPF', 'sub15',
  '2026-04-25', '2026-12-05', 'em_andamento',
  3, 1, 1,
  'Art. 45 do REC Sub-15/Sub-17: atleta ou membro da comissão técnica advertido com série de 3 cartões amarelos fica impedido de participar da partida subsequente desta competição (ver §§1-4 pras regras de acúmulo entre amarelo+vermelho na mesma partida e complementação de jogo suspenso). Art. 35: partida com duração total de 70min, 2 tempos de 35min, intervalo de 15min.',
  array['vitorias', 'saldo', 'gols_pro', 'menos_vermelhos', 'menos_amarelos', 'sorteio'],
  2, 35, 35, 15
where not exists (
  select 1 from public.competicoes_base where categoria = 'sub15'
);

-- 1) Padroniza o nome de TODAS as competições do Paulista de Base 2026 pro mesmo formato
--    ("Campeonato Paulista Sub-NN - 2026") — hoje está inconsistente (ex.: "Campeonato paulista
--    sub 11 2026" minúsculo, "PAULISTA SUB 17" sem "Campeonato"/sem ano, "Campeonato Paulista Sub
--    20" sem traço). Usa `categoria` pra achar a linha (não o nome antigo, que varia), então
--    funciona independente de como cada uma estava escrita. Sub-13/14/15 já nascem no padrão — o
--    update é idempotente nelas (vira no-op).
update public.competicoes_base set nome = 'Campeonato Paulista Sub-11 - 2026'
where categoria = 'sub11' and temporada_id = '4d1c7413-48ed-4f6f-bcc3-40bccfbdd770';

update public.competicoes_base set nome = 'Campeonato Paulista Sub-12 - 2026'
where categoria = 'sub12' and temporada_id = '4d1c7413-48ed-4f6f-bcc3-40bccfbdd770';

update public.competicoes_base set nome = 'Campeonato Paulista Sub-13 - 2026'
where categoria = 'sub13' and temporada_id = '4d1c7413-48ed-4f6f-bcc3-40bccfbdd770';

update public.competicoes_base set nome = 'Campeonato Paulista Sub-14 - 2026'
where categoria = 'sub14' and temporada_id = '4d1c7413-48ed-4f6f-bcc3-40bccfbdd770';

update public.competicoes_base set nome = 'Campeonato Paulista Sub-15 - 2026'
where categoria = 'sub15' and temporada_id = '4d1c7413-48ed-4f6f-bcc3-40bccfbdd770';

update public.competicoes_base set nome = 'Campeonato Paulista Sub-17 - 2026'
where categoria = 'sub17' and temporada_id = '4d1c7413-48ed-4f6f-bcc3-40bccfbdd770';

-- Mantém "Série A" no nome do Sub-20 (é como o próprio REC chama a competição, Art. 1°) — o
-- REC também prevê rebaixamento pra uma "Série B" a partir de 2027 (Art. 4°, Parágrafo Único),
-- então vale manter essa distinção no nome desde já.
update public.competicoes_base set nome = 'Campeonato Paulista Sub-20 Série A - 2026'
where categoria = 'sub20' and temporada_id = '4d1c7413-48ed-4f6f-bcc3-40bccfbdd770';

-- 2) Prazos do Sub-15 (a 0143 não conseguiu inserir porque a competição ainda não existia).
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

-- 3) Vincula à competição estruturada os jogos do Sub-15/17/20 que já estavam cadastrados em
--    `jogos_base` sem vínculo (mesmo mecanismo do 0141, agora pras 3 categorias que faltavam —
--    aqui não tinha nenhum "jogo travado" pra desbloquear, já que Sub-15/17/20 não tem a
--    particularidade de 3 tempos nem elenco mínimo, mas vale pra classificação/organização).
insert into public.competicao_jogos_base (competicao_id, jogo_id, cartoes_amarelos_adversario, cartoes_vermelhos_adversario)
select c.id, j.id, 0, 0
from public.jogos_base j
join public.competicoes_base c
  on c.categoria = j.categoria
  and c.temporada_id = '4d1c7413-48ed-4f6f-bcc3-40bccfbdd770'
where j.categoria in ('sub15', 'sub17', 'sub20')
  and j.data_jogo between c.data_inicio and c.data_termino
  and not exists (
    select 1 from public.competicao_jogos_base cj where cj.jogo_id = j.id
  );

-- Confira: nomes padronizados, formato de partida do Sub-15 já preenchido, e quantos jogos
-- ficaram vinculados em cada categoria.
select
  c.nome,
  c.categoria,
  c.numero_tempos,
  c.duracao_tempo_1_minutos,
  (select count(*) from public.competicao_prazos_base cp where cp.competicao_id = c.id) as qtd_prazos,
  (select count(*) from public.competicao_jogos_base cj where cj.competicao_id = c.id) as qtd_jogos_vinculados
from public.competicoes_base c
where c.categoria in ('sub11', 'sub12', 'sub13', 'sub14', 'sub15', 'sub17', 'sub20')
order by c.categoria;
