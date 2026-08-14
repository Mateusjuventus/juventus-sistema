-- Terceira ramificação do Estoque: MATERIAIS (pedido do Mateus em 13/08). Esportivo e Medicamentos
-- continuam como estão; Materiais entra do mesmo jeito — catálogo, entradas, saídas, histórico e
-- relatório próprios, sem se misturar com as outras duas.
--
-- O valor gravado da categoria de medicamentos continua sendo 'medico'. Só o RÓTULO mudou de
-- "Médico" para "Medicamentos" (na tela e nos documentos). Renomear o valor no banco obrigaria a
-- reescrever `estoque_itens`, `estoque_entradas`, `estoque_saidas` e a permissão de cada perfil de
-- uma vez, com risco em dado que já existe, pra ganhar só uma URL mais bonita — não vale.

-- As três tabelas carregam a categoria e a validam por CHECK, então as três precisam aceitar o
-- valor novo. Os nomes das constraints são os que o Postgres gerou automaticamente em 0021.

alter table public.estoque_itens drop constraint if exists estoque_itens_categoria_check;
alter table public.estoque_itens
  add constraint estoque_itens_categoria_check
  check (categoria in ('esportivo', 'medico', 'materiais'));

alter table public.estoque_entradas drop constraint if exists estoque_entradas_categoria_check;
alter table public.estoque_entradas
  add constraint estoque_entradas_categoria_check
  check (categoria in ('esportivo', 'medico', 'materiais'));

alter table public.estoque_saidas drop constraint if exists estoque_saidas_categoria_check;
alter table public.estoque_saidas
  add constraint estoque_saidas_categoria_check
  check (categoria in ('esportivo', 'medico', 'materiais'));

-- Permissão por ramificação (0026): quem já usa o sistema passa a enxergar Materiais também —
-- mesmo espírito das outras migrações de módulo novo, que nunca tiram acesso de ninguém.

alter table public.perfis
  alter column estoque_categorias_permitidas set default array[
    'esportivo',
    'medico',
    'materiais'
  ];

update public.perfis
  set estoque_categorias_permitidas = array_append(estoque_categorias_permitidas, 'materiais')
  where not ('materiais' = any(estoque_categorias_permitidas));
