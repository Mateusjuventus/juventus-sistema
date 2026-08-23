-- Organograma da Base: rótulo de LINHA, além do de coluna (`grupo`) — ver a imagem de referência do
-- Mateus, que tem "COMISSÃO SUB20", "COMISSÃO SUB17"... alinhados à esquerda de cada linha, cruzando
-- com as colunas "HEAD DE GOLEIROS", "HEAD DE ANÁLISE"... por cima. Sem isso só dava pra montar
-- coluna (empilhado por `ordem`); com `linha`, caixas com o mesmo rótulo alinham na mesma altura em
-- colunas diferentes, formando a grade de verdade.
alter table public.organograma_base add column if not exists linha text;
