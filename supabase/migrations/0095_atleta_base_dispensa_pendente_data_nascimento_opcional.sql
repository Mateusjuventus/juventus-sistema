-- Data de nascimento passa a ser opcional só pra permitir o cadastro rápido pelo Campograma (Nome +
-- Posição) — RG e CPF já eram opcionais desde a migração 0076_captacao_alojamento_base.sql (ver
-- docs/superpowers/specs/2026-09-02-campograma-edicao-rapida-design.md, seção 4).
alter table public.atletas_base alter column data_nascimento drop not null;

-- Classificação ganha um 4º valor, "dispensa" ("Dispensa (pendente)" — sinalizador de saída em
-- avaliação, não muda o status; só o Relatório de Dispensa formal (já existente, sem mudança) muda
-- o status pra 'dispensado' de verdade — ver a mesma spec acima, seção 1).
alter table public.atletas_base drop constraint atletas_base_classificacao_check;
alter table public.atletas_base add constraint atletas_base_classificacao_check
  check (classificacao in ('g1', 'g2', 'g3', 'dispensa'));
