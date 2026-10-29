-- Remove convocacao_staff/convocacao_staff_base — tabelas criadas em 0003_convocacao.sql e
-- 0033_futebol_base_jogos_financeiro.sql (pensadas como "convocar staff pro jogo", espelhando
-- convocacao_comissao), mas nenhuma tela ou action do sistema jamais leu/escreveu nelas
-- (confirmado via busca por ".from(\"convocacao_staff\")" em todo o repo, sem nenhum resultado) —
-- achado durante o levantamento da Fase 2 (Jogos/Convocação). Mateus confirmou em 29/10/2026 que é
-- pra remover mesmo, não implementar.
--
-- Checagem de segurança antes de derrubar: aborta se alguma das duas tiver qualquer linha — nesse
-- caso existe uso real que passou batido na busca por texto, e vale investigar antes de apagar.
do $$
declare
  linhas_staff int;
  linhas_staff_base int;
begin
  select count(*) into linhas_staff from public.convocacao_staff;
  select count(*) into linhas_staff_base from public.convocacao_staff_base;
  if linhas_staff > 0 or linhas_staff_base > 0 then
    raise exception 'convocacao_staff tem % linha(s) e convocacao_staff_base tem % linha(s) — não são tabelas vazias, aborta antes de apagar.', linhas_staff, linhas_staff_base;
  end if;
end $$;

drop table public.convocacao_staff;
drop table public.convocacao_staff_base;

notify pgrst, 'reload schema';
