-- Investiga os 23 nomes da planilha que não bateram com categoria = sub15/sub17.
-- Mostra se existem em OUTRA categoria (desatualização) ou se o nome no cadastro é
-- parecido mas não idêntico (comparando primeiro nome + último sobrenome).

with alvo(nome) as (
  values
    ('Cauã Gabryel Aquilis Vítor'),
    ('Enzo Gabriel Dias de Souza'),
    ('Felipe Gabriel Cerdeira Silva'),
    ('Fernando Kioshi Villegas Kuroda'),
    ('Gabriel Henrique Venancio Meirelles de Souza'),
    ('Gabriel Mendes Lima'),
    ('Guilherme Ferreira Olinto'),
    ('Hugo Valdez'),
    ('ivi bacci junior'),
    ('João Lucas Baldança'),
    ('João Sanches Pagliuso'),
    ('Leonardo Tardin da Costa'),
    ('Lucas Procópio Sampaio'),
    ('Lucas Santos Souza Filho'),
    ('Márcio Victor Duarte Rodrigues'),
    ('Mario Sérgio lima de Carvalho'),
    ('Miguel Gonzales João'),
    ('Miguel rodrigues da silva'),
    ('otavio henrique ribeiro simionato'),
    ('Pedro Manoel Gomes Scanhoela'),
    ('Rodrigo Gimenes da rocha'),
    ('Ronaldo ferreira'),
    ('Tarso Pereira Gonçalves')
),
alvo_tokens as (
  select
    nome,
    lower(split_part(nome, ' ', 1)) as primeiro_nome,
    lower(split_part(nome, ' ', array_length(regexp_split_to_array(nome, '\s+'), 1))) as ultimo_sobrenome
  from alvo
)
select
  at2.nome as nome_planilha,
  at.id,
  at.nome_completo as nome_no_cadastro,
  at.categoria,
  at.ativo
from alvo_tokens at2
left join public.atletas at
  on lower(at.nome_completo) ilike '%' || at2.primeiro_nome || '%'
     and lower(at.nome_completo) ilike '%' || at2.ultimo_sobrenome || '%'
order by at2.nome, at.id;
