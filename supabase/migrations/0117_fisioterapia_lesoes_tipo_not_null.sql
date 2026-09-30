-- Trava fisioterapia_lesoes.tipo como obrigatório — só depois de confirmar, rodando a migração
-- 0116 antes desta, que as duas contagens de conferência no fim dela (lesoes_sem_tipo,
-- queixas_sem_tipo) vieram 0. Migração separada da 0116 de propósito: o SQL Editor do Supabase roda
-- o texto colado inteiro como uma transação só, então se essa trava aqui falhasse (por sobrar algum
-- registro sem tipo) DENTRO do mesmo script da 0116, o Postgres desfaria a 0116 inteira de volta —
-- inclusive a coluna nova e a reclassificação já feita. Rodando em separado, um problema aqui nunca
-- arrisca desfazer o que a 0116 já deixou salvo.
--
-- Se der o mesmo erro de antes ("column ... contains null values"), rode esta consulta de
-- diagnóstico e mande o resultado — ela mostra exatamente quais lesões ficaram sem tipo (pra eu
-- gerar um UPDATE certeiro por id, sem depender de casar texto):
--
--   select l.id, a.nome_completo, l.descricao, l.data_inicio, l.data_fim
--   from public.fisioterapia_lesoes l
--   join public.atletas a on a.id = l.atleta_id
--   where l.tipo is null
--   order by a.nome_completo;

alter table public.fisioterapia_lesoes alter column tipo set not null;

notify pgrst, 'reload schema';
