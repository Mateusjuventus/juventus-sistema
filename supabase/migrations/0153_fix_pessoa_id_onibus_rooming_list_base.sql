-- Corrige um gap que a 0151_unificacao_atletas_fks.sql deixou passar: ela remapeou as 9 FKs de
-- verdade que apontavam pra `atletas_base_old`, mas `onibus_passageiros_base.pessoa_id` e
-- `rooming_list_ocupantes_base.pessoa_id` NUNCA foram FK — são referência polimórfica (o campo
-- irmão `pessoa_tipo` diz se `pessoa_id` é um atleta, um membro da comissão ou um staff; ver
-- `PessoaTipoOnibus`/`PessoaTipoRooming` em lib/supabase/types.ts), então a 0151 não tinha como
-- pegar essas duas colunas — ela só corrige constraint de FK real.
--
-- Resultado prático: dos 5 atletas que a 0150_unificacao_atletas.sql mesclou (cadastro duplicado
-- Profissional + Base, mesmo CPF/RG — a linha nova ficou com o id do Profissional, não o antigo da
-- Base), qualquer ônibus ou rooming-list de jogo da Base lançado ANTES da unificação, pra um desses
-- 5 atletas, ficou com `pessoa_id` apontando pro id antigo (que só existe em `atletas_base_old`,
-- nunca mais lido por tela nenhuma) — o registro não dá erro nenhum, só silenciosamente não casa
-- com ninguém no join hoje (a pessoa some da lista de passageiros/ocupantes).
--
-- Descoberta durante o levantamento da Fase 2 (Jogos/Convocação) — corrigida à parte, antes de
-- começar a mexer no módulo de Jogos, igual pedido do Mateus em 29/10/2026.

-- =========================================================
-- 1) Mesmo mapeamento id-antigo -> id-novo da 0151 (reconstruído aqui porque temporary table não
--    sobrevive entre migrations) — `atletas_base_old` continua intacta como backup (ver 0150).
-- =========================================================
create temporary table atletas_base_old_remapeamento as
select
  old.id as id_antigo,
  coalesce(
    (select a.id from public.atletas a where a.id = old.id),
    (select a.id from public.atletas a where a.cpf = old.cpf or a.rg = old.rg)
  ) as id_novo
from public.atletas_base_old old;

-- Mesma conferência de sanidade da 0151: aborta em vez de corrigir em cima de um mapeamento
-- incompleto.
do $$
declare
  sem_match int;
begin
  select count(*) into sem_match from atletas_base_old_remapeamento where id_novo is null;
  if sem_match > 0 then
    raise exception 'Encontrados % atletas em atletas_base_old sem correspondência em atletas — aborta antes de corrigir pessoa_id.', sem_match;
  end if;
end $$;

-- =========================================================
-- 2) Remapeia pessoa_id só onde pessoa_tipo = 'atleta' — comissão e staff nunca tiveram uma tabela
--    "_base" separada pra fundir, então o id deles nunca mudou.
-- =========================================================
update public.onibus_passageiros_base t set pessoa_id = m.id_novo
  from atletas_base_old_remapeamento m
  where t.pessoa_tipo = 'atleta' and t.pessoa_id = m.id_antigo and m.id_antigo <> m.id_novo;

update public.rooming_list_ocupantes_base t set pessoa_id = m.id_novo
  from atletas_base_old_remapeamento m
  where t.pessoa_tipo = 'atleta' and t.pessoa_id = m.id_antigo and m.id_antigo <> m.id_novo;

notify pgrst, 'reload schema';
