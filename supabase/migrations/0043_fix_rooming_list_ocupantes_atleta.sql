-- A tabela rooming_list_ocupantes (Futebol Profissional) foi criada só aceitando 'comissao' e
-- 'staff' (migração 0001/0003). A migração 0008 já corrigia isso pra liberar 'atleta' também, mas
-- parece que ela não chegou a rodar em produção — por isso salvar um quarto com atletas mostrava
-- "salvo com sucesso" só que as pessoas não entravam de fato (a inserção falhava calada por causa
-- dessa restrição antiga, e o PDF saía com os quartos vazios). Este script reaplica a correção de
-- forma segura, mesmo que já tenha sido aplicada antes.

alter table public.rooming_list_ocupantes drop constraint if exists rooming_list_ocupantes_pessoa_tipo_check;
alter table public.rooming_list_ocupantes add constraint rooming_list_ocupantes_pessoa_tipo_check
  check (pessoa_tipo in ('atleta', 'comissao', 'staff'));
