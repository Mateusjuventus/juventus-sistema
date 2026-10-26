-- Acréscimo (tempo extra/compensação) por tempo da Súmula — Profissional e Base. Até aqui a
-- duração de cada tempo só guardava o tempo regulamentar (`duracao_primeiro_tempo` etc.), e o
-- "relógio" do jogo (fim de jogo, minutagem de cada atleta) usava só essa duração — então um jogo
-- com acréscimo real não lançado continuava sendo tratado como se tivesse acabado exatamente aos
-- 45/45 (ou à duração configurada da categoria), e um atleta que jogasse o jogo inteiro sem
-- nenhuma substituição nunca cruzava o limiar de "jogo completo" (ver
-- `lib/futebol/estatisticas-atleta.ts`, comparação estrita `> 90`).
--
-- Essas colunas novas guardam o acréscimo à parte (nunca sobrescrevendo a duração regulamentar),
-- pra somar ao relógio do jogo só no cálculo de minutagem — ver
-- docs/superpowers/specs/2026-08-04-estatisticas-atleta-design.md e
-- docs/superpowers/specs/2026-10-21-competicoes-formato-partida-design.md pro desenho original da
-- duração por tempo. Default 0 e not null: todo jogo já cadastrado continua com acréscimo zero
-- (comportamento idêntico a hoje) até alguém preencher na Súmula.

alter table public.sumulas
  add column acrescimo_primeiro_tempo integer not null default 0,
  add column acrescimo_segundo_tempo integer not null default 0,
  add column acrescimo_terceiro_tempo integer not null default 0;

alter table public.sumulas
  add constraint sumulas_acrescimo_primeiro_tempo_check check (acrescimo_primeiro_tempo >= 0),
  add constraint sumulas_acrescimo_segundo_tempo_check check (acrescimo_segundo_tempo >= 0),
  add constraint sumulas_acrescimo_terceiro_tempo_check check (acrescimo_terceiro_tempo >= 0);

alter table public.sumulas_base
  add column acrescimo_primeiro_tempo integer not null default 0,
  add column acrescimo_segundo_tempo integer not null default 0,
  add column acrescimo_terceiro_tempo integer not null default 0;

alter table public.sumulas_base
  add constraint sumulas_base_acrescimo_primeiro_tempo_check check (acrescimo_primeiro_tempo >= 0),
  add constraint sumulas_base_acrescimo_segundo_tempo_check check (acrescimo_segundo_tempo >= 0),
  add constraint sumulas_base_acrescimo_terceiro_tempo_check check (acrescimo_terceiro_tempo >= 0);
