-- Preenchimento de dados pessoais/contato dos atletas Sub15 e Sub17, a partir das
-- planilhas SUB_15.xlsx e SUB_17.xlsx (formulario de cadastro preenchido pelas familias).
--
-- Criterio usado: a categoria (sub15/sub17) de cada atleta vem do SUB_17.xlsx, que se mostrou
-- mais atualizado (SUB_15.xlsx tinha uma categoria combinada 'Sub 17/16' que na pratica eh
-- Sub 17). Dados extras que só existem no SUB_15.xlsx (ex: CIDADE do endereco) foram
-- somados quando a pessoa tambem aparece la. Quando a mesma pessoa respondeu o formulario
-- mais de uma vez, foi usada a resposta mais recente.
--
-- So atualiza o que estiver vazio hoje no cadastro (coalesce) para a maioria dos campos,
-- nunca sobrescrevendo um valor ja preenchido. Excecoes: 'alojado' e os dois campos de
-- alergia, que sao definidos diretamente pela resposta da planilha (fatos simples,
-- confirmado com o Mateus).
--
-- NAO altera: rg, cpf, data_nascimento, posicao (campos de identidade/esportivos ja
-- cadastrados, para nao arriscar substituir um valor correto por uma resposta com erro de
-- digitacao da familia).
--
-- Campos da planilha sem coluna correspondente hoje (orgao emissor do RG, dados de
-- passaporte, resposta livre de 'possui contrato? qual?') foram ignorados nesta rodada,
-- a pedido do Mateus.

begin;

-- Arthur Ribeiro Borges (sub17)
update public.atletas set
  email = coalesce(email, 'arthurzin3455@gmail.com'),
  apelido = coalesce(apelido, 'borges'),
  cidade_natal = coalesce(cidade_natal, 'Aparecida de Goiânia'),
  uf_natal = coalesce(uf_natal, 'GO'),
  mae_nome = coalesce(mae_nome, 'Cinthia Cristina Silva Borges'),
  mae_telefone = coalesce(mae_telefone, '62 992664279'),
  pai_nome = coalesce(pai_nome, 'Deusdete Ribeiro da Silva'),
  pai_telefone = coalesce(pai_telefone, '62 991400910'),
  logradouro = coalesce(logradouro, 'Edifício de Ipanema, antunes maciel, 170'),
  bairro = coalesce(bairro, 'alto da mocca'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '03182-010'),
  agencia = coalesce(agencia, 'alltecsports'),
  empresario_nome = coalesce(empresario_nome, 'Júnior e Anderson'),
  empresario_telefone = coalesce(empresario_telefone, '+55 11 97592-2595 e +55 11 97440-3005'),
  escola = coalesce(escola, 'Estou sem escola por enquanto'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-02-07'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Arthur Ribeiro Borges');

