-- Setor da Comissão Técnica/Diretoria vira texto livre — pedido do Mateus em 14/11/2026 (mesmo dia
-- do Dashboard): "preciso poder criar Departamentos se eu precisar... na própria lista, colocar
-- Criar Novo setor". Em vez de uma tela de administração separada, o campo (agora um
-- `SuggestionField` em `app/comissao-tecnica/comissao-form.tsx`, não mais um `<select>` fechado)
-- aceita qualquer texto digitado. Os 5 valores fixos de antes (0164) continuam os mesmos slugs
-- ("departamento_medico" etc.) pra quem já tinha um deles — a normalização em
-- `lib/validation/schemas.ts` (`normalizarSetorComissaoTecnica`) garante isso na gravação.

alter table public.comissao_tecnica drop constraint if exists comissao_tecnica_setor_check;

notify pgrst, 'reload schema';
