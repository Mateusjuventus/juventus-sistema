-- Extrai o número do endereço de dentro do texto livre antigo (atletas.endereco_atual), pro mesmo
-- pequeno grupo de atletas do Profissional coberto por 0100_atleta_cep_do_endereco_legado.sql —
-- pergunta do Mateus: "o numero acha que da pra pegar?". Diferente do CEP (formato fixo, sempre
-- seguro extrair), o número não tem um formato único em texto livre — só fazemos isso aqui porque,
-- conferido nos dados reais (consulta rodada no SQL Editor em 2026-09-10), os únicos registros que
-- sobraram seguem todos o mesmo formato "Rua Tal, 123 - Apto ... - Bairro - CEP: ... - Cidade": o
-- número vem logo depois da primeira vírgula, seguido de espaço/traço. Não é um método genérico —
-- só seguro porque os casos restantes foram conferidos um a um antes de rodar.
--
-- Idempotente: só mexe em quem ainda não tem "numero" preenchido e casa com esse formato
-- específico. Rodar depois de 0100.
update public.atletas
set numero = (regexp_match(endereco_atual, ',\s*(\d+)\s*[,\-]'))[1]
where numero is null
  and endereco_atual is not null
  and endereco_atual ~ ',\s*\d+\s*[,\-]';

-- Confira o resultado comparando com o texto original:
-- select id, nome_completo, endereco_atual, cep, numero from public.atletas
-- where endereco_atual is not null;
