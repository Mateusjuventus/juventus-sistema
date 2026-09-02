-- Parte 1 (Copiar Dia) e Parte 2 (layout de exportação + microciclo em texto livre) da spec
-- docs/superpowers/specs/2026-09-02-programacao-copiar-dia-layout-geral-design.md.

-- 1) configuracoes_programacao_base ganha microciclo_texto — o rótulo fixo "Microciclo Nº X" vira
--    um campo de texto livre que o treinador preenche (ou deixa em branco). microciclo_atual e
--    epoca continuam existindo sem mudança (o pedido foi só sobre o rótulo "Microciclo").
alter table public.configuracoes_programacao_base add column microciclo_texto text;

-- 2) programacao_atividades.tipo ganha 3 valores novos: 'apresentacao', 'cafe_manha', 'video' —
--    somados aos 9 já existentes, não substituem nada. Mesmo padrão de troca de check constraint
--    já usado em 0087_atleta_base_classificacao_dispensa.sql (nome default gerado pelo Postgres pro
--    check inline original em 0094_programacao_semanal.sql).
alter table public.programacao_atividades drop constraint programacao_atividades_tipo_check;
alter table public.programacao_atividades add constraint programacao_atividades_tipo_check
  check (tipo in (
    'programacao', 'refeicao', 'academia', 'treinamento', 'transporte',
    'jogo_oficial', 'jogo_treino', 'imprensa', 'regenerativo',
    'apresentacao', 'cafe_manha', 'video'
  ));
