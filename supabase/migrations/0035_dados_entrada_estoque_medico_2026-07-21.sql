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
-- Observação: "CEFALEXINA 500MG" aparecia 2x na lista original (3CX e 6CX) — a pedido do Mateus,
-- as duas linhas foram unidas numa só (3 + 6 = 9 caixas), registrada como uma única linha no
-- histórico da ficha.
--
-- A dosagem (mg) vai no campo próprio "mg" de estoque_itens (mesma coluna usada pelo formulário de
-- cadastro de item, "Mg / dosagem (opcional)") — não faz mais parte do nome/descrição do item. Como
-- CETOPROFENO e NIMESULIDA aparecem na lista em duas dosagens diferentes, o item do catálogo é
-- identificado pelo par (nome, mg) — não só pelo nome — pra não misturar as duas apresentações.

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
      ('ACETILCISTEINA', null, 'Caixa', 2),
      ('ALGINAC', null, 'Caixa', 1),
      ('ALIVETORE', null, 'Caixa', 3),
      ('AMOXICILINA', '875mg', 'Caixa', 3),
      ('AZITROMICINA', '500mg', 'Caixa', 3),
      ('BENALET', null, 'Caixa', 3),
      ('BENZETACIL', null, 'Caixa', 1),
      ('BUSCOPAN', '10mg', 'Caixa', 2),
      ('CEFALEXINA', '500mg', 'Caixa', 9),
      ('CETOCONAZOL', null, 'Caixa', 3),
      ('CETOPROFENO', '150mg', 'Caixa', 1),
      ('CETOPROFENO', '50mg', 'Caixa', 2),
      ('CICLOBENZAPRINA', null, 'Caixa', 4),
      ('CIMEGRIPE', null, 'Caixa', 3),
      ('CITONEURIN', '1000mg', 'Caixa', 5),
      ('COLATEN FORCE', null, 'Caixa', 2),
      ('CRONOBÊ', null, 'Caixa', 4),
      ('DICLOFENACO', '500mg', 'Caixa', 3),
      ('DIPIRONA', '500mg', 'Caixa', 1),
      ('DIPROSPAN INJETÁVEL', null, 'Caixa', 2),
      ('DRAMIN B6', null, 'Caixa', 1),
      ('ECOFILM', null, 'Frasco', 2),
      ('ETNA', null, 'Caixa', 3),
      ('FLEXONE', null, 'Caixa', 2),
      ('GASTRO GEL', null, 'Caixa', 1),
      ('HIDROXIZINA', null, 'Caixa', 2),
      ('IMOSEC', null, 'Caixa', 1),
      ('LISADOR', null, 'Caixa', 1),
      ('LISINA', '250mg', 'Caixa', 1),
      ('LORATADINA', '10mg', 'Caixa', 3),
      ('NEBACETIN', null, 'Caixa', 2),
      ('NIMESULIDA', '100mg', 'Caixa', 3),
      ('NIMESULIDA', '400mg', 'Caixa', 8),
      ('ONDASENTRONA', '8mg', 'Caixa', 3),
      ('PANTOPRAZOL', null, 'Caixa', 1),
      ('PLASIL', null, 'Caixa', 3),
      ('REPOFLOR', null, 'Caixa', 1),
      ('RINOSORO', null, 'Caixa', 9),
      ('TANDRILAX', null, 'Caixa', 2),
      ('TRIADE', null, 'Caixa', 2),
      ('TRIFOR', null, 'Caixa', 10),
      ('VICK VAPORUB', null, 'Caixa', 2),
      ('VITAMINA C', null, 'Caixa', 1),
      ('VOLTAREN', '75mg', 'Caixa', 1),
      ('VOLTAREN INJETAVEL', null, 'Caixa', 4),
      ('VONAU', null, 'Caixa', 1)
    ) as t(nome, mg, unidade, quantidade)
  loop
    select id into v_item_id
    from public.estoque_itens
    where categoria = v_categoria
      and lower(trim(nome)) = lower(trim(rec.nome))
      and coalesce(lower(trim(mg)), '') = coalesce(lower(trim(rec.mg)), '')
    limit 1;

    if v_item_id is null then
      insert into public.estoque_itens (categoria, nome, mg, tamanhos)
      values (v_categoria, rec.nome, rec.mg, '{}'::jsonb)
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
