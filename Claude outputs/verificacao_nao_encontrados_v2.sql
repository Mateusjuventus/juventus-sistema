-- Busca mais ampla pra esses 6 nomes que o Mateus confirmou que JÁ têm cadastro, mas que a
-- busca anterior (primeiro nome + último sobrenome, exato) não achou. Agora: tira acento
-- (sem precisar de extensão) e casa só por QUALQUER palavra do nome em comum com 3+ letras,
-- pra pegar apelido/nome diferente também.

create or replace function pg_temp.sem_acento(txt text) returns text as $$
  select translate(
    lower(txt),
    'áàãâäéèêëíìîïóòõôöúùûüçñÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
  );
$$ language sql immutable;

with alvo(nome) as (
  values
    ('ivi bacci junior'),
    ('João Lucas Baldança'),
    ('Leonardo Tardin da Costa'),
    ('Márcio Victor Duarte Rodrigues'),
    ('Pedro Manoel Gomes Scanhoela'),
    ('Tarso Pereira Gonçalves')
),
alvo_palavras as (
  select
    nome,
    unnest(regexp_split_to_array(pg_temp.sem_acento(nome), '\s+')) as palavra
  from alvo
)
select distinct
  ap.nome as nome_planilha,
  at.id,
  at.nome_completo as nome_no_cadastro,
  at.categoria,
  at.ativo,
  at.email
from alvo_palavras ap
join public.atletas at
  on length(ap.palavra) >= 3
  and pg_temp.sem_acento(at.nome_completo) ilike '%' || ap.palavra || '%'
order by ap.nome, at.nome_completo;
