-- Link do PDF da súmula oficial (FPF) nos resultados dos jogos dos grupos e nos jogos do
-- Juventus vinculados à competição — é dele que o sistema extrai placar e cartões
-- automaticamente, reaproveitando o mesmo leitor da aba Súmula (lib/fpf/sumula-pdf.ts).
--
-- O jogo do Juventus já tem `jogos.fpf_link_sumula` (0055), mas aquele link é o da NOSSA súmula
-- (usada pra importar os eventos dos nossos atletas). Aqui a coluna guarda o link usado pra
-- preencher os cartões do ADVERSÁRIO — na prática é o mesmo PDF, mas fica registrado no vínculo
-- pra dar pra reimportar sem depender do outro fluxo.

alter table public.competicao_grupo_resultados
  add column sumula_link text;

alter table public.competicao_jogos
  add column sumula_link text;
