-- Disciplina POR EQUIPE na classificação dos grupos (pedido do Mateus a partir da tabela oficial
-- da FPF, que tem colunas CA/CV por clube — ver atualização na spec 2026-08-10-competicoes):
--
-- 1. `competicao_grupo_resultados`: cartões de cada lado nos jogos entre os OUTROS clubes,
--    lançados junto do placar na aba Súmulas dos Grupos.
-- 2. `competicao_jogos`: cartões do ADVERSÁRIO nos jogos do Juventus — a súmula do sistema só
--    registra cartões dos nossos atletas (os nossos entram sozinhos na contagem), então o lado
--    do adversário é complementado à mão no vínculo do jogo.
--
-- A contagem por equipe é sempre no escopo do GRUPO (que pertence a uma fase) — por isso o
-- zeramento entre fases acontece naturalmente: cada fase tem seus próprios grupos.

alter table public.competicao_grupo_resultados
  add column cartoes_amarelos_casa integer not null default 0 check (cartoes_amarelos_casa >= 0),
  add column cartoes_amarelos_fora integer not null default 0 check (cartoes_amarelos_fora >= 0),
  add column cartoes_vermelhos_casa integer not null default 0 check (cartoes_vermelhos_casa >= 0),
  add column cartoes_vermelhos_fora integer not null default 0 check (cartoes_vermelhos_fora >= 0);

alter table public.competicao_jogos
  add column cartoes_amarelos_adversario integer not null default 0 check (cartoes_amarelos_adversario >= 0),
  add column cartoes_vermelhos_adversario integer not null default 0 check (cartoes_vermelhos_adversario >= 0);
