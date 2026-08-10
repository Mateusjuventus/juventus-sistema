-- Critérios de desempate configuráveis por competição (Art. 17 do Regulamento Específico da Copa
-- Paulista — mas cada campeonato tem os seus, então isso não pode ficar fixo no código).
--
-- `criterios_desempate` é uma lista ORDENADA de chaves, aplicadas sucessivamente enquanto houver
-- empate. Chaves aceitas (ver lib/futebol/competicao-desempate.ts):
--   vitorias, saldo, gols_pro, gols_contra, confronto_direto, menos_vermelhos, menos_amarelos,
--   sorteio
-- O padrão é o Art. 17 da Copa Paulista: vitórias → saldo → gols marcados → menos vermelhos →
-- menos amarelos → sorteio.
--
-- A fase pode ter a PRÓPRIA lista (`competicao_fases.criterios_desempate`), null = herda da
-- competição. É assim que o §1º do Art. 17 é representado: no play in / quartas / semi / final
-- aplicam-se os critérios "até a alínea b" (vitórias e saldo) só na fase em questão.

alter table public.competicoes
  add column criterios_desempate text[] not null default array[
    'vitorias',
    'saldo',
    'gols_pro',
    'menos_vermelhos',
    'menos_amarelos',
    'sorteio'
  ];

alter table public.competicao_fases
  add column criterios_desempate text[];
