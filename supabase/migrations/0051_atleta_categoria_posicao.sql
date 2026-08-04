-- Categoria fixa de posição (Goleiro/Zagueiro/Lateral/Meia/Atacante), usada pra gerar a tag
-- colorida (GOL/ZAG/LAT/MEI/ATA) na tela de Convocação. O campo de texto livre "posicao" continua
-- existindo do jeito que está — este é um campo novo, só de classificação.
alter table public.atletas
  add column if not exists categoria_posicao text
    check (categoria_posicao in ('goleiro', 'zagueiro', 'lateral', 'meia', 'atacante'));

alter table public.atletas_base
  add column if not exists categoria_posicao text
    check (categoria_posicao in ('goleiro', 'zagueiro', 'lateral', 'meia', 'atacante'));

-- Backfill por palavra-chave no texto já cadastrado em "posicao", pros atletas que já existem.
-- Quem não bater com nenhuma palavra-chave fica com categoria_posicao nulo — a tela de Convocação
-- mostra esses atletas com uma tag "—" em vez de travar ou escondê-los, e o cadastro passa a
-- pedir a categoria em toda edição futura, então a lista tende a zerar com o tempo.
update public.atletas
set categoria_posicao = 'goleiro'
where categoria_posicao is null and posicao ilike '%gol%';

update public.atletas
set categoria_posicao = 'zagueiro'
where categoria_posicao is null and posicao ilike '%zag%';

update public.atletas
set categoria_posicao = 'lateral'
where categoria_posicao is null and posicao ilike '%lateral%';

update public.atletas
set categoria_posicao = 'meia'
where categoria_posicao is null and (posicao ilike '%meia%' or posicao ilike '%meio%' or posicao ilike '%volante%');

update public.atletas
set categoria_posicao = 'atacante'
where categoria_posicao is null
  and (posicao ilike '%atacante%' or posicao ilike '%ponta%' or posicao ilike '%centroavante%' or posicao ilike '%centro-avante%');

update public.atletas_base
set categoria_posicao = 'goleiro'
where categoria_posicao is null and posicao ilike '%gol%';

update public.atletas_base
set categoria_posicao = 'zagueiro'
where categoria_posicao is null and posicao ilike '%zag%';

update public.atletas_base
set categoria_posicao = 'lateral'
where categoria_posicao is null and posicao ilike '%lateral%';

update public.atletas_base
set categoria_posicao = 'meia'
where categoria_posicao is null and (posicao ilike '%meia%' or posicao ilike '%meio%' or posicao ilike '%volante%');

update public.atletas_base
set categoria_posicao = 'atacante'
where categoria_posicao is null
  and (posicao ilike '%atacante%' or posicao ilike '%ponta%' or posicao ilike '%centroavante%' or posicao ilike '%centro-avante%');
