-- Atleta: "Data de início do contrato", posição única (9 valores fixos) substituindo
-- Posição + Categoria de posição — ver docs/superpowers/specs/
-- 2026-08-25-atleta-contrato-posicao-cpf-design.md.

-- 1) Data de início do contrato — distinta de data_inicio_clube (quando o atleta entrou no
-- clube). Só cadastro interno, nunca vem do link público.
alter table public.atletas
  add column if not exists data_inicio_contrato date;

alter table public.atletas_base
  add column if not exists data_inicio_contrato date;

-- 2) Coluna temporária: marca quem teve a posição resolvida por um valor padrão (não por
-- classificação direta) na migração abaixo, pra dar pro Mateus uma lista de revisão depois.
-- Pode ser removida numa migração futura, sem pressa.
alter table public.atletas
  add column if not exists posicao_revisar boolean not null default false;

alter table public.atletas_base
  add column if not exists posicao_revisar boolean not null default false;

-- 3) Backfill de "posicao" pra um dos 9 valores fixos, combinando a categoria já classificada
-- (categoria_posicao, 5 grupos) com o texto livre que já estava em "posicao" — mesmo espírito das
-- migrações 0051/0052 (backfill original de categoria_posicao por palavra-chave).

-- Goleiro e Zagueiro não têm ambiguidade nenhuma.
update public.atletas
set posicao = 'Goleiro'
where categoria_posicao = 'goleiro';

update public.atletas
set posicao = 'Zagueiro'
where categoria_posicao = 'zagueiro';

-- Lateral: o texto livre decide o lado quando dá pra saber; sem indicação de lado, cai no padrão
-- "Lateral Direito" e fica marcado pra revisão.
update public.atletas
set posicao = 'Lateral Esquerdo', posicao_revisar = false
where categoria_posicao = 'lateral' and posicao ilike '%esquerd%';

update public.atletas
set posicao = 'Lateral Direito', posicao_revisar = false
where categoria_posicao = 'lateral' and posicao ilike '%direit%' and posicao not ilike '%esquerd%';

update public.atletas
set posicao = 'Lateral Direito', posicao_revisar = true
where categoria_posicao = 'lateral' and posicao not ilike '%direit%' and posicao not ilike '%esquerd%';

-- Meia: quando o texto livre menciona "volante", vira Volante — senão é Meia mesmo (não é um
-- chute, é a leitura mais direta da categoria "meia" que já existia).
update public.atletas
set posicao = 'Volante'
where categoria_posicao = 'meia' and posicao ilike '%volante%';

update public.atletas
set posicao = 'Meia'
where categoria_posicao = 'meia' and posicao not ilike '%volante%';

-- Atacante: quando o texto livre sugere ponta ("ponta", "extremo", "ala"), tenta achar o lado; sem
-- lado identificável mas com indício de ponta, cai no padrão "Atacante" e fica marcado pra revisão
-- (sabemos que não é um centroavante comum, mas não dá pra saber de qual lado). Sem nenhum indício
-- de ponta, é Atacante direto.
update public.atletas
set posicao = 'Ponta Esquerda', posicao_revisar = false
where categoria_posicao = 'atacante'
  and (posicao ilike '%ponta%' or posicao ilike '%extremo%' or posicao ilike '%ala%')
  and posicao ilike '%esquerd%';

update public.atletas
set posicao = 'Ponta Direita', posicao_revisar = false
where categoria_posicao = 'atacante'
  and (posicao ilike '%ponta%' or posicao ilike '%extremo%' or posicao ilike '%ala%')
  and posicao ilike '%direit%' and posicao not ilike '%esquerd%';

update public.atletas
set posicao = 'Atacante', posicao_revisar = true
where categoria_posicao = 'atacante'
  and (posicao ilike '%ponta%' or posicao ilike '%extremo%' or posicao ilike '%ala%')
  and posicao not ilike '%direit%' and posicao not ilike '%esquerd%';

update public.atletas
set posicao = 'Atacante'
where categoria_posicao = 'atacante'
  and posicao not ilike '%ponta%' and posicao not ilike '%extremo%' and posicao not ilike '%ala%';

