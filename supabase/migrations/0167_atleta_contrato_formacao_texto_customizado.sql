-- Texto personalizado do Contrato de Formação, por atleta — ver docs/superpowers/specs/
-- 2026-11-16-contrato-formacao-texto-personalizado-design.md. Duas colunas nuláveis: quando
-- preenchidas, substituem o corpo das cláusulas gerado a partir do template SÓ para aquele
-- contrato (null usa o texto padrão, comportamento de hoje, pra todo mundo). A assinatura (data,
-- JUVENTUS SAF, ATLETA, testemunhas) nunca faz parte deste texto, continua sempre automática em
-- qualquer um dos dois casos.
alter table atleta_contratos
  add column texto_contrato_custom text,
  add column texto_clausulas_adicionais_custom text;

comment on column atleta_contratos.texto_contrato_custom is
  'Texto livre que substitui o corpo do Contrato de Formação principal gerado pelo template, só para este contrato. Null usa o texto padrão. Nunca inclui a assinatura (sempre automática).';
comment on column atleta_contratos.texto_clausulas_adicionais_custom is
  'Mesma ideia de texto_contrato_custom, para o corpo das Cláusulas Adicionais.';
