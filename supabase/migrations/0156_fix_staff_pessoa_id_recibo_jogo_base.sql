-- Corrige um gap análogo ao que a 0153_fix_pessoa_id_onibus_rooming_list_base.sql resolveu pra
-- atletas — só que dessa vez em `staff_operacional` (0155_unificacao_staff_operacional.sql, rodada
-- hoje): `recibos_jogo_base.pessoa_id` (pessoa_tipo = 'staff') é referência polimórfica (sem FK de
-- verdade — mesmo caso de `onibus_passageiros_base`/`rooming_list_ocupantes_base`, que a 0155 já
-- tratava via `jogo_vagas_staff_base_inscricoes.staff_id`, essa sim uma FK real). A 0155 não tinha
-- como pegar essas colunas polimórficas.
--
-- Resultado prático: de quem a 0155 mesclou (cadastro duplicado Staff Operacional Profissional +
-- Base, mesmo CPF/RG — a linha final ficou com o id do Profissional, não o antigo da Base), 22
-- pessoas têm recibo de jogo da Base (`recibos_jogo_base`, pessoa_tipo='staff') apontando pro id
-- antigo, que só existe em `staff_operacional_base_old` — confirmado com o Mateus em 30/10/2026
-- rodando uma consulta de verificação antes desta migration (nenhum caso em `onibus_passageiros_
-- base`/`rooming_list_ocupantes_base`, só em `recibos_jogo_base`).
--
-- Descoberta e corrigida à parte, antes de começar a migration de Jogos (0157), mesmo padrão da
-- 0153.

-- =========================================================
-- 1) Mesmo mapeamento id-antigo -> id-novo da 0155 (reconstruído aqui porque temporary table não
--    sobrevive entre migrations) — `staff_operacional_base_old` continua intacta como backup.
-- =========================================================
create temporary table staff_operacional_base_old_remapeamento as
select
  old.id as id_antigo,
  coalesce(
    (select s.id from public.staff_operacional s where s.id = old.id),
    (select s.id from public.staff_operacional s where s.cpf = old.cpf or s.rg = old.rg)
  ) as id_novo
from public.staff_operacional_base_old old;

-- Mesma conferência de sanidade da 0151/0153: aborta em vez de corrigir em cima de um mapeamento
-- incompleto.
do $$
declare
  sem_match int;
begin
  select count(*) into sem_match from staff_operacional_base_old_remapeamento where id_novo is null;
  if sem_match > 0 then
    raise exception 'Encontrados % staff em staff_operacional_base_old sem correspondência em staff_operacional — aborta antes de corrigir pessoa_id.', sem_match;
  end if;
end $$;

-- =========================================================
-- 2) Remapeia pessoa_id só onde pessoa_tipo = 'staff', nas 3 tabelas polimórficas que usam
--    pessoa_tipo='staff' no Futebol de Base (onibus/rooming-list conferidos sem nenhum caso, mas
--    corrigidos aqui também por segurança — não custa nada rodar).
-- =========================================================
update public.onibus_passageiros_base t set pessoa_id = m.id_novo
  from staff_operacional_base_old_remapeamento m
  where t.pessoa_tipo = 'staff' and t.pessoa_id = m.id_antigo and m.id_antigo <> m.id_novo;

update public.rooming_list_ocupantes_base t set pessoa_id = m.id_novo
  from staff_operacional_base_old_remapeamento m
  where t.pessoa_tipo = 'staff' and t.pessoa_id = m.id_antigo and m.id_antigo <> m.id_novo;

update public.recibos_jogo_base t set pessoa_id = m.id_novo
  from staff_operacional_base_old_remapeamento m
  where t.pessoa_tipo = 'staff' and t.pessoa_id = m.id_antigo and m.id_antigo <> m.id_novo;

notify pgrst, 'reload schema';
