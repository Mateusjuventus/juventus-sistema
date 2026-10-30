-- Unificação de Staff Operacional (Futebol Profissional + Futebol de Base) — pré-requisito pra
-- Fase 2 (Jogos/Convocação), achado durante o levantamento (ver docs/superpowers/specs/
-- 2026-10-29-unificacao-jogos-design.md): `jogo_vagas_staff_inscricoes.staff_id` referencia
-- `staff_operacional(id)` e `jogo_vagas_staff_base_inscricoes.staff_id` referencia
-- `staff_operacional_base(id)` — duas tabelas nunca unificadas, o que bloqueava mesclar a
-- sub-área de Vagas de Staff junto com o resto da Fase 2. Mesmo molde das unificações de Comissão
-- Técnica (0149_unificacao_comissao_tecnica.sql) e Atletas (0150_unificacao_atletas.sql):
-- `staff_operacional` (Profissional) continua sendo a tabela canônica; `staff_operacional_base` é
-- renomeada pra `_old` no final, como backup — não é apagada.
--
-- Diferente de Comissão Técnica/Atletas: Staff Operacional não tem nenhum conceito de
-- categoria/departamento no sistema — confirmado com o Mateus em 29/10/2026 ("staff não tem
-- diferença, só comissão técnica") — então esta migration NÃO adiciona nenhuma coluna nova de
-- escopo, só une as duas listas numa só. Os schemas das duas tabelas são idênticos coluna a coluna
-- desde sempre (nenhuma ALTER divergente em nenhuma das duas ao longo do histórico — `funcao_id`/
-- `funcao_terceirizada_id` já referenciam o mesmo catálogo compartilhado `staff_funcoes_catalogo`
-- nos dois lados).
--
-- `jogo_vagas_staff_inscricoes`/`jogo_vagas_staff_base_inscricoes` continuam como duas tabelas
-- separadas por enquanto (só a Fase 2/migration de Jogos as mescla) — esta migration só reponta o
-- `staff_id` de `jogo_vagas_staff_base_inscricoes` pro id unificado, pra já deixar essa tabela
-- consistente antes dela ser absorvida.

begin;

-- =========================================================
-- 0) Mapeamento de cadastros duplicados (mesma pessoa com registro nas duas tabelas — mesmo cpf OU
--    rg). Pra esses, a migration NÃO cria uma linha nova em `staff_operacional` — só completa os
--    campos que estiverem faltando com o dado da Base (decisão idêntica à de Atletas/0150). O
--    cadastro antigo da Base continua intacto em `staff_operacional_base_old` no final.
-- =========================================================
create temporary table staff_duplicados_mapeamento as
select b.id as staff_base_id, a.id as staff_id
from public.staff_operacional_base b
join public.staff_operacional a on a.cpf = b.cpf or a.rg = b.rg;

-- =========================================================
-- 1) Insere as linhas de `staff_operacional_base` que NÃO são duplicatas — preserva o `id` original
--    (simplifica o resto: `jogo_vagas_staff_base_inscricoes.staff_id`, que aponta pro id antigo da
--    Base, não precisa de remapeamento nenhum pra esses casos, já que o id continua o mesmo).
-- =========================================================
insert into public.staff_operacional (
  id, nome_completo, rg, cpf, data_nascimento, funcao_id, telefone, terceirizada,
  funcao_terceirizada_id, chave_pix, chave_pix_tipo, valor_padrao_pagamento, email,
  cep, logradouro, numero, complemento, bairro, cidade, uf,
  ativo, foto_path, created_by, created_at, updated_at
)
select
  id, nome_completo, rg, cpf, data_nascimento, funcao_id, telefone, terceirizada,
  funcao_terceirizada_id, chave_pix, chave_pix_tipo, valor_padrao_pagamento, email,
  cep, logradouro, numero, complemento, bairro, cidade, uf,
  ativo, foto_path, created_by, created_at, updated_at
from public.staff_operacional_base b
where not exists (
  select 1 from staff_duplicados_mapeamento m where m.staff_base_id = b.id
);

