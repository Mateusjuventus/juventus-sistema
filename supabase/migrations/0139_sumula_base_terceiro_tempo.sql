-- Súmula: suporte a um 3º tempo (Futebol de Base) — ver docs/superpowers/specs/2026-10-21-
-- competicoes-formato-partida-design.md. O Campeonato Paulista Sub-11/12/13/14 (e outras
-- competições de formação que vierem a ter o mesmo formato) dividem a partida em 3 tempos, não 2.
-- Até aqui a Súmula só aceitava 'primeiro'/'segundo' no evento — não dava pra lançar gol, cartão
-- ou substituição do 3º tempo desses jogos.
--
-- `sumulas.duracao_terceiro_tempo` (Profissional) também ganha a coluna, sempre null na prática —
-- só pra manter a mesma forma de `sumulas_base`, já que `lib/futebol/estatisticas-atleta-query.ts`
-- usa o MESMO select parametrizado pros dois departamentos (ver comentário no topo do arquivo).

alter table public.sumulas
  add column duracao_terceiro_tempo integer;

alter table public.sumulas_base
  add column duracao_terceiro_tempo integer;

-- O check constraint de `sumula_eventos_base.tempo` foi criado inline em 0053_sumula.sql (sem
-- nome explícito) — acha o nome gerado automaticamente pelo Postgres em vez de arriscar um nome
-- fixo que pode não bater exatamente.
do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
  from pg_constraint
  where conrelid = 'public.sumula_eventos_base'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%primeiro%'
    and pg_get_constraintdef(oid) ilike '%segundo%';

  if v_constraint_name is not null then
    execute format('alter table public.sumula_eventos_base drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.sumula_eventos_base
  add constraint sumula_eventos_base_tempo_check check (tempo in ('primeiro', 'segundo', 'terceiro'));

notify pgrst, 'reload schema';
