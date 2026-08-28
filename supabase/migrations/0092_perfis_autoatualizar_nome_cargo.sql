-- Bug encontrado em produção pelo Mateus: "Minha Conta" (Fase 1, app/minha-conta/actions.ts,
-- salvarMeuNomeCargo) tenta salvar nome/cargo direto em `perfis`, mas a migration 0023 deixou essa
-- tabela de propósito SEM política de update para "authenticated" — só select — justamente pra
-- ninguém conseguir se autopromover a master escrevendo direto na tabela (role/email inclusos).
--
-- Fase 1 introduziu nome/cargo como autoatendimento comum (qualquer usuário logado edita o próprio,
-- sem aprovação — necessário pra assinatura digital), mas isso não tinha política nenhuma que
-- permitisse. Corrige com uma política estreita: cada usuário só pode alterar a PRÓPRIA linha
-- (auth.uid() = id), e o grant de update é só nas colunas nome/cargo — nunca role/email — então
-- mesmo um update forjado direto na tabela não alcança o campo de permissão.
create policy "usuario_atualiza_proprio_nome_cargo" on public.perfis
  for update using (auth.uid() = id) with check (auth.uid() = id);

grant update (nome, cargo) on public.perfis to authenticated;