-- =========================================================
-- 2) Pros duplicados: completa só os campos opcionais que a linha de `staff_operacional` ainda não
--    tem preenchidos (`coalesce` — nunca sobrescreve um valor que já existia do lado Profissional).
--    `nome_completo`/`rg`/`cpf`/`data_nascimento`/`funcao_id`/`ativo` ficam como já estavam em
--    `staff_operacional` (é a fonte da verdade pra quem já está cadastrado lá). `terceirizada` é
--    `or` em vez de `coalesce` porque a coluna é `not null default false`, não tem estado "vazio"
--    pra preencher (mesmo critério de `alojado` em 0150).
-- =========================================================
update public.staff_operacional a
set
  telefone = coalesce(a.telefone, b.telefone),
  terceirizada = a.terceirizada or b.terceirizada,
  funcao_terceirizada_id = coalesce(a.funcao_terceirizada_id, b.funcao_terceirizada_id),
  chave_pix = coalesce(a.chave_pix, b.chave_pix),
  chave_pix_tipo = coalesce(a.chave_pix_tipo, b.chave_pix_tipo),
  valor_padrao_pagamento = coalesce(a.valor_padrao_pagamento, b.valor_padrao_pagamento),
  email = coalesce(a.email, b.email),
  cep = coalesce(a.cep, b.cep),
  logradouro = coalesce(a.logradouro, b.logradouro),
  numero = coalesce(a.numero, b.numero),
  complemento = coalesce(a.complemento, b.complemento),
  bairro = coalesce(a.bairro, b.bairro),
  cidade = coalesce(a.cidade, b.cidade),
  uf = coalesce(a.uf, b.uf),
  foto_path = coalesce(a.foto_path, b.foto_path)
from public.staff_operacional_base b
join staff_duplicados_mapeamento m on m.staff_base_id = b.id
where a.id = m.staff_id;

-- =========================================================
-- 3) Checagem de segurança: nenhuma linha pode ter sido perdida. Se o total não bater, a transação
--    inteira é desfeita.
-- =========================================================
do $$
declare
  total_profissional_antes integer;
  total_base_antes integer;
  total_base_novos integer;
  total_depois integer;
begin
  select count(*) into total_base_antes from public.staff_operacional_base;
  select count(*) into total_base_novos
    from public.staff_operacional_base b
    where not exists (select 1 from staff_duplicados_mapeamento m where m.staff_base_id = b.id);
  select count(*) into total_depois from public.staff_operacional;

  -- total_profissional_antes = total_depois - total_base_novos (recalculado aqui porque o insert
  -- do passo 1 já rodou nesta transação)
  total_profissional_antes := total_depois - total_base_novos;

  if total_depois <> total_profissional_antes + total_base_novos then
    raise exception
      'Contagem não bateu: base antes=%, base novos (sem cpf/rg duplicado)=%, total depois=%',
      total_base_antes, total_base_novos, total_depois;
  end if;

  raise notice 'OK: % linha(s) nova(s) da Base inserida(s), % duplicata(s) (cpf/rg já existente) mesclada(s), % no total.',
    total_base_novos, total_base_antes - total_base_novos, total_depois;
end $$;

-- =========================================================
-- 4) Repondera `jogo_vagas_staff_base_inscricoes.staff_id` pro id unificado antes de trocar a FK:
--    pra quem não é duplicado o id não muda (preservado no passo 1); pra duplicados, repondera pro
--    id do cadastro Profissional que já existia. Dropa a FK antes de atualizar o dado (não depois),
--    mesmo cuidado de 0151_unificacao_atletas_fks.sql.
-- =========================================================
alter table public.jogo_vagas_staff_base_inscricoes
  drop constraint if exists jogo_vagas_staff_base_inscricoes_staff_id_fkey;

update public.jogo_vagas_staff_base_inscricoes i
set staff_id = m.staff_id
from staff_duplicados_mapeamento m
where i.staff_id = m.staff_base_id;

alter table public.jogo_vagas_staff_base_inscricoes
  add constraint jogo_vagas_staff_base_inscricoes_staff_id_fkey
  foreign key (staff_id) references public.staff_operacional(id) on delete cascade;

-- =========================================================
-- 5) Guarda a tabela antiga (não apaga) — remoção definitiva é um passo manual separado, só depois
--    de confirmar que tudo está certo (mesmo tratamento de `atletas_base_old`/
--    `comissao_tecnica_base_old`).
-- =========================================================
alter table public.staff_operacional_base rename to staff_operacional_base_old;

notify pgrst, 'reload schema';

commit;

-- ============================================================================================
-- Verificação manual sugerida (rodar depois, fora desta transação):
--
-- select count(*) from public.staff_operacional;              -- total depois da unificação
-- select count(*) from public.staff_operacional_base_old;     -- quantos existiam na Base antes
-- select cpf, rg, nome_completo from public.staff_operacional
--   where cpf in (select cpf from public.staff_operacional_base_old)
--      or rg in (select rg from public.staff_operacional_base_old);  -- confere os mesclados
--
-- Depois de confirmar que está tudo certo (telas de Staff Operacional, Vagas de Staff, Recibo,
-- Ônibus, Rooming-list, Credenciamento):
--   drop table public.staff_operacional_base_old;
-- ============================================================================================
