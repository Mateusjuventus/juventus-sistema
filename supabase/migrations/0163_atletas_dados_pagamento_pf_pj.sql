-- Dados de Pagamento do atleta: PF e PJ passam a ser duas seções independentes (podem estar as
-- duas marcadas ao mesmo tempo), em vez do antigo `tipo_pagamento` ("pf" OU "pj" — ver 0160).
-- Pedido do Mateus em 14/11/2026 (ver docs/superpowers/specs/2026-11-04-atletas-desativacao-
-- transicao-pagamento-design.md): PF precisa de Chave PIX + dados bancários completos
-- (banco/agência/conta); PJ ganha uma Chave PIX da empresa além do Nome/CNPJ que já existiam.

alter table public.atletas
  add column recebe_como_pf boolean not null default false,
  add column pf_chave_pix_tipo text,
  add column pf_chave_pix text,
  add column pf_banco text,
  add column pf_agencia text,
  add column pf_conta text,
  add column recebe_como_pj boolean not null default false,
  add column empresa_imagem_chave_pix_tipo text,
  add column empresa_imagem_chave_pix text;

-- Backfill: preserva o que já estava cadastrado com o modelo antigo (um ou outro).
update public.atletas set recebe_como_pf = true where tipo_pagamento = 'pf';
update public.atletas set recebe_como_pj = true where tipo_pagamento = 'pj';

alter table public.atletas drop column tipo_pagamento;

notify pgrst, 'reload schema';
