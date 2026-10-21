-- Competições: formato de partida por categoria (Base) + situação do Juventus (Profissional e
-- Base) — ver docs/superpowers/specs/2026-10-21-competicoes-formato-partida-design.md.

-- 1. Formato de partida — só `competicoes_base` (Profissional sempre joga 2x45, sem
--    particularidades). Defaults mantêm toda competição já cadastrada antes desta mudança
--    exatamente como está (2 tempos, regra livre, sem mínimos).
alter table public.competicoes_base
  add column numero_tempos integer not null default 2 check (numero_tempos in (2, 3)),
  add column duracao_tempo_1_minutos integer,
  add column duracao_tempo_2_minutos integer,
  add column duracao_tempo_3_minutos integer,
  add column duracao_intervalo_minutos integer,
  add column elenco_minimo_em_campo integer,
  add column minutos_minimos_por_atleta integer,
  add column regra_tempo_1 text not null default 'livre'
    check (regra_tempo_1 in ('livre', 'somente_titulares', 'somente_reservas', 'livre_ilimitada')),
  add column regra_tempo_2 text not null default 'livre'
    check (regra_tempo_2 in ('livre', 'somente_titulares', 'somente_reservas', 'livre_ilimitada')),
  add column regra_tempo_3 text
    check (regra_tempo_3 in ('livre', 'somente_titulares', 'somente_reservas', 'livre_ilimitada'));

-- 2. Situação do Juventus na competição — independente do `status` geral (que só muda quando o
--    campeonato inteiro termina). Em ambos os módulos por paridade de schema (ver spec).
alter table public.competicoes
  add column situacao_clube text not null default 'participando'
    check (situacao_clube in ('participando', 'eliminado', 'campeao', 'vice')),
  add column situacao_clube_fase text,
  add column situacao_clube_data date;

alter table public.competicoes_base
  add column situacao_clube text not null default 'participando'
    check (situacao_clube in ('participando', 'eliminado', 'campeao', 'vice')),
  add column situacao_clube_fase text,
  add column situacao_clube_data date;

-- 3. Preenche o formato de partida das 4 competições cadastradas em 0138 (Art. 19-20 de cada
--    REC) — Sub-11/12: 3 tempos de 17min, intervalo 5min, elenco mínimo 18, mínimo 17min/atleta;
--    Sub-13/14: mesma estrutura, 20min/tempo e elenco mínimo 22.
update public.competicoes_base
set
  numero_tempos = 3,
  duracao_tempo_1_minutos = 17,
  duracao_tempo_2_minutos = 17,
  duracao_tempo_3_minutos = 17,
  duracao_intervalo_minutos = 5,
  elenco_minimo_em_campo = 18,
  minutos_minimos_por_atleta = 17,
  regra_tempo_1 = 'somente_titulares',
  regra_tempo_2 = 'somente_reservas',
  regra_tempo_3 = 'livre_ilimitada'
where nome in ('Campeonato Paulista Sub-11 - 2026', 'Campeonato Paulista Sub-12 - 2026');

update public.competicoes_base
set
  numero_tempos = 3,
  duracao_tempo_1_minutos = 20,
  duracao_tempo_2_minutos = 20,
  duracao_tempo_3_minutos = 20,
  duracao_intervalo_minutos = 5,
  elenco_minimo_em_campo = 22,
  minutos_minimos_por_atleta = 20,
  regra_tempo_1 = 'somente_titulares',
  regra_tempo_2 = 'somente_reservas',
  regra_tempo_3 = 'livre_ilimitada'
where nome in ('Campeonato Paulista Sub-13 - 2026', 'Campeonato Paulista Sub-14 - 2026');

notify pgrst, 'reload schema';
