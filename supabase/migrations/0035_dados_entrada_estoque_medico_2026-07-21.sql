-- NÃO é uma migração de schema — é um script de DADOS, pra registrar uma Entrada real no Estoque
-- Médico (Futebol Profissional) a partir da lista fotografada por Mateus. Rodar uma vez, no SQL
-- Editor do painel Supabase, como as demais migrações desta pasta. Depois de rodado, a Entrada
-- aparece normalmente em /estoque/medico/historico, com PDF/ficha inclusos.
--
-- O que faz, item por item da lista:
--  1. Procura no catálogo (estoque_itens, categoria='medico') um item com o mesmo nome
--     (case-insensitive). Se não existir, cadastra um novo item.
--  2. Soma a quantidade na unidade "Caixa" (ou "Frasco", só pro Ecofilm) desse item.
--  3. Registra uma linha correspondente na Entrada (estoque_entrada_itens), preservando a ordem
--     da lista original.
-- No fim, cria 1 registro em estoque_entradas com data = hoje e número sequencial (o próximo da
-- categoria médico).
--
-- Observação: "CEFALEXINA 500MG" aparece 2x na lista (3CX e 6CX) — tratado aqui como o MESMO item
-- do catálogo recebendo duas entregas dentro da mesma entrada (3 + 6 = 9 caixas ao final), com as
-- duas linhas preservadas separadamente no histórico da ficha. Se a intenção era outra (ex.: são
-- duas apresentações diferentes do mesmo remédio), me avise antes de rodar.

do $$
declare
  v_categoria text := 'medico';
  v_numero integer;
  v_entrada_id uuid;
  v_item_id uuid;
  v_ordem integer := 0;
  v_atual numeric;
  rec record;
begin
  select coalesce(max(numero), 0) + 1 into v_numero
  from public.estoque_entradas where categoria = v_categoria;

  insert into public.estoque_entradas (categoria, numero, data, observacoes)
  values (
    v_categoria,
    v_numero,
    current_date,
    'Entrada cadastrada a partir da lista enviada por Mateus (foto do estoque físico) em 2026-07-21.'
  )
  returning id into v_entrada_id;

  for rec in
    select * from (values
      ('ACETILCISTEINA', 'Caixa', 2),
      ('ALGINAC', 'Caixa', 1),
      ('ALIVETORE', 'Caixa', 3),
      ('AMOXICILINA 875MG', 'Caixa', 3),
      ('AZITROMICINA 500MG', 'Caixa', 3),
      ('BENALET', 'Caixa', 3),
      ('BENZETACIL', 'Caixa', 1),
      ('BUSCOPAN 10MG', 'Caixa', 2),
      ('CEFALEXINA 500MG', 'Caixa', 3),
      ('CEFALEXINA 500MG', 'Caixa', 6),
      ('CETOCONAZOL', 'Caixa', 3),
      ('CETOPROFENO 150MG', 'Caixa', 1),
      ('CETOPROFENO 50MG', 'Caixa', 2),
      ('CICLOBENZAPRINA', 'Caixa', 4),
      ('CIMEGRIPE', 'Caixa', 3),
      ('CITONEURIN 1000MG', 'Caixa', 5),
      ('COLATEN FORCE', 'Caixa', 2),
      ('CRONOBÊ', 'Caixa', 4),
      ('DICLOFENACO 500MG', 'Caixa', 3),
      ('DIPIRONA 500MG', 'Caixa', 1),
      ('DIPROSPAN INJETÁVEL', 'Caixa', 2),
      ('DRAMIN B6', 'Caixa', 1),
      ('ECOFILM', 'Frasco', 2),
      ('ETNA', 'Caixa', 3),
      ('FLEXONE', 'Caixa', 2),
      ('GASTRO GEL', 'Caixa', 1),
      ('HIDROXIZINA', 'Caixa', 2),
      ('IMOSEC', 'Caixa', 1),
      ('LISADOR', 'Caixa', 1),
      ('LISINA 250MG', 'Caixa', 1),
      ('LORATADINA 10MG', 'Caixa', 3),
      ('NEBACETIN', 'Caixa', 2),
      ('NIMESULIDA 100MG', 'Caixa', 3),
      ('NIMESULIDA 400MG', 'Caixa', 8),
      ('ONDASENTRONA 8MG', 'Caixa', 3),
      ('PANTOPRAZOL', 'Caixa', 1),
      ('PLASIL', 'Caixa', 3),
      ('REPOFLOR', 'Caixa', 1),
      ('RINOSORO', 'Caixa', 9),
      ('TANDRILAX', 'Caixa', 2),
      ('TRIADE', 'Caixa', 2),
      ('TRIFOR', 'Caixa', 10),
      ('VICK VAPORUB', 'Caixa', 2),
      ('VITAMINA C', 'Caixa', 1),
      ('VOLTAREN 75MG', 'Caixa', 1),
      ('VOLTAREN INJETAVEL', 'Caixa', 4),
      ('VONAU', 'Caixa', 1)
    ) as t(nome, unidade, quantidade)
  loop
    select id into v_item_id
    from public.estoque_itens
    where categoria = v_categoria and lower(trim(nome)) = lower(trim(rec.nome))
    limit 1;

    if v_item_id is null then
      insert into public.estoque_itens (categoria, nome, tamanhos)
      values (v_categoria, rec.nome, '{}'::jsonb)
      returning id into v_item_id;
    end if;

    select coalesce((tamanhos->>rec.unidade)::numeric, 0) into v_atual
    from public.estoque_itens where id = v_item_id;

    update public.estoque_itens
    set tamanhos = jsonb_set(tamanhos, array[rec.unidade], to_jsonb(v_atual + rec.quantidade), true)
    where id = v_item_id;

    insert into public.estoque_entrada_itens (entrada_id, item_id, nome, tamanho, codigo, quantidade, ordem)
    values (v_entrada_id, v_item_id, rec.nome, rec.unidade, null, rec.quantidade, v_ordem);

    v_ordem := v_ordem + 1;
  end loop;
end $$;
