-- Ajuste pontual #2 (depois do 0159): mais 6 dos 17 que o 0158 não tinha encontrado.
-- O Mateus confirmou que já têm cadastro — nomes com apelido/forma reduzida, acento
-- diferente ou pequeno erro de digitação. Atualiza direto pelo id (confirmado manualmente).

begin;

-- ivi bacci junior (planilha) = id 984e8410-f9e4-41f8-93b3-41471e1922b2
update public.atletas set
  email = coalesce(email, 'ivijrbacci@gmail.com'),
  apelido = coalesce(apelido, 'bacci'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'veridiana santana bacci'),
  mae_telefone = coalesce(mae_telefone, '11940252456'),
  pai_nome = coalesce(pai_nome, 'ivi bacci'),
  pai_telefone = coalesce(pai_telefone, '11947481392'),
  logradouro = coalesce(logradouro, 'rua braço da cruz'),
  bairro = coalesce(bairro, 'cidade patriarca'),
  cidade = coalesce(cidade, 'são paulo'),
  uf = coalesce(uf, 'SP'),
  agencia = coalesce(agencia, 'artsports management'),
  empresario_nome = coalesce(empresario_nome, 'bruno serafim'),
  empresario_telefone = coalesce(empresario_telefone, '11 99633-6419'),
  escola = coalesce(escola, 'colégio ied'),
  data_inicio_clube = coalesce(data_inicio_clube, '2023-02-25'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where id = '984e8410-f9e4-41f8-93b3-41471e1922b2';

-- João Lucas Baldança (planilha) = id 3e1b7a52-87fb-4ae0-942c-1a9f3cec7a9c
update public.atletas set
  email = coalesce(email, 'baldancajoaolucas@gmail.com'),
  apelido = coalesce(apelido, 'João'),
  cidade_natal = coalesce(cidade_natal, 'Florianópolis'),
  uf_natal = coalesce(uf_natal, 'SC'),
  mae_nome = coalesce(mae_nome, 'Cibely Silva Baldança'),
  mae_telefone = coalesce(mae_telefone, '48 9 91328079'),
  pai_nome = coalesce(pai_nome, 'Cristiano José Baldança'),
  pai_telefone = coalesce(pai_telefone, '48 9 88669594'),
  logradouro = coalesce(logradouro, 'R. dos Capitães Mores, 93'),
  bairro = coalesce(bairro, 'Mooca'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '03167-030'),
  escola = coalesce(escola, 'Colegio graduado'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-04-08'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where id = '3e1b7a52-87fb-4ae0-942c-1a9f3cec7a9c';

-- Leonardo Tardin da Costa (planilha) = id 630db965-d830-4434-8203-04a3bfbc45ef
update public.atletas set
  email = coalesce(email, 'tardinleonardo19@gmail.com'),
  apelido = coalesce(apelido, 'Tardin'),
  cidade_natal = coalesce(cidade_natal, 'Barueri'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Luana Tardin da Costa'),
  mae_telefone = coalesce(mae_telefone, '11 98026-1003'),
  pai_nome = coalesce(pai_nome, 'Diego Rodrigues Chaves da Costa'),
  pai_telefone = coalesce(pai_telefone, '11 96709-5154'),
  logradouro = coalesce(logradouro, 'Rua floriza klen Vasconcelos dos Santos'),
  bairro = coalesce(bairro, 'Bela vista'),
  cidade = coalesce(cidade, 'Osasco'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '06070-280'),
  escola = coalesce(escola, 'Etec celcio gilio'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-04-07'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where id = '630db965-d830-4434-8203-04a3bfbc45ef';

-- Márcio Victor Duarte Rodrigues (planilha) = id 6dcf2ac0-4cad-44e9-ab27-4c2ba1073586
update public.atletas set
  email = coalesce(email, 'marciovitorduarte@gmail.com'),
  apelido = coalesce(apelido, 'Marcio'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Thays emanuelly Ferreira Duarte'),
  mae_telefone = coalesce(mae_telefone, '11 97045-7801'),
  pai_nome = coalesce(pai_nome, 'Marcelo Rodrigues Bahia'),
  pai_telefone = coalesce(pai_telefone, '11 99629-2212'),
  logradouro = coalesce(logradouro, '106'),
  bairro = coalesce(bairro, 'Jardim Helena'),
  cidade = coalesce(cidade, 'Brasil'),
  cep = coalesce(cep, '08090-284'),
  agencia = coalesce(agencia, 'Não tenho agência no momento'),
  escola = coalesce(escola, 'Estela Borges Morato'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-02-03'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where id = '6dcf2ac0-4cad-44e9-ab27-4c2ba1073586';

-- Pedro Manoel Gomes Scanhoela (planilha) = id c6776ad4-97c6-4f8b-8b59-f8f95e5e25da
update public.atletas set
  email = coalesce(email, 'monicagomesscanhodla@gmail.com'),
  apelido = coalesce(apelido, 'Siborg'),
  cidade_natal = coalesce(cidade_natal, 'São Paulo'),
  mae_nome = coalesce(mae_nome, 'Monica Regina Gomes'),
  mae_telefone = coalesce(mae_telefone, '11 97253-7912'),
  pai_nome = coalesce(pai_nome, 'Nao tem'),
  pai_telefone = coalesce(pai_telefone, '00'),
  logradouro = coalesce(logradouro, 'Av. Guarulhos 2845 torre 8 apartamento 172'),
  bairro = coalesce(bairro, 'Ponte grande'),
  cidade = coalesce(cidade, 'Guarulhos'),
  cep = coalesce(cep, '07031-000'),
  agencia = coalesce(agencia, 'MID ESPORTE'),
  empresario_nome = coalesce(empresario_nome, 'Sergio'),
  empresario_telefone = coalesce(empresario_telefone, '+55 11 94018-4859'),
  escola = coalesce(escola, 'Colégio El Shaday'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-10-01'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where id = 'c6776ad4-97c6-4f8b-8b59-f8f95e5e25da';

-- Tarso Pereira Gonçalves (planilha) = id c04cdc72-8683-4a5a-b601-cb2b2ab12759
update public.atletas set
  email = coalesce(email, 'tarso.pereira10@gmail.com'),
  apelido = coalesce(apelido, 'Tarso'),
  cidade_natal = coalesce(cidade_natal, 'Rio de Janeiro'),
  uf_natal = coalesce(uf_natal, 'RJ'),
  mae_nome = coalesce(mae_nome, 'Renata de Paula Pereira Gonçalves'),
  mae_telefone = coalesce(mae_telefone, '21988134845'),
  pai_nome = coalesce(pai_nome, 'Alexandre Gomes Gonçalves'),
  pai_telefone = coalesce(pai_telefone, '21998893756'),
  logradouro = coalesce(logradouro, 'Av Prefeito Dulcidio Cardoso, 1000 bl1/502'),
  bairro = coalesce(bairro, 'Barra da Tijuca'),
  cidade = coalesce(cidade, 'Rio de Janeiro'),
  uf = coalesce(uf, 'RJ'),
  cep = coalesce(cep, '22620-311'),
  agencia = coalesce(agencia, 'P&P Sport Management'),
  empresario_nome = coalesce(empresario_nome, 'Melqui Marques'),
  empresario_telefone = coalesce(empresario_telefone, '+55 11 98208-8763'),
  escola = coalesce(escola, 'Colégio Ensino.com - Ensino Instituto Educacional Ltda.'),
  data_inicio_clube = coalesce(data_inicio_clube, '2026-02-27'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where id = 'c04cdc72-8683-4a5a-b601-cb2b2ab12759';

commit;