-- Número da camisa por CONVOCAÇÃO (jogo), só no Futebol de Base — diferente do Profissional, a
-- numeração de um atleta da Base não é fixa (muda de jogo pra jogo), então não faz sentido usar
-- `atletas_base.numero_camisa` (esse campo continua existindo, mas não é mais o usado no fluxo de
-- convocação/presskit da Base). Pedido do usuário: ao escalar um atleta (titular ou reserva), o
-- número vem sempre em branco e é preenchido/editado ali mesmo na tela de Convocação; o Presskit
-- da Base passa a ordenar titulares e reservas por esse número (crescente), em vez de por posição.

alter table public.convocacao_atletas_base add column numero_camisa integer;
