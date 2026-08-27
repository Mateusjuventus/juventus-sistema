-- Marca se `pos_x`/`pos_y` veio de um arrasto manual (Mateus) ou foi calculado automaticamente pelo
-- sistema (ver docs/superpowers/specs/2026-08-27-organograma-layout-proporcional-design.md,
-- atualização de 27/08 — bug de caixas se sobrepondo/"sumindo"). Sem essa distinção, toda vez que
-- uma caixa nova era criada sem Grupo, o sistema "congelava" a posição dela sem saber onde as
-- outras caixas de liderança já congeladas estavam — cada caixa nova recalculava sozinha, do zero,
-- podendo cair em cima de uma caixa já existente (na tela E no PDF, já que os dois leem a mesma
-- posição salva). O conserto passa a recalcular junto todas as caixas SEM arrasto manual a cada
-- mudança (garantindo que nunca se sobrepõem entre si), preservando pra sempre quem foi arrastada
-- de propósito.
alter table public.organograma_base
  add column pos_manual boolean not null default false;

-- Registros existentes: quem já tinha posição salva é tratado como arrastado de propósito — mais
-- seguro que reflowar arranjos que o Mateus já ajustou na mão. Só quem nunca teve posição salva
-- entra no recálculo automático daqui pra frente.
update public.organograma_base
  set pos_manual = true
  where pos_x is not null and pos_y is not null;
