-- Dados bancários (Banco/Agência/Conta/Tipo de Conta/Titular), pra usar junto com (ou no lugar de)
-- a Chave PIX em Pagamento e Reembolso.
alter table public.solicitacoes add column banco text;
alter table public.solicitacoes add column agencia text;
alter table public.solicitacoes add column conta text;
alter table public.solicitacoes add column tipo_conta text check (tipo_conta in ('corrente', 'poupanca'));
alter table public.solicitacoes add column titular_conta text;
