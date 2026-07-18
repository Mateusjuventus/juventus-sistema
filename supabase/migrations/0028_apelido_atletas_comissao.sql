-- Apelido (como a pessoa é chamada no dia a dia) usado nos pôsteres de Relacionados — em vez do
-- nome completo, que fica grande demais pra caber bem no layout de duas colunas. Opcional: quando
-- vazio, o pôster usa o nome completo no lugar (nunca trava a geração por falta de apelido).
--
-- Comissão Técnica também ganha o campo (consistência de cadastro), mesmo não aparecendo hoje em
-- nenhum pôster — só Atletas entram na lista de Relacionados.
alter table public.atletas
  add column if not exists apelido text;

alter table public.comissao_tecnica
  add column if not exists apelido text;
