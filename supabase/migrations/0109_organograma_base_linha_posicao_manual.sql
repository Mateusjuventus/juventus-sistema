-- Organograma da Base: permite arrastar o cartão INTEIRO de uma comissão/departamento pra uma
-- posição manual, igual já era possível com uma caixa de liderança — pedido do Mateus de 16/09.
-- Antes disso, cartão nunca podia ser arrastado (sempre calculado automaticamente): pra colocar
-- "Comissão Sub20" antes de "Comissão Sub17" só dava com os botões "Mover linha pra cima/baixo",
-- que só comparam comissões do MESMO supervisor. Como cada categoria tem um supervisor de verdade
-- diferente (Gustavo cobre um grupo, Italo outro), isso não bastava pra colocar os cartões na ordem
-- que o Mateus queria entre supervisores diferentes — arrastar dá controle total, sem precisar
-- inventar um supervisor em comum só pra reordenar.
--
-- Mesmo padrão de `organograma_base.pos_x/pos_y/pos_manual` já usado pra caixa de liderança: null/
-- false = layout automático continua decidindo; arrastando uma vez, essa posição vira "de propósito"
-- e nunca mais é recalculada por conta de outra caixa sendo criada/editada em qualquer canto do
-- organograma, até "Reorganizar automaticamente" ser usado.
alter table public.organograma_base_linha
  add column if not exists pos_x integer,
  add column if not exists pos_y integer,
  add column if not exists pos_manual boolean not null default false;

notify pgrst, 'reload schema';
