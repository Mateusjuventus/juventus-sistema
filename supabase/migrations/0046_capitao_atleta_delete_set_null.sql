-- `convocacoes.capitao_atleta_id` (e o espelho em `convocacoes_base`) apontava pro atleta sem uma
-- regra de "on delete" explícita, o que no Postgres vira "NO ACTION" — ou seja, excluir um atleta
-- que já foi capitão em algum jogo (mesmo antigo) falhava com violação de chave estrangeira. A
-- convocação em si não deve ser apagada nesse caso, só o "quem era o capitão" deixa de fazer
-- sentido — então trocamos pra "on delete set null" (a convocação continua existindo, só perde a
-- referência ao capitão).

alter table public.convocacoes
  drop constraint if exists convocacoes_capitao_atleta_id_fkey;
alter table public.convocacoes
  add constraint convocacoes_capitao_atleta_id_fkey
  foreign key (capitao_atleta_id) references public.atletas(id) on delete set null;

alter table public.convocacoes_base
  drop constraint if exists convocacoes_base_capitao_atleta_id_fkey;
alter table public.convocacoes_base
  add constraint convocacoes_base_capitao_atleta_id_fkey
  foreign key (capitao_atleta_id) references public.atletas_base(id) on delete set null;
