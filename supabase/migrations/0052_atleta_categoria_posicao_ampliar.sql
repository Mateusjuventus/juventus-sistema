-- Amplia a classificação automática de categoria_posicao (0051) com mais palavras-chave — cobre
-- casos como "Extremo" (atacante de ponta), que a 0051 não pegava — e garante que ninguém fique
-- sem categoria: quem não bater com nenhuma palavra-chave conhecida recebe "meia" como fallback
-- final (categoria mais genérica), pra pedido do usuário de que todo atleta tenha uma sigla na
-- grade de Convocação. Só mexe em quem ainda está nulo — não sobrescreve nada já classificado.

update public.atletas
set categoria_posicao = 'zagueiro'
where categoria_posicao is null and (posicao ilike '%libero%' or posicao ilike '%líbero%' or posicao ilike '%beque%' or posicao ilike '%defensor%');

update public.atletas
set categoria_posicao = 'lateral'
where categoria_posicao is null and posicao ilike '%ala%';

update public.atletas
set categoria_posicao = 'meia'
where categoria_posicao is null and (posicao ilike '%armador%' or posicao ilike '%meio-campista%' or posicao ilike '%meiocampo%' or posicao ilike '%volante%');

update public.atletas
set categoria_posicao = 'atacante'
where categoria_posicao is null
  and (posicao ilike '%extremo%' or posicao ilike '%extrema%' or posicao ilike '%ponta%' or posicao ilike '%avançado%' or posicao ilike '%avancado%');

update public.atletas
set categoria_posicao = 'goleiro'
where categoria_posicao is null and (posicao ilike '%guarda-redes%' or posicao ilike '%guarda redes%' or posicao ilike '%arqueiro%');

-- Fallback final — ninguém deve ficar sem categoria depois desta migração.
update public.atletas
set categoria_posicao = 'meia'
where categoria_posicao is null;

update public.atletas_base
set categoria_posicao = 'zagueiro'
where categoria_posicao is null and (posicao ilike '%libero%' or posicao ilike '%líbero%' or posicao ilike '%beque%' or posicao ilike '%defensor%');

update public.atletas_base
set categoria_posicao = 'lateral'
where categoria_posicao is null and posicao ilike '%ala%';

update public.atletas_base
set categoria_posicao = 'meia'
where categoria_posicao is null and (posicao ilike '%armador%' or posicao ilike '%meio-campista%' or posicao ilike '%meiocampo%' or posicao ilike '%volante%');

update public.atletas_base
set categoria_posicao = 'atacante'
where categoria_posicao is null
  and (posicao ilike '%extremo%' or posicao ilike '%extrema%' or posicao ilike '%ponta%' or posicao ilike '%avançado%' or posicao ilike '%avancado%');

update public.atletas_base
set categoria_posicao = 'goleiro'
where categoria_posicao is null and (posicao ilike '%guarda-redes%' or posicao ilike '%guarda redes%' or posicao ilike '%arqueiro%');

update public.atletas_base
set categoria_posicao = 'meia'
where categoria_posicao is null;