-- Fallback final — qualquer atleta que por algum motivo não tenha categoria_posicao classificada
-- (não deveria acontecer depois da 0052, mas por segurança) vira Meia e fica marcado pra revisão.
update public.atletas
set posicao = 'Meia', posicao_revisar = true
where categoria_posicao is null;

-- Mesmo backfill, agora em atletas_base.
update public.atletas_base
set posicao = 'Goleiro'
where categoria_posicao = 'goleiro';

update public.atletas_base
set posicao = 'Zagueiro'
where categoria_posicao = 'zagueiro';

update public.atletas_base
set posicao = 'Lateral Esquerdo', posicao_revisar = false
where categoria_posicao = 'lateral' and posicao ilike '%esquerd%';

update public.atletas_base
set posicao = 'Lateral Direito', posicao_revisar = false
where categoria_posicao = 'lateral' and posicao ilike '%direit%' and posicao not ilike '%esquerd%';

update public.atletas_base
set posicao = 'Lateral Direito', posicao_revisar = true
where categoria_posicao = 'lateral' and posicao not ilike '%direit%' and posicao not ilike '%esquerd%';

update public.atletas_base
set posicao = 'Volante'
where categoria_posicao = 'meia' and posicao ilike '%volante%';

update public.atletas_base
set posicao = 'Meia'
where categoria_posicao = 'meia' and posicao not ilike '%volante%';

update public.atletas_base
set posicao = 'Ponta Esquerda', posicao_revisar = false
where categoria_posicao = 'atacante'
  and (posicao ilike '%ponta%' or posicao ilike '%extremo%' or posicao ilike '%ala%')
  and posicao ilike '%esquerd%';

update public.atletas_base
set posicao = 'Ponta Direita', posicao_revisar = false
where categoria_posicao = 'atacante'
  and (posicao ilike '%ponta%' or posicao ilike '%extremo%' or posicao ilike '%ala%')
  and posicao ilike '%direit%' and posicao not ilike '%esquerd%';

update public.atletas_base
set posicao = 'Atacante', posicao_revisar = true
where categoria_posicao = 'atacante'
  and (posicao ilike '%ponta%' or posicao ilike '%extremo%' or posicao ilike '%ala%')
  and posicao not ilike '%direit%' and posicao not ilike '%esquerd%';

update public.atletas_base
set posicao = 'Atacante'
where categoria_posicao = 'atacante'
  and posicao not ilike '%ponta%' and posicao not ilike '%extremo%' and posicao not ilike '%ala%';

update public.atletas_base
set posicao = 'Meia', posicao_revisar = true
where categoria_posicao is null;

-- 4) Só agora, com todo mundo já num dos 9 valores, trava a coluna com CHECK constraint.
alter table public.atletas
  add constraint atletas_posicao_check
  check (posicao in (
    'Goleiro', 'Zagueiro', 'Lateral Direito', 'Lateral Esquerdo', 'Volante', 'Meia', 'Atacante',
    'Ponta Direita', 'Ponta Esquerda'
  ));

alter table public.atletas_base
  add constraint atletas_base_posicao_check
  check (posicao in (
    'Goleiro', 'Zagueiro', 'Lateral Direito', 'Lateral Esquerdo', 'Volante', 'Meia', 'Atacante',
    'Ponta Direita', 'Ponta Esquerda'
  ));

-- 5) "Categoria de posição" deixa de ser um campo cadastrado — a tag GOL/ZAG/LAT/MEI/ATA da
-- Convocação e o agrupamento do Campograma passam a ser calculados a partir da posição
-- (categoriaDaPosicao, lib/futebol/categoria-posicao.ts).
alter table public.atletas drop column if exists categoria_posicao;
alter table public.atletas_base drop column if exists categoria_posicao;

-- Depois de rodar esta migração, use esta consulta pra ver quem precisa de revisão manual (posição
-- resolvida por um valor padrão, não por classificação direta):
--
--   select nome_completo, posicao from public.atletas where posicao_revisar order by nome_completo;
--   select nome_completo, posicao from public.atletas_base where posicao_revisar order by nome_completo;
