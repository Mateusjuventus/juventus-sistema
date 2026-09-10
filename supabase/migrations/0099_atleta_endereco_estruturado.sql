-- Atletas (Futebol Profissional): endereço estruturado (CEP/logradouro/número/complemento/bairro/
-- cidade/UF), mesmo padrão que atletas_base já tem desde 0076_captacao_alojamento_base.sql
-- (autopreenchido por CEP no formulário — ver EnderecoFields). "endereco_atual" (texto livre)
-- continua existindo só pra não sumir com dados de cadastros antigos; o formulário de editar passa
-- a gravar nos campos estruturados abaixo.
-- Aplicar via SQL editor do painel Supabase, depois de 0001 a 0098.

alter table public.atletas add column if not exists cep text;
alter table public.atletas add column if not exists logradouro text;
alter table public.atletas add column if not exists numero text;
alter table public.atletas add column if not exists complemento text;
alter table public.atletas add column if not exists bairro text;
alter table public.atletas add column if not exists cidade text;
alter table public.atletas add column if not exists uf text;
