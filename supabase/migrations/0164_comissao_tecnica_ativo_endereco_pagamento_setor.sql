-- Comissão Técnica/Diretoria — item 8 do pedido do Mateus em 14/11/2026:
-- 1) Ativar/desativar (sem motivo nem histórico — ele recusou explicitamente o padrão com motivo
--    que os atletas têm, ver `atletas_ativo_historico`/0160); 2) Endereço estruturado único
--    (Profissional e Base juntos, sem distinção origem/local); 3) Dados de empresa e pagamento
--    condicionados ao `tipo_contrato` que já existe (CLT pede PIX+dados bancários pro salário; PJ
--    pede Nome da Empresa/CNPJ/PIX da empresa — mesmo padrão de PF/PJ independentes do atleta,
--    0163, só que aqui é condicionado por um enum já existente em vez de dois checkboxes); 4) Setor
--    novo, pra sub-agrupar a listagem dentro dos blocos Profissional/Base que já existem.

alter table public.comissao_tecnica
  add column ativo boolean not null default true,
  add column cep text,
  add column logradouro text,
  add column numero text,
  add column complemento text,
  add column bairro text,
  add column cidade text,
  add column uf text,
  add column setor text check (
    setor is null or setor in (
      'departamento_medico', 'departamento_tecnico', 'administrativo', 'diretoria', 'operacional'
    )
  ),
  -- CLT: Chave PIX + dados bancários completos (pro salário).
  add column chave_pix_tipo text,
  add column chave_pix text,
  add column banco text,
  add column agencia text,
  add column conta text,
  -- PJ: Nome da Empresa/CNPJ + Chave PIX da empresa.
  add column empresa_nome text,
  add column empresa_cnpj text,
  add column empresa_chave_pix_tipo text,
  add column empresa_chave_pix text;

notify pgrst, 'reload schema';
