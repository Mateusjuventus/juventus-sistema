-- Extrai o CEP de dentro do texto livre antigo (atletas.endereco_atual) e preenche o novo campo
-- estruturado "cep", pros atletas do Profissional que já tinham endereço digitado antes de
-- 0099_atleta_endereco_estruturado.sql existir (pergunta do Mateus: "os endereços que estavam no
-- profissional, não tinham como migrar isso pegando o cep e jogando ali?").
--
-- Só o CEP: o restante (rua/número/complemento/bairro/cidade/UF) não tem formato fixo dentro de um
-- texto livre pra separar com segurança (varia registro a registro — "Rua Tal, 123, Bairro" vs
-- "Rua Tal 123 - Bairro, Cidade/UF" etc.), então não dá pra extrair sem risco de embaralhar os
-- campos. Com o CEP preenchido, porém, abrir o cadastro do atleta pra editar já busca sozinho o
-- resto no ViaCEP (rua/bairro/cidade/UF — ver `EnderecoFields`, que agora dispara essa busca ao
-- montar o formulário quando só o CEP já vem preenchido) — só falta o número e complemento, que
-- ficam pra conferir/completar manualmente registro por registro.
--
-- Idempotente: só mexe em quem ainda não tem "cep" preenchido e tem um padrão de CEP (5 dígitos,
-- hífen opcional, 3 dígitos) em algum lugar do texto livre. Rodar depois de 0099.
update public.atletas
set cep = regexp_replace(substring(endereco_atual from '\d{5}-?\s?\d{3}'), '\D', '', 'g')
where cep is null
  and endereco_atual is not null
  and endereco_atual ~ '\d{5}-?\s?\d{3}';

-- Rode esta consulta depois pra ver quantos atletas ficaram sem CEP (endereço livre preenchido, mas
-- sem nenhum padrão de CEP reconhecível dentro do texto) — esses precisam ser conferidos e
-- completados manualmente no cadastro:
-- select id, nome_completo, endereco_atual from public.atletas
-- where endereco_atual is not null and cep is null;