-- Caio dos Santos Alves (sub17)
update public.atletas set
  email = coalesce(email, 'ca9656511@gmail.com'),
  apelido = coalesce(apelido, 'Caio'),
  cidade_natal = coalesce(cidade_natal, 'São Paulo'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Andreia Gomes dos Santos Alves'),
  mae_telefone = coalesce(mae_telefone, '11980599751'),
  pai_nome = coalesce(pai_nome, 'Ricardo de Oliveira Alves'),
  pai_telefone = coalesce(pai_telefone, '11995405863'),
  logradouro = coalesce(logradouro, 'Rua Quararibeia 200'),
  bairro = coalesce(bairro, 'Vila Isa'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '04689-160'),
  agencia = coalesce(agencia, 'Fmilsports'),
  empresario_nome = coalesce(empresario_nome, 'Reinaldo Nascimento'),
  empresario_telefone = coalesce(empresario_telefone, '11960690435'),
  escola = coalesce(escola, 'Colégio Mário Marques de Oliveira'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-03-25'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Caio dos Santos Alves');

-- Carlos Eduardo Vianna Kida (sub15)
update public.atletas set
  email = coalesce(email, 'kidacadu@gmail.com'),
  apelido = coalesce(apelido, 'Kida/Cadu'),
  cidade_natal = coalesce(cidade_natal, 'São Paulo'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Alessandra Vianna Vilares Kida'),
  mae_telefone = coalesce(mae_telefone, '+55 11 95647-6856'),
  pai_nome = coalesce(pai_nome, 'Antonio Carlos Kida'),
  pai_telefone = coalesce(pai_telefone, '+55 11 97542-0572'),
  logradouro = coalesce(logradouro, 'Rua doutor Saboia de Medeiros número 282'),
  bairro = coalesce(bairro, 'Vila Mariana'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  agencia = coalesce(agencia, 'Meu pai'),
  empresario_nome = coalesce(empresario_nome, 'Meu pai'),
  empresario_telefone = coalesce(empresario_telefone, '+55 11 97542-0572'),
  escola = coalesce(escola, 'Fiap School'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-02-10'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Carlos Eduardo Vianna Kida');

-- Cauã Gabryel Aquilis Vítor (sub15)
update public.atletas set
  email = coalesce(email, 'cauagabraielaquilisvitor10@gmail.com'),
  apelido = coalesce(apelido, 'Aquilis'),
  cidade_natal = coalesce(cidade_natal, 'Varginha'),
  uf_natal = coalesce(uf_natal, 'MG'),
  mae_nome = coalesce(mae_nome, 'Flaviane Aquilis'),
  mae_telefone = coalesce(mae_telefone, '35988120752'),
  pai_nome = coalesce(pai_nome, 'Elton Vitor'),
  pai_telefone = coalesce(pai_telefone, '35988651858'),
  logradouro = coalesce(logradouro, 'Rua Guaíba 580A'),
  bairro = coalesce(bairro, 'Santana'),
  uf = coalesce(uf, 'MG'),
  cep = coalesce(cep, '37056-080'),
  escola = coalesce(escola, 'Não estudo'),
  data_inicio_clube = coalesce(data_inicio_clube, '2026-02-08'::date),
  alojado = true,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Cauã Gabryel Aquilis Vítor');

-- Dylan Mauricio (sub17)
update public.atletas set
  email = coalesce(email, 'dylangarcete509@gmail.com'),
  apelido = coalesce(apelido, 'Garcete Aquino'),
  cidade_natal = coalesce(cidade_natal, 'Assunção Paraguai'),
  mae_nome = coalesce(mae_nome, 'Karina Mabel Garcete Aquino'),
  mae_telefone = coalesce(mae_telefone, '11 94820 8654'),
  pai_nome = coalesce(pai_nome, 'Não é reconocido'),
  pai_telefone = coalesce(pai_telefone, 'Não'),
  logradouro = coalesce(logradouro, 'Rua açatunga 47'),
  bairro = coalesce(bairro, 'Vila Congonhas'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '04612-050'),
  agencia = coalesce(agencia, 'BSerafim Sports'),
  empresario_nome = coalesce(empresario_nome, 'Bruno Serrano Serafim'),
  empresario_telefone = coalesce(empresario_telefone, '11 99633 6419'),
  escola = coalesce(escola, 'Pedro Foncesca'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-04-10'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Dylan Mauricio');

-- Enzo Gabriel Dias de Souza (sub15)
update public.atletas set
  email = coalesce(email, 'souzadiasenzo11@gmail.com'),
  apelido = coalesce(apelido, 'Enzo'),
  cidade_natal = coalesce(cidade_natal, 'SÃO JOSÉ DO RIO PRETO'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Jeane Cristina Dias'),
  mae_telefone = coalesce(mae_telefone, '.'),
  pai_nome = coalesce(pai_nome, 'Renato Xavier De Souza'),
  pai_telefone = coalesce(pai_telefone, '+55 31 8218-2880'),
  logradouro = coalesce(logradouro, 'Rua Valparaiso 495'),
  bairro = coalesce(bairro, 'Jardim Roseiral'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '15070-150'),
  agencia = coalesce(agencia, 'Canutodc e sivieri sports'),
  empresario_nome = coalesce(empresario_nome, 'danilo canuto e thiago sivieri'),
  empresario_telefone = coalesce(empresario_telefone, '+55 14 98195-5178/ +55 17 98116-9975'),
  escola = coalesce(escola, 'Estou sem estudar'),
  data_inicio_clube = coalesce(data_inicio_clube, '2026-03-07'::date),
  alojado = true,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Enzo Gabriel Dias de Souza');

-- Felipe Gabriel Cerdeira Silva (sub17)
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
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Felipe Gabriel Cerdeira Silva');

-- Fernando Kioshi Villegas Kuroda (sub15)
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
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Fernando Kioshi Villegas Kuroda');

-- Fernando Ruggero Simões Jorge (sub17)
update public.atletas set
  email = coalesce(email, 'fernando.ruggero.simks.jorge@gmail.com'),
  apelido = coalesce(apelido, 'Fernando'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'marcela ruggero simões jorge'),
  mae_telefone = coalesce(mae_telefone, '11947294807'),
  pai_nome = coalesce(pai_nome, 'danilo simões jorge'),
  pai_telefone = coalesce(pai_telefone, '11947912296'),
  logradouro = coalesce(logradouro, 'rua cajuru 1183'),
  bairro = coalesce(bairro, 'belenzinho'),
  cidade = coalesce(cidade, 'são paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '03057-000'),
  agencia = coalesce(agencia, 'alltec sports'),
  empresario_nome = coalesce(empresario_nome, 'Anderson lima e luís gricheno júnior'),
  empresario_telefone = coalesce(empresario_telefone, '11975922595'),
  escola = coalesce(escola, 'colégio amorim'),
  data_inicio_clube = coalesce(data_inicio_clube, '2024-01-11'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Fernando Ruggero Simões Jorge');

-- Gabriel Azevedo Sousa (sub15)
update public.atletas set
  email = coalesce(email, 'amorindo88@gmail.com'),
  apelido = coalesce(apelido, 'Azevedo'),
  cidade_natal = coalesce(cidade_natal, 'Só'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Jusselma de Azevedo Alves'),
  mae_telefone = coalesce(mae_telefone, '55+ (11) 96689-8754'),
  pai_nome = coalesce(pai_nome, 'Mauricio Sousa Cruz'),
  pai_telefone = coalesce(pai_telefone, '55+ (11) 98932-6685'),
  logradouro = coalesce(logradouro, 'Rua aldemar n40'),
  bairro = coalesce(bairro, 'Vila formosa'),
  cidade = coalesce(cidade, 'Sp-São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '03379-070'),
  escola = coalesce(escola, 'Colégio Brasília'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-08-10'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Gabriel Azevedo Sousa');

-- Gabriel Henrique Venancio Meirelles de Souza (sub15)
update public.atletas set
  email = coalesce(email, 'gabrielhen1801@gmail.com'),
  apelido = coalesce(apelido, 'Tenente'),
  cidade_natal = coalesce(cidade_natal, 'BARRETOS'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Tatiane Venancio de Souza'),
  mae_telefone = coalesce(mae_telefone, '17991563012'),
  pai_nome = coalesce(pai_nome, 'Fabrício Meirelles de Souza'),
  pai_telefone = coalesce(pai_telefone, '17991562998'),
  logradouro = coalesce(logradouro, 'Rua Doutor Jorge Veiga, 301'),
  bairro = coalesce(bairro, 'Vila Carrão'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '03424-000'),
  agencia = coalesce(agencia, 'Não possuo empresa'),
  empresario_nome = coalesce(empresario_nome, 'Não possuo empresa'),
  empresario_telefone = coalesce(empresario_telefone, 'Não possuo empresa'),
  escola = coalesce(escola, 'Colégio Amorim'),
  data_inicio_clube = coalesce(data_inicio_clube, '2026-03-23'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Gabriel Henrique Venancio Meirelles de Souza');

-- Gabriel Mendes Lima (sub15)
update public.atletas set
  email = coalesce(email, 'biellima408@gmail.com'),
  apelido = coalesce(apelido, 'Biel'),
  cidade_natal = coalesce(cidade_natal, 'Aracaju'),
  uf_natal = coalesce(uf_natal, 'SE'),
  mae_nome = coalesce(mae_nome, 'Dayse Mendes Lima'),
  mae_telefone = coalesce(mae_telefone, '7999689331'),
  pai_nome = coalesce(pai_nome, 'Rogério Pereira Lima'),
  pai_telefone = coalesce(pai_telefone, '79999012069'),
  logradouro = coalesce(logradouro, 'Av.Leonor, 33'),
  bairro = coalesce(bairro, 'Vila Augusta'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '07025-200'),
  empresario_telefone = coalesce(empresario_telefone, '.'),
  escola = coalesce(escola, 'João XXIII - Drummond'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-01-10'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Gabriel Mendes Lima');

-- Giovanni Martinez Montanari (sub15)
update public.atletas set
  email = coalesce(email, 'enzoab.xerife@gmail.com'),
  apelido = coalesce(apelido, 'Montanari'),
  cidade_natal = coalesce(cidade_natal, 'Sp'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Andrea de Cássio Martinez Santos'),
  mae_telefone = coalesce(mae_telefone, '11 967033225'),
  pai_nome = coalesce(pai_nome, 'Ricardo Montanari'),
  pai_telefone = coalesce(pai_telefone, '11967033235'),
  logradouro = coalesce(logradouro, 'Rua oiti 200'),
  bairro = coalesce(bairro, 'Água rasa'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '03347-000'),
  agencia = coalesce(agencia, 'Mid Sport'),
  empresario_nome = coalesce(empresario_nome, 'Igor Popovich'),
  empresario_telefone = coalesce(empresario_telefone, '+1 (334) 669-5714'),
  escola = coalesce(escola, 'Colégio Amorim'),
  data_inicio_clube = coalesce(data_inicio_clube, '2026-03-20'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Giovanni Martinez Montanari');

-- Greco Gonçalves Monteiro Cavalcanti (sub15)
update public.atletas set
  email = coalesce(email, 'greco9042@gmail.com'),
  apelido = coalesce(apelido, 'Greco'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Daniela Falceta Gonçalves'),
  mae_telefone = coalesce(mae_telefone, '+55 1199906-0450'),
  pai_nome = coalesce(pai_nome, 'Rovilson Monteiro Cavalcanti'),
  pai_telefone = coalesce(pai_telefone, '+55 1199984-0609'),
  logradouro = coalesce(logradouro, 'Parque da Mooca,Rua tacomaré 250'),
  bairro = coalesce(bairro, 'Parque da Mooca'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '03127-040'),
  escola = coalesce(escola, 'Colégio Ranieri'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-03-07'::date),
  alojado = false,
  possui_alergia_medicamento = true,
  alergia_medicamento_qual = 'Nada, só camarão!'
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Greco Gonçalves Monteiro Cavalcanti');

-- Guilherme Ferreira Olinto (sub15)
update public.atletas set
  email = coalesce(email, 'guiolinto9@gmail.com'),
  apelido = coalesce(apelido, 'Gui Olinto'),
  cidade_natal = coalesce(cidade_natal, 'SP'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Marcia de Almeida Ferreira'),
  mae_telefone = coalesce(mae_telefone, '98404-1125'),
  pai_nome = coalesce(pai_nome, 'Cristian Gustavo Silva Olinto'),
  pai_telefone = coalesce(pai_telefone, '99972-6777'),
  logradouro = coalesce(logradouro, 'Rua Bonifácio Veronese, 169'),
  bairro = coalesce(bairro, 'JD Jaqueline'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '05529-060'),
  escola = coalesce(escola, 'Emef Marechal Deodoro da Fonseca'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-07-29'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Guilherme Ferreira Olinto');

-- Guilherme Paolini (sub17)
update public.atletas set
  email = coalesce(email, 'paoliniguilherme@gmail.com'),
  apelido = coalesce(apelido, 'Paolini'),
  cidade_natal = coalesce(cidade_natal, 'Guarulhos'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Vanessa Cristina Gonçalves Paolini'),
  mae_telefone = coalesce(mae_telefone, '11 976750771'),
  pai_nome = coalesce(pai_nome, 'Giovanni Paolini'),
  pai_telefone = coalesce(pai_telefone, '11991456403'),
  logradouro = coalesce(logradouro, 'Rua Quatorze 118, casa 83'),
  bairro = coalesce(bairro, 'Residencial Parque Cumbica'),
  cidade = coalesce(cidade, 'Guarulhos'),
  uf = coalesce(uf, 'SP'),
  empresario_nome = coalesce(empresario_nome, '.'),
  empresario_telefone = coalesce(empresario_telefone, '.'),
  escola = coalesce(escola, 'E.E Antônio Pratici Prefeito'),
  data_inicio_clube = coalesce(data_inicio_clube, '2026-03-18'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Guilherme Paolini');

-- Gustavo Aguilar Santos (sub17)
update public.atletas set
  email = coalesce(email, 'gustavoaguilarsantos1@gmail.com'),
  apelido = coalesce(apelido, 'Aguilar'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Aline Oliveira Santos'),
  mae_telefone = coalesce(mae_telefone, '+55 11 98899-1258'),
  pai_nome = coalesce(pai_nome, 'Rene Oliveira Santos'),
  pai_telefone = coalesce(pai_telefone, '+55 11 91352-1144'),
  logradouro = coalesce(logradouro, 'Avenida José André de Moraes 1295 torre 4 ap 183'),
  bairro = coalesce(bairro, 'Jardim Henriqueta'),
  cidade = coalesce(cidade, 'Taboão Da Serra'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '06755-260'),
  agencia = coalesce(agencia, 'rigthmovesports'),
  empresario_nome = coalesce(empresario_nome, 'Guilherme'),
  empresario_telefone = coalesce(empresario_telefone, '+55 11 98630-2739'),
  escola = coalesce(escola, 'Etec Taboão Da Serra'),
  data_inicio_clube = coalesce(data_inicio_clube, '2024-06-10'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Gustavo Aguilar Santos');

-- Gusttavo dos Santos Monteiro (sub17)
update public.atletas set
  email = coalesce(email, '2009gutto@gmail.com'),
  apelido = coalesce(apelido, 'Monteiro'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Márcia dos Santos Monteiro'),
  mae_telefone = coalesce(mae_telefone, '11975575016'),
  pai_nome = coalesce(pai_nome, 'Wilson Monteiro Nascimento'),
  pai_telefone = coalesce(pai_telefone, '11996061545'),
  logradouro = coalesce(logradouro, 'Rua Serra de Bragança 855'),
  bairro = coalesce(bairro, 'Vila Gomes cardim'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '03318-000'),
  empresario_nome = coalesce(empresario_nome, 'Nda'),
  empresario_telefone = coalesce(empresario_telefone, 'Nda'),
  escola = coalesce(escola, 'Colégio Amorim'),
  data_inicio_clube = coalesce(data_inicio_clube, '2026-03-16'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Gusttavo dos Santos Monteiro');

-- Hugo Valdez (sub15)
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
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Hugo Valdez');

-- Icaro Silveira de lucena (sub17)
update public.atletas set
  email = coalesce(email, 'icarolucena2010@gmail.com'),
  apelido = coalesce(apelido, 'Icaro'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Adriana Silveira de lucena'),
  mae_telefone = coalesce(mae_telefone, '11976103062'),
  pai_nome = coalesce(pai_nome, 'Cristiano Pereira de lucena'),
  pai_telefone = coalesce(pai_telefone, '11993113884'),
  logradouro = coalesce(logradouro, 'Rua doutor Campos mello 441'),
  bairro = coalesce(bairro, 'Jaraguá'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '02994-030'),
  escola = coalesce(escola, 'Escola Estadual Professor Leônidas Horta de Macedo'),
  data_inicio_clube = coalesce(data_inicio_clube, '2024-03-18'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Icaro Silveira de lucena');

-- Igor Marques Pereira (sub17)
update public.atletas set
  email = coalesce(email, 'igol2010pereira@gmail.com'),
  apelido = coalesce(apelido, 'Igor'),
  cidade_natal = coalesce(cidade_natal, 'São Paulo'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Priscila Elias Marques Motta Pereira'),
  mae_telefone = coalesce(mae_telefone, '11 988488477'),
  pai_nome = coalesce(pai_nome, 'Fabio Luis Motta Pereira'),
  pai_telefone = coalesce(pai_telefone, '11 985712807'),
  logradouro = coalesce(logradouro, 'Rua Fabia 123'),
  bairro = coalesce(bairro, 'Pompeia'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '05051-030'),
  escola = coalesce(escola, 'Etec - Professor Camargo Aranha'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-01-06'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Igor Marques Pereira');

-- ISAAC DUARTE MARINHO COSTA (sub17)
update public.atletas set
  email = coalesce(email, 'isaacduartemarinho2009@gmail.com'),
  apelido = coalesce(apelido, 'ISAAC'),
  cidade_natal = coalesce(cidade_natal, 'CARAPICUÍBA'),
  mae_nome = coalesce(mae_nome, 'RUDILMA MARINHO LIMA'),
  mae_telefone = coalesce(mae_telefone, '11953889453'),
  pai_nome = coalesce(pai_nome, 'LEANDRO DA SILVA COSTA'),
  pai_telefone = coalesce(pai_telefone, '11970545442'),
  logradouro = coalesce(logradouro, 'AVENIDA DOUTOR ORÊNCIO VIDIGAL 598'),
  bairro = coalesce(bairro, 'PENHA'),
  cidade = coalesce(cidade, 'SÃO PAULO'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '03640-010'),
  agencia = coalesce(agencia, 'não possuo'),
  empresario_nome = coalesce(empresario_nome, '.'),
  empresario_telefone = coalesce(empresario_telefone, '.'),
  escola = coalesce(escola, 'JÚLIO BOTELHO'),
  data_inicio_clube = coalesce(data_inicio_clube, '2026-03-16'::date),
  alojado = false,
  possui_alergia_medicamento = true,
  alergia_medicamento_qual = 'SIM , DIPIRONA AXITROMICINA'
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('ISAAC DUARTE MARINHO COSTA');

-- ivi bacci junior (sub15)
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
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('ivi bacci junior');

-- Jean Gabriel Miranda Loures (sub15)
update public.atletas set
  email = coalesce(email, 'mirandajean573@gmail.com'),
  apelido = coalesce(apelido, 'Jean'),
  cidade_natal = coalesce(cidade_natal, 'Taboão da Serra'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Carmem Silva Miranda Loures'),
  mae_telefone = coalesce(mae_telefone, '11 94981-6338'),
  pai_nome = coalesce(pai_nome, 'Jorge Rodrigo Chaves Loures'),
  pai_telefone = coalesce(pai_telefone, '11 91516-2273'),
  logradouro = coalesce(logradouro, 'Avenida senador teotônio vilela 4029'),
  bairro = coalesce(bairro, 'Grajaú'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '04833-001'),
  agencia = coalesce(agencia, 'Não tenho agência'),
  escola = coalesce(escola, 'Francisco Roswell freire'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-02-01'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Jean Gabriel Miranda Loures');

-- João Antônio Rufo Frazão (sub15)
update public.atletas set
  email = coalesce(email, 'jota.frazao.2011@gmail.com'),
  apelido = coalesce(apelido, 'Frazão'),
  cidade_natal = coalesce(cidade_natal, 'São Paulo'),
  mae_nome = coalesce(mae_nome, 'Elena P. Gonzalez'),
  mae_telefone = coalesce(mae_telefone, '11991603614'),
  pai_nome = coalesce(pai_nome, 'Antônio Carlos Cordeiro Frazão. (Falecido.)'),
  pai_telefone = coalesce(pai_telefone, 'Não aplicável.'),
  logradouro = coalesce(logradouro, 'Rua Doutor José Áureo Bustamante, 301.'),
  bairro = coalesce(bairro, 'Santo Amaro.'),
  cidade = coalesce(cidade, 'São Paulo.'),
  cep = coalesce(cep, '04710-090'),
  empresario_nome = coalesce(empresario_nome, 'Não aplicável.'),
  empresario_telefone = coalesce(empresario_telefone, 'Não aplicável.'),
  escola = coalesce(escola, 'Colégio Visconde de Porto Seguro.'),
  data_inicio_clube = coalesce(data_inicio_clube, '2024-10-01'::date),
  alojado = false,
  possui_alergia_medicamento = true,
  alergia_medicamento_qual = 'Até o momento desconheço qualquer tipo de alergia relacionada a medicamentos.'
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('João Antônio Rufo Frazão');

-- João Lucas Baldança (sub15)
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
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('João Lucas Baldança');

-- João Sanches Pagliuso (sub15)
update public.atletas set
  email = coalesce(email, 'ale@artesana.com.br'),
  apelido = coalesce(apelido, 'Johnny'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Marília Lofrano Sanches Pagliuso'),
  mae_telefone = coalesce(mae_telefone, '11968972435'),
  pai_nome = coalesce(pai_nome, 'Alexandre Prado Pagliuso'),
  pai_telefone = coalesce(pai_telefone, '1197207229'),
  logradouro = coalesce(logradouro, 'Rua Borges de Figueiredo 137'),
  bairro = coalesce(bairro, 'Mooca'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '03110-010'),
  escola = coalesce(escola, 'Colégio Marista Arquidiocesano'),
  data_inicio_clube = coalesce(data_inicio_clube, '2026-02-12'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('João Sanches Pagliuso');

-- Kaique William Silva Do Carmo (sub17)
update public.atletas set
  email = coalesce(email, 'wkaique170@gmail.com'),
  apelido = coalesce(apelido, 'Negão'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Maria Helena'),
  mae_telefone = coalesce(mae_telefone, '11 99410-4796'),
  pai_nome = coalesce(pai_nome, 'Itamar santos'),
  pai_telefone = coalesce(pai_telefone, '11 93207-4160'),
  logradouro = coalesce(logradouro, 'Rua Eduardo de martino'),
  bairro = coalesce(bairro, 'Vila flavia'),
  cidade = coalesce(cidade, 'São Mateus'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '03966-020'),
  agencia = coalesce(agencia, 'serafim sports asap agency'),
  empresario_nome = coalesce(empresario_nome, 'Junior'),
  empresario_telefone = coalesce(empresario_telefone, '11 93461-6730'),
  escola = coalesce(escola, 'E.E República da Nicarágua'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-09-14'::date),
  alojado = false,
  possui_alergia_medicamento = true,
  alergia_medicamento_qual = 'Sim'
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Kaique William Silva Do Carmo');

-- keirrison zidan do carmo medeiros silva (sub17)
update public.atletas set
  email = coalesce(email, 'keirrisonzidan@gmail.com'),
  apelido = coalesce(apelido, 'zidan'),
  cidade_natal = coalesce(cidade_natal, 'são paulo'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'ivana do carmo santos'),
  mae_telefone = coalesce(mae_telefone, '11987349015'),
  pai_nome = coalesce(pai_nome, 'ivan sérgio medeiros silva'),
  pai_telefone = coalesce(pai_telefone, 'não tenho'),
  logradouro = coalesce(logradouro, 'rua bernardo de chaves cabral 951'),
  bairro = coalesce(bairro, 'vila aimoré'),
  cidade = coalesce(cidade, 'são paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '08190-130'),
  agencia = coalesce(agencia, 'P&P e DJB2'),
  empresario_nome = coalesce(empresario_nome, 'rafael P&P e elizeu DJB2'),
  empresario_telefone = coalesce(empresario_telefone, 'rafael P&P : 1199973-5788 elizeu DJB2 : 1195101-4137'),
  escola = coalesce(escola, 'colégio amorim'),
  data_inicio_clube = coalesce(data_inicio_clube, '2026-02-03'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('keirrison zidan do carmo medeiros silva');

-- Leonardo Estevam do Carmo Abreu de carvalho (sub17)
update public.atletas set
  email = coalesce(email, 'elaineconsig26@gmail.com'),
  apelido = coalesce(apelido, 'Leo'),
  cidade_natal = coalesce(cidade_natal, 'São Bernardo do campo- sp'),
  mae_nome = coalesce(mae_nome, 'Elaine Estevam do Carmo Abreu de carvalho'),
  mae_telefone = coalesce(mae_telefone, '11958991345'),
  pai_nome = coalesce(pai_nome, 'Fábio Abreu Estevam Martins de Carvalho'),
  pai_telefone = coalesce(pai_telefone, '11948694680'),
  logradouro = coalesce(logradouro, 'Rua Brasílio machado 533'),
  bairro = coalesce(bairro, 'Centro'),
  cidade = coalesce(cidade, 'São Bernardo do campo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '09715-140'),
  escola = coalesce(escola, 'E E João Ramalho'),
  data_inicio_clube = coalesce(data_inicio_clube, '2024-02-01'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Leonardo Estevam do Carmo Abreu de carvalho');

-- Leonardo Tardin da Costa (sub15)
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
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Leonardo Tardin da Costa');

-- Lucas Procópio Sampaio (sub17)
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
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Lucas Procópio Sampaio');

-- Lucas Santos Souza Filho (sub15)
update public.atletas set
  email = coalesce(email, 'lucassantossouzafilho1@gmail.com'),
  apelido = coalesce(apelido, 'Lukinhas'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Michele Aparecida Laurindo dos Santos Souza'),
  mae_telefone = coalesce(mae_telefone, '971508559'),
  pai_nome = coalesce(pai_nome, 'Lucas Santos Souza'),
  pai_telefone = coalesce(pai_telefone, '910510719'),
  logradouro = coalesce(logradouro, 'Rua São José do limoeiro 289'),
  bairro = coalesce(bairro, 'Parque Guarani'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '08235-530'),
  escola = coalesce(escola, 'Milton Cruzeiro'),
  data_inicio_clube = coalesce(data_inicio_clube, '2024-10-21'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Lucas Santos Souza Filho');

-- Lucas Xavier Silva (sub15)
update public.atletas set
  email = coalesce(email, 'luquinhaxavisilva@gmail.com'),
  apelido = coalesce(apelido, 'Xavier'),
  cidade_natal = coalesce(cidade_natal, 'São Paulo'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Jamille Xavier dos Santos'),
  mae_telefone = coalesce(mae_telefone, '11953988249'),
  pai_nome = coalesce(pai_nome, 'Henrique de Souza Silva'),
  pai_telefone = coalesce(pai_telefone, '11940103878'),
  logradouro = coalesce(logradouro, 'Avenida Bartholomeu de Carlos, 747 - AP 81-A'),
  bairro = coalesce(bairro, 'Jardim flor da montanha'),
  cidade = coalesce(cidade, 'Guarulhos'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '07097-420'),
  agencia = coalesce(agencia, 'Não tenho agência'),
  empresario_nome = coalesce(empresario_nome, 'Não tenho agência'),
  empresario_telefone = coalesce(empresario_telefone, 'Não tenho agência'),
  escola = coalesce(escola, 'Sesi Guarulhos'),
  data_inicio_clube = coalesce(data_inicio_clube, '2026-02-02'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Lucas Xavier Silva');

-- Márcio Victor Duarte Rodrigues (sub17)
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
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Márcio Victor Duarte Rodrigues');

-- Marcos Wellington Andrade dos Santos (sub15)
update public.atletas set
  email = coalesce(email, 'marcoswellingtonandradedossant@gmail.com'),
  apelido = coalesce(apelido, 'Marcola'),
  cidade_natal = coalesce(cidade_natal, 'Sao palo'),
  mae_nome = coalesce(mae_nome, 'Pamela Araújo de Andrade'),
  mae_telefone = coalesce(mae_telefone, '11912328207'),
  pai_nome = coalesce(pai_nome, 'Wesley Correia do Santos'),
  pai_telefone = coalesce(pai_telefone, '11985633140'),
  logradouro = coalesce(logradouro, 'Rua Gil de siloe 19A'),
  bairro = coalesce(bairro, 'Vila Gilda'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '04953-050'),
  agencia = coalesce(agencia, 'Não tenho nenhuma'),
  escola = coalesce(escola, 'Edvaldo Dantas'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-03-03'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Marcos Wellington Andrade dos Santos');

-- Mario Sérgio lima de Carvalho (sub15)
update public.atletas set
  email = coalesce(email, 'm11.jogadormarinho@gmail.com'),
  apelido = coalesce(apelido, 'Manteiga'),
  cidade_natal = coalesce(cidade_natal, 'Taboão da Serra'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Caroline Cristina Lima de Carvalho'),
  mae_telefone = coalesce(mae_telefone, '11920072146'),
  pai_nome = coalesce(pai_nome, 'MARIO SERGIO LIMA DE CARVALHO'),
  pai_telefone = coalesce(pai_telefone, '11952212693'),
  logradouro = coalesce(logradouro, 'Rua Geraldo Juncal Júnior 144'),
  bairro = coalesce(bairro, 'Jardim São Luiz'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '06816-478'),
  escola = coalesce(escola, 'E.E dona Ana rosa de Araújo'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-08-22'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Mario Sérgio lima de Carvalho');

-- Matheus Pereira Lisboa (sub17)
update public.atletas set
  email = coalesce(email, 'fabianachristinalisboa@gmail.com'),
  apelido = coalesce(apelido, 'Lisboa'),
  cidade_natal = coalesce(cidade_natal, 'Brasília'),
  uf_natal = coalesce(uf_natal, 'DF'),
  mae_nome = coalesce(mae_nome, 'Fabiana Christina Araújo Pereira Lisboa'),
  mae_telefone = coalesce(mae_telefone, '61984213103'),
  pai_nome = coalesce(pai_nome, 'Edson Rodrigues Lisboa Júnior'),
  pai_telefone = coalesce(pai_telefone, '61981613231'),
  logradouro = coalesce(logradouro, 'Edifício Praia de Ipanema'),
  bairro = coalesce(bairro, 'Mooca'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '03182-010'),
  agencia = coalesce(agencia, 'Não sou agenciado'),
  empresario_nome = coalesce(empresario_nome, 'Não sou agenciado'),
  empresario_telefone = coalesce(empresario_telefone, 'Não sou agenciado'),
  escola = coalesce(escola, 'Colégio Amorim'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-05-21'::date),
  alojado = false,
  possui_alergia_medicamento = true,
  alergia_medicamento_qual = 'Não tenho nenhuma alergia'
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Matheus Pereira Lisboa');

-- Miguel Bitencourt Pereira (sub17)
update public.atletas set
  email = coalesce(email, 'mpereira3303@gmail.com'),
  apelido = coalesce(apelido, 'Bitencourt'),
  cidade_natal = coalesce(cidade_natal, 'SP'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Rosimeire da Silva Bitencourt'),
  mae_telefone = coalesce(mae_telefone, '11 998318679'),
  pai_nome = coalesce(pai_nome, 'Antônio César Pereira'),
  pai_telefone = coalesce(pai_telefone, '11 959412395'),
  logradouro = coalesce(logradouro, 'Rua Fortim Itapoã 188'),
  bairro = coalesce(bairro, 'Jardim Helena'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '08371-210'),
  agencia = coalesce(agencia, 'Alltec'),
  empresario_nome = coalesce(empresario_nome, 'Luis Gricheno Júnior'),
  empresario_telefone = coalesce(empresario_telefone, '+55 11 97440-3005'),
  escola = coalesce(escola, 'Colégio Santa Izildinha'),
  data_inicio_clube = coalesce(data_inicio_clube, '2023-03-10'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Miguel Bitencourt Pereira');

-- Miguel Gonzales João (sub17)
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
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Miguel Gonzales João');

-- Miguel Mello Borges (sub15)
update public.atletas set
  email = coalesce(email, 'mmb29092011@gmail.com'),
  apelido = coalesce(apelido, 'Goiás'),
  cidade_natal = coalesce(cidade_natal, 'Palmas To'),
  mae_nome = coalesce(mae_nome, 'Maria Tereza Borges de Oliveira Mello'),
  mae_telefone = coalesce(mae_telefone, '63 992219560'),
  pai_nome = coalesce(pai_nome, 'Rodrigo Silva Borges'),
  pai_telefone = coalesce(pai_telefone, '62 998300841'),
  logradouro = coalesce(logradouro, 'Avenida Lacerda Franco, 200 Ap.31 Grand Terrace Aclimação'),
  bairro = coalesce(bairro, 'Cambuci'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '01536-000'),
  escola = coalesce(escola, 'Notre Dame rainha dos apóstolo'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-08-04'::date),
  alojado = false,
  possui_alergia_medicamento = true,
  alergia_medicamento_qual = 'Amoxilina'
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Miguel Mello Borges');

-- Miguel rodrigues da silva (sub15)
update public.atletas set
  email = coalesce(email, 'miguel1503rodrigues@gmail.com'),
  apelido = coalesce(apelido, 'Miguel'),
  cidade_natal = coalesce(cidade_natal, 'Jacarei SP'),
  mae_nome = coalesce(mae_nome, 'Gleyce Rodrigues moura da silva'),
  mae_telefone = coalesce(mae_telefone, '55 11947620617'),
  pai_nome = coalesce(pai_nome, 'Richard Ferreira da Silva'),
  pai_telefone = coalesce(pai_telefone, '55 11946593063'),
  logradouro = coalesce(logradouro, 'Rua guariri 355'),
  bairro = coalesce(bairro, 'Vila São Carlos'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '08599-510'),
  escola = coalesce(escola, 'Dom Bosco'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-05-12'::date),
  alojado = false,
  possui_alergia_medicamento = true,
  alergia_medicamento_qual = 'Dipirona'
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Miguel rodrigues da silva');

-- Murilo Narcizo de arruda (sub15)
update public.atletas set
  email = coalesce(email, 'murilonarcizo159@gmail.com'),
  apelido = coalesce(apelido, 'Murilo'),
  cidade_natal = coalesce(cidade_natal, 'São Paulo'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Vânia Maria narcizo de arruda'),
  mae_telefone = coalesce(mae_telefone, '(11) 99799-7279'),
  pai_nome = coalesce(pai_nome, 'Josué viera de arruda'),
  pai_telefone = coalesce(pai_telefone, '(11) 99786-6602'),
  logradouro = coalesce(logradouro, 'Rua padre Agostinho Jorge 370'),
  bairro = coalesce(bairro, 'Vila Medeiros'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '02216-030'),
  agencia = coalesce(agencia, 'Altec sports'),
  empresario_nome = coalesce(empresario_nome, 'Anderson Lima'),
  empresario_telefone = coalesce(empresario_telefone, '(11) 97592-2595'),
  escola = coalesce(escola, 'Victor do Santos Cunha'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-03-10'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Murilo Narcizo de arruda');

-- Nathan Silva Gomes (sub15)
update public.atletas set
  email = coalesce(email, 'bruhmotta2707@gmail.com'),
  apelido = coalesce(apelido, 'Nathanzinho'),
  cidade_natal = coalesce(cidade_natal, 'São Bernardo'),
  mae_nome = coalesce(mae_nome, 'Bruna Silva mota'),
  mae_telefone = coalesce(mae_telefone, '11913234009'),
  pai_nome = coalesce(pai_nome, 'Welson oliveira gomes'),
  pai_telefone = coalesce(pai_telefone, '11949499466'),
  logradouro = coalesce(logradouro, 'RUA CARDEAL,'),
  bairro = coalesce(bairro, 'ALVARENGA'),
  cidade = coalesce(cidade, 'São'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '09856-120'),
  escola = coalesce(escola, 'Dr João Firmino'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-04-18'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Nathan Silva Gomes');

-- Nicolas De Souza Coimbra (sub17)
update public.atletas set
  email = coalesce(email, 'nickgol013@gmail.com'),
  apelido = coalesce(apelido, 'Coimbra'),
  cidade_natal = coalesce(cidade_natal, 'BEBEDOURO'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Gabriel De Souza Ferreira Coimbra'),
  mae_telefone = coalesce(mae_telefone, '17 98213-3121'),
  pai_nome = coalesce(pai_nome, 'Julio Cesar Da Cruz Coimbra'),
  pai_telefone = coalesce(pai_telefone, '17 99141-8133'),
  logradouro = coalesce(logradouro, 'Rua Cabo João Teruel Fregoni 124 complemento: Torre orion apto 174'),
  bairro = coalesce(bairro, 'Ponte Grande'),
  cidade = coalesce(cidade, 'Guarulhos, SP'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '07032-000'),
  agencia = coalesce(agencia, 'Por enquanto nenhuma'),
  empresario_nome = coalesce(empresario_nome, '.'),
  escola = coalesce(escola, 'Colégio Marconi'),
  data_inicio_clube = coalesce(data_inicio_clube, '2026-03-22'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Nicolas De Souza Coimbra');

-- otavio henrique ribeiro simionato (sub15)
update public.atletas set
  email = coalesce(email, 'otaviosimionato877@gmail.com'),
  apelido = coalesce(apelido, 'otavio'),
  cidade_natal = coalesce(cidade_natal, 'pontal'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'gabriela lemes ribeiro simionato'),
  mae_telefone = coalesce(mae_telefone, '16999636624'),
  pai_nome = coalesce(pai_nome, 'pedro junio aparecido simionato'),
  pai_telefone = coalesce(pai_telefone, '16996362733'),
  logradouro = coalesce(logradouro, 'rua etore convem 1397'),
  bairro = coalesce(bairro, 'pombal'),
  cidade = coalesce(cidade, 'pontal/ sp'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '14187-156'),
  agencia = coalesce(agencia, 'sem empresa'),
  escola = coalesce(escola, 'to sem escola'),
  data_inicio_clube = coalesce(data_inicio_clube, '2026-02-10'::date),
  alojado = true,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('otavio henrique ribeiro simionato');

-- Pedro Araújo Franco (sub17)
update public.atletas set
  email = coalesce(email, 'pedrombmf@gmail.com'),
  apelido = coalesce(apelido, 'Franco'),
  cidade_natal = coalesce(cidade_natal, 'Mogi das Cruzes'),
  mae_nome = coalesce(mae_nome, 'Fernanda Aparecida de Araújo'),
  mae_telefone = coalesce(mae_telefone, '941376008'),
  pai_nome = coalesce(pai_nome, 'Marcelo da Silva Franco'),
  pai_telefone = coalesce(pai_telefone, '000'),
  logradouro = coalesce(logradouro, 'Travessa Giusepe lilo'),
  bairro = coalesce(bairro, 'Vila ema'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '03283-005'),
  agencia = coalesce(agencia, '.'),
  empresario_nome = coalesce(empresario_nome, '.'),
  empresario_telefone = coalesce(empresario_telefone, '.'),
  escola = coalesce(escola, 'E.E Mário Marques de Oliveira'),
  data_inicio_clube = coalesce(data_inicio_clube, '2023-02-08'::date),
  alojado = true,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Pedro Araújo Franco');

-- Pedro Henrique Ferreira da Silva (sub17)
update public.atletas set
  email = coalesce(email, 'pedrinho.timao2010@gmail.com'),
  apelido = coalesce(apelido, 'Pedrinho'),
  cidade_natal = coalesce(cidade_natal, 'Sp'),
  mae_nome = coalesce(mae_nome, 'Maria Fátima Oliveira da silva'),
  mae_telefone = coalesce(mae_telefone, '11961254972'),
  pai_nome = coalesce(pai_nome, 'Emerson Souza'),
  pai_telefone = coalesce(pai_telefone, '+55 11 98660-1141'),
  logradouro = coalesce(logradouro, 'Rua padre Adelino 546'),
  bairro = coalesce(bairro, 'Belenzinho'),
  cidade = coalesce(cidade, 'São paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '03303-000'),
  escola = coalesce(escola, 'Colégio Amorim'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-01-11'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Pedro Henrique Ferreira da Silva');

-- Pedro Manoel Gomes Scanhoela (sub15)
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
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Pedro Manoel Gomes Scanhoela');

-- Rafael Cortes dos Santos (sub17)
update public.atletas set
  email = coalesce(email, 'rafaelcortes0044@gmail.com'),
  apelido = coalesce(apelido, 'Cortes'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Adriana Benites Cortes dos Santos'),
  mae_telefone = coalesce(mae_telefone, '11 968191228'),
  pai_nome = coalesce(pai_nome, 'Gilberto dos Santos Cortes'),
  pai_telefone = coalesce(pai_telefone, '11 982295743'),
  logradouro = coalesce(logradouro, 'Rua Luis de Oliveira Bulhões n 90'),
  bairro = coalesce(bairro, 'Vila Albertina'),
  cidade = coalesce(cidade, 'São paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '02358-030'),
  agencia = coalesce(agencia, 'p&p sport management'),
  empresario_nome = coalesce(empresario_nome, 'Cláudio Fiorito'),
  empresario_telefone = coalesce(empresario_telefone, '11 913496478'),
  escola = coalesce(escola, 'CEPAV'),
  data_inicio_clube = coalesce(data_inicio_clube, '2024-11-19'::date),
  alojado = false,
  possui_alergia_medicamento = true,
  alergia_medicamento_qual = 'amoxilina'
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Rafael Cortes dos Santos');

-- Rafael Mendes Costa (sub17)
update public.atletas set
  email = coalesce(email, 'rafamc469@gmail.com'),
  apelido = coalesce(apelido, 'Mendes'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Simone inglez mendes'),
  mae_telefone = coalesce(mae_telefone, '11 940286171'),
  pai_nome = coalesce(pai_nome, 'Fabio shimoda costa'),
  pai_telefone = coalesce(pai_telefone, '+55 11 98842-5156'),
  logradouro = coalesce(logradouro, 'Rua Valfrido Silva, 111'),
  bairro = coalesce(bairro, 'Jordanópolis'),
  cidade = coalesce(cidade, 'São Bernardo do Campo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '09892-390'),
  escola = coalesce(escola, 'Colégio CAMP'),
  data_inicio_clube = coalesce(data_inicio_clube, '2024-04-15'::date),
  alojado = false,
  possui_alergia_medicamento = true,
  alergia_medicamento_qual = 'Sim, cataflan e tenoxican'
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Rafael Mendes Costa');

-- Rafael Rabelo Do Nascimento (sub17)
update public.atletas set
  email = coalesce(email, 'rafaelrabelo520@gmail.com'),
  apelido = coalesce(apelido, 'Rafão'),
  cidade_natal = coalesce(cidade_natal, 'São Paulo'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Simone Souza Rabelo'),
  mae_telefone = coalesce(mae_telefone, '11981860392'),
  pai_nome = coalesce(pai_nome, 'Sidnei Pereira Do Nascimento'),
  pai_telefone = coalesce(pai_telefone, '11 98517-0165'),
  logradouro = coalesce(logradouro, 'Rua flores astrais, 126'),
  bairro = coalesce(bairro, 'Jardim São Carlos'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '08062-680'),
  agencia = coalesce(agencia, 'Nenhuma no momento'),
  empresario_nome = coalesce(empresario_nome, 'Não tenho nenhuma empresa no momento'),
  empresario_telefone = coalesce(empresario_telefone, 'Não tenho nenhuma empresa no momento'),
  escola = coalesce(escola, 'E. E. Nossa Senhora Da Penha'),
  data_inicio_clube = coalesce(data_inicio_clube, '2024-05-10'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Rafael Rabelo Do Nascimento');

-- Renan Morales de Almeida (sub15)
update public.atletas set
  email = coalesce(email, 'renanmorales226@gmail.com'),
  apelido = coalesce(apelido, 'Renan'),
  cidade_natal = coalesce(cidade_natal, 'Santo André'),
  mae_nome = coalesce(mae_nome, 'Fabiana Flávia Maceió'),
  mae_telefone = coalesce(mae_telefone, '11 980164570'),
  pai_nome = coalesce(pai_nome, 'Fabio Morales de Almeida'),
  pai_telefone = coalesce(pai_telefone, '11 80231078'),
  logradouro = coalesce(logradouro, 'Av Sara Zírlis, 176'),
  bairro = coalesce(bairro, 'Vila Lutécia'),
  cidade = coalesce(cidade, 'Santo André'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '09130-220'),
  escola = coalesce(escola, 'Sesi 221'),
  data_inicio_clube = coalesce(data_inicio_clube, '2026-02-22'::date),
  alojado = false,
  possui_alergia_medicamento = true,
  alergia_medicamento_qual = 'Iodo'
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Renan Morales de Almeida');

-- Ricardo Braga Botelho (sub15)
update public.atletas set
  email = coalesce(email, 'ricardinhobragabotelho@gmail.com'),
  apelido = coalesce(apelido, 'Ricardinho/Botelho'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Daiana Braga Botelho'),
  mae_telefone = coalesce(mae_telefone, '11 96096-8781'),
  pai_nome = coalesce(pai_nome, 'Ricardo Luis Botelho'),
  pai_telefone = coalesce(pai_telefone, '11 94742-4150'),
  logradouro = coalesce(logradouro, 'Rua São Brás, 90'),
  bairro = coalesce(bairro, 'Chácara Califórnia'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '03406-020'),
  empresario_nome = coalesce(empresario_nome, '.'),
  empresario_telefone = coalesce(empresario_telefone, '.'),
  escola = coalesce(escola, 'Colégio Amorim'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-08-01'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Ricardo Braga Botelho');

-- Rodrigo Gimenes da rocha (sub15)
update public.atletas set
  email = coalesce(email, 'ricardo.digo2011@gmail.com'),
  apelido = coalesce(apelido, 'Digo'),
  cidade_natal = coalesce(cidade_natal, 'SP'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Simone Gimenes Esteves'),
  mae_telefone = coalesce(mae_telefone, '11974647216'),
  pai_nome = coalesce(pai_nome, 'Ricardo Silva da rocha júnior'),
  pai_telefone = coalesce(pai_telefone, '11941293105'),
  logradouro = coalesce(logradouro, 'Rua Rene de Toledo 577'),
  bairro = coalesce(bairro, 'Cidade Tiradentes'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '08471-740'),
  escola = coalesce(escola, 'EMEF Maria Aparecida do Nascimento'),
  data_inicio_clube = coalesce(data_inicio_clube, '2026-02-02'::date),
  alojado = false,
  possui_alergia_medicamento = true,
  alergia_medicamento_qual = 'Cataflan'
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Rodrigo Gimenes da rocha');

-- Ronaldo ferreira (sub17)
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
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Ronaldo ferreira');

-- Tarso Pereira Gonçalves (sub17)
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
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Tarso Pereira Gonçalves');

-- Victor Gabriel Vieira Alves (sub17)
update public.atletas set
  email = coalesce(email, 'victorgabrielva010@gmail.com'),
  apelido = coalesce(apelido, 'Vitão'),
  cidade_natal = coalesce(cidade_natal, 'São Paulo'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Vanessa Correa Gabriel'),
  mae_telefone = coalesce(mae_telefone, '11994664911'),
  pai_nome = coalesce(pai_nome, 'Marcos Vieira Alves'),
  pai_telefone = coalesce(pai_telefone, '11993318650'),
  logradouro = coalesce(logradouro, 'Rua José de Oliveira 811'),
  bairro = coalesce(bairro, 'Casa Verde'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '02531-010'),
  escola = coalesce(escola, 'Escola Estadual Padre Antônio Vieira'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-02-02'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Victor Gabriel Vieira Alves');

-- Vitor Hugo Coca (sub17)
update public.atletas set
  email = coalesce(email, 'vitorhugococa8@gmail.com'),
  apelido = coalesce(apelido, 'Coca'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Daniela Pereira Coca'),
  mae_telefone = coalesce(mae_telefone, '+55 11 97553-0374'),
  pai_nome = coalesce(pai_nome, 'Clayton Pablo Coca'),
  pai_telefone = coalesce(pai_telefone, '+55 11 94240-5252'),
  logradouro = coalesce(logradouro, 'Av.Wallace Simonsen 555'),
  bairro = coalesce(bairro, 'Nova Petrópolis'),
  cidade = coalesce(cidade, 'São Bernardo do Campo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '09771-210'),
  agencia = coalesce(agencia, 'P&P Sport Management'),
  empresario_nome = coalesce(empresario_nome, 'Bruno Roxo'),
  empresario_telefone = coalesce(empresario_telefone, '+55 11 96910-4533'),
  escola = coalesce(escola, 'Colégio Anchieta'),
  data_inicio_clube = coalesce(data_inicio_clube, '2025-08-29'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub17'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Vitor Hugo Coca');

-- Yuri Abachioni Antoniazzi (sub15)
update public.atletas set
  email = coalesce(email, 'yuabachioniantoniazzi@gmail.com'),
  apelido = coalesce(apelido, 'yure'),
  cidade_natal = coalesce(cidade_natal, 'SP'),
  uf_natal = coalesce(uf_natal, 'SP'),
  mae_nome = coalesce(mae_nome, 'Danielli Abachioni Antoniazzi'),
  mae_telefone = coalesce(mae_telefone, '11 94729-0044'),
  pai_nome = coalesce(pai_nome, 'Thiago Antoniazzi'),
  pai_telefone = coalesce(pai_telefone, '11 94701-5990'),
  logradouro = coalesce(logradouro, 'Rua Rei Alberto da Bélgica 785A'),
  bairro = coalesce(bairro, 'Vila Formosa'),
  cidade = coalesce(cidade, 'São Paulo'),
  uf = coalesce(uf, 'SP'),
  cep = coalesce(cep, '03381-000'),
  agencia = coalesce(agencia, 'não tenho empresa'),
  empresario_nome = coalesce(empresario_nome, 'não tenho empresa'),
  empresario_telefone = coalesce(empresario_telefone, 'não tenho empresa'),
  escola = coalesce(escola, 'E.E. Wolny Carvalho Ramos'),
  data_inicio_clube = coalesce(data_inicio_clube, '2024-10-10'::date),
  alojado = false,
  possui_alergia_medicamento = false,
  alergia_medicamento_qual = NULL
where categoria = 'sub15'
  and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Yuri Abachioni Antoniazzi');

-- Verificacao: lista quem da planilha NAO foi encontrado no cadastro (0 linhas afetadas).
-- Isso pode ser nome com erro de digitacao, ou atleta que ainda nao tem cadastro no sistema.
do $$
declare
  v_nome text;
  v_categoria text;
  v_count int;
  v_nao_encontrados text := '';
begin
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Arthur Ribeiro Borges');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Arthur Ribeiro Borges (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Caio dos Santos Alves');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Caio dos Santos Alves (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Carlos Eduardo Vianna Kida');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Carlos Eduardo Vianna Kida (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Cauã Gabryel Aquilis Vítor');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Cauã Gabryel Aquilis Vítor (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Dylan Mauricio');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Dylan Mauricio (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Enzo Gabriel Dias de Souza');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Enzo Gabriel Dias de Souza (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Felipe Gabriel Cerdeira Silva');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Felipe Gabriel Cerdeira Silva (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Fernando Kioshi Villegas Kuroda');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Fernando Kioshi Villegas Kuroda (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Fernando Ruggero Simões Jorge');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Fernando Ruggero Simões Jorge (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Gabriel Azevedo Sousa');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Gabriel Azevedo Sousa (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Gabriel Henrique Venancio Meirelles de Souza');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Gabriel Henrique Venancio Meirelles de Souza (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Gabriel Mendes Lima');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Gabriel Mendes Lima (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Giovanni Martinez Montanari');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Giovanni Martinez Montanari (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Greco Gonçalves Monteiro Cavalcanti');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Greco Gonçalves Monteiro Cavalcanti (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Guilherme Ferreira Olinto');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Guilherme Ferreira Olinto (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Guilherme Paolini');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Guilherme Paolini (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Gustavo Aguilar Santos');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Gustavo Aguilar Santos (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Gusttavo dos Santos Monteiro');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Gusttavo dos Santos Monteiro (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Hugo Valdez');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Hugo Valdez (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Icaro Silveira de lucena');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Icaro Silveira de lucena (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Igor Marques Pereira');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Igor Marques Pereira (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('ISAAC DUARTE MARINHO COSTA');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - ISAAC DUARTE MARINHO COSTA (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('ivi bacci junior');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - ivi bacci junior (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Jean Gabriel Miranda Loures');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Jean Gabriel Miranda Loures (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('João Antônio Rufo Frazão');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - João Antônio Rufo Frazão (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('João Lucas Baldança');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - João Lucas Baldança (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('João Sanches Pagliuso');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - João Sanches Pagliuso (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Kaique William Silva Do Carmo');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Kaique William Silva Do Carmo (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('keirrison zidan do carmo medeiros silva');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - keirrison zidan do carmo medeiros silva (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Leonardo Estevam do Carmo Abreu de carvalho');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Leonardo Estevam do Carmo Abreu de carvalho (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Leonardo Tardin da Costa');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Leonardo Tardin da Costa (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Lucas Procópio Sampaio');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Lucas Procópio Sampaio (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Lucas Santos Souza Filho');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Lucas Santos Souza Filho (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Lucas Xavier Silva');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Lucas Xavier Silva (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Márcio Victor Duarte Rodrigues');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Márcio Victor Duarte Rodrigues (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Marcos Wellington Andrade dos Santos');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Marcos Wellington Andrade dos Santos (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Mario Sérgio lima de Carvalho');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Mario Sérgio lima de Carvalho (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Matheus Pereira Lisboa');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Matheus Pereira Lisboa (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Miguel Bitencourt Pereira');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Miguel Bitencourt Pereira (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Miguel Gonzales João');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Miguel Gonzales João (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Miguel Mello Borges');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Miguel Mello Borges (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Miguel rodrigues da silva');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Miguel rodrigues da silva (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Murilo Narcizo de arruda');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Murilo Narcizo de arruda (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Nathan Silva Gomes');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Nathan Silva Gomes (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Nicolas De Souza Coimbra');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Nicolas De Souza Coimbra (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('otavio henrique ribeiro simionato');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - otavio henrique ribeiro simionato (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Pedro Araújo Franco');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Pedro Araújo Franco (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Pedro Henrique Ferreira da Silva');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Pedro Henrique Ferreira da Silva (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Pedro Manoel Gomes Scanhoela');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Pedro Manoel Gomes Scanhoela (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Rafael Cortes dos Santos');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Rafael Cortes dos Santos (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Rafael Mendes Costa');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Rafael Mendes Costa (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Rafael Rabelo Do Nascimento');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Rafael Rabelo Do Nascimento (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Renan Morales de Almeida');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Renan Morales de Almeida (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Ricardo Braga Botelho');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Ricardo Braga Botelho (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Rodrigo Gimenes da rocha');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Rodrigo Gimenes da rocha (sub15)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Ronaldo ferreira');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Ronaldo ferreira (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Tarso Pereira Gonçalves');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Tarso Pereira Gonçalves (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Victor Gabriel Vieira Alves');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Victor Gabriel Vieira Alves (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub17' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Vitor Hugo Coca');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Vitor Hugo Coca (sub17)'; end if;
  select count(*) into v_count from public.atletas where categoria = 'sub15' and lower(regexp_replace(nome_completo, '\s+', ' ', 'g')) = lower('Yuri Abachioni Antoniazzi');
  if v_count = 0 then v_nao_encontrados := v_nao_encontrados || E'\n  - Yuri Abachioni Antoniazzi (sub15)'; end if;
  if v_nao_encontrados <> '' then
    raise notice 'Não encontrados no cadastro:%', v_nao_encontrados;
  else
    raise notice 'Todos os 60 atletas da planilha foram encontrados no cadastro.';
  end if;
end $$;

commit;