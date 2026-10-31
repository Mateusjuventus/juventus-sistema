-- Ajuste pontual pra 6 dos 23 atletas que a verificação do 0158 não encontrou por
-- nome+categoria exatos. Investigado com o Mateus: são a mesma pessoa, só com nome
-- levemente diferente no cadastro (apelido/acento/erro de digitação) ou numa categoria
-- diferente da que a planilha dizia (Fernando Kioshi está como sub14 no sistema, não
-- sub15/sub17 como a família respondeu — usamos aqui a categoria real do cadastro).
-- Atualiza direto pelo id (já confirmado manualmente), não por nome.
--
-- Os outros 17 nomes que não bateram parecem ser atletas sem cadastro no sistema ainda
-- (nenhuma correspondência, nem parecida, foi encontrada) — ver lista no chat.

begin;

-- Felipe Gabriel Cerdeira Silva (planilha) = id 64d6b47f-2ad4-4439-8f80-0094e5e3ce58
update public.atletas set
  email = coalesce(email, 'cerdeirafelipe1@gmail.com'),
  apelido = coalesce(apelido, 'Cerdeira'),
  cidade_natal = coalesce(cidade_natal, 'São Paulo'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Nathalia Nascimento Cerdeira'),
  mae_telefone = coalesce(mae_telefone, '+55 11 99025-3102'),
  pai_nome = coalesce(pai_nome, 'Rafael Azarias'),
  pai_telefone = coalesce(pai_telefone, '+55 11 99351-8901'),
  logradouro = coalesce(logradouro, 'Rua yvorne 41'),
  bairro = coalesce(bairro, 'Lausanne'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '02442-010'),
  agencia = coalesce(agencia, 'P&P Sport management'),
  empresario_nome = coalesce(empresario_nome, 'Marlon'),
  empresario_telefone = coalesce(empresario_telefone, '11 91118-1635'),
  escola = coalesce(escola, 'Escola Estadual Padre Antônio Vieira'),
  data_inicio_clube = coalesce(data_inicio_clube, '2024-10-21'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where id = '64d6b47f-2ad4-4439-8f80-0094e5e3ce58';

-- Fernando Kioshi Villegas Kuroda (planilha) = id 3731170d-8afb-4561-a0bb-bd78257fa12b
update public.atletas set
  email = coalesce(email, 'fernandokuroda8@gmail.com'),
  apelido = coalesce(apelido, 'Fernando'),
  cidade_natal = coalesce(cidade_natal, 'São Paulo'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Suellen Caroline Villegas Montero Kuroda'),
  mae_telefone = coalesce(mae_telefone, '11 939078129'),
  pai_nome = coalesce(pai_nome, 'Leonardo kenji faria kuroda'),
  pai_telefone = coalesce(pai_telefone, '11 963063163'),
  logradouro = coalesce(logradouro, 'Rua Leila 87'),
  bairro = coalesce(bairro, 'Jardim Liderança'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '08230-020'),
  escola = coalesce(escola, 'EE Carlos Gomes'),
  data_inicio_clube = coalesce(data_inicio_clube, '2026-02-02'::date),
  alojado = false,
  possui_alergia_medicamento = true,
  alergia_medicamento_qual = 'Sim dipirona'
where id = '3731170d-8afb-4561-a0bb-bd78257fa12b';

-- Hugo Valdez (planilha) = id ffd2d6be-18dd-4c24-b15d-2b0bd03d0937
update public.atletas set
  email = coalesce(email, 'hugovaldezdejesus@gmail.com'),
  apelido = coalesce(apelido, 'Valdez'),
  cidade_natal = coalesce(cidade_natal, 'Guarulhos'),
  mae_nome = coalesce(mae_nome, 'Eliete Santos de jesus guanez'),
  mae_telefone = coalesce(mae_telefone, '11960537157'),
  pai_nome = coalesce(pai_nome, 'Hector Manoel gonzalez guanez'),
  pai_telefone = coalesce(pai_telefone, '11 996537755'),
  logradouro = coalesce(logradouro, 'rua Fernando namora 250 A'),
  bairro = coalesce(bairro, 'Parque Piratininga'),
  cidade = coalesce(cidade, 'Itaquaquecetuba'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '08583-410'),
  escola = coalesce(escola, 'Vila ursulina Itaquaquecetuba'),
  data_inicio_clube = coalesce(data_inicio_clube, '2026-03-02'::date),
  alojado = false,
  possui_alergia_medicamento = true,
  alergia_medicamento_qual = 'Injeção dipirona'
where id = 'ffd2d6be-18dd-4c24-b15d-2b0bd03d0937';

-- Lucas Procópio Sampaio (planilha) = id 61f0b52c-e149-48b9-866b-abeec471f8a4
update public.atletas set
  email = coalesce(email, 'procopiosampaio11@gmail.com'),
  apelido = coalesce(apelido, 'Luquinhas/ Sampaio'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Deuvani Procópio Sampaio'),
  mae_telefone = coalesce(mae_telefone, '11971639888'),
  pai_nome = coalesce(pai_nome, 'José Fernando Sampaio'),
  pai_telefone = coalesce(pai_telefone, '11 97051-9485'),
  logradouro = coalesce(logradouro, 'Rua José Borges do canto, número 350, jardim Camargo Velho, Itaim Paulista São paulo'),
  bairro = coalesce(bairro, 'Jardim Camargo Velho'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '08142-010'),
  escola = coalesce(escola, 'E.E.E charles de gaule'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-05-10'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where id = '61f0b52c-e149-48b9-866b-abeec471f8a4';

-- Miguel Gonzales João (planilha) = id 8f9d2dcf-d26d-4bd1-b807-14a3bd390ae9
update public.atletas set
  email = coalesce(email, 'miguelgonzalezjoao@gmail.com'),
  apelido = coalesce(apelido, 'Miguel'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Miriam Martins gonzalez João'),
  mae_telefone = coalesce(mae_telefone, '11996615991'),
  pai_nome = coalesce(pai_nome, 'Marcio Roberto João'),
  pai_telefone = coalesce(pai_telefone, '11952674999'),
  logradouro = coalesce(logradouro, 'Rua dos Guarás, 160'),
  bairro = coalesce(bairro, 'Parque dos pássaros'),
  cidade = coalesce(cidade, 'São Bernardo do Campo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '09861-340'),
  escola = coalesce(escola, 'Colégio Abaco Sao Bernardo'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-01-12'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where id = '8f9d2dcf-d26d-4bd1-b807-14a3bd390ae9';

-- Ronaldo ferreira (planilha) = id ba86ddad-f893-4e6a-baa2-83b340d540ba
update public.atletas set
  email = coalesce(email, 'rf2042056@gmail.com'),
  apelido = coalesce(apelido, 'Ronaldo'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Ronaldo Ferreira'),
  mae_telefone = coalesce(mae_telefone, '11962229929'),
  pai_nome = coalesce(pai_nome, 'Silvano de Sousa'),
  pai_telefone = coalesce(pai_telefone, '11957170518'),
  logradouro = coalesce(logradouro, 'Rua comandante Taylor'),
  bairro = coalesce(bairro, 'Heliópolis'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '04218-000'),
  escola = coalesce(escola, 'Alexandre de Gusmão'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-07-15'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where id = 'ba86ddad-f893-4e6a-baa2-83b340d540ba';

commit;