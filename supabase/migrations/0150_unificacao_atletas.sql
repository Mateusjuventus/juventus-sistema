-- Unificação de Atletas (Futebol Profissional + Futebol de Base) — Fase 1 (Núcleo). Ver
-- docs/superpowers/specs/2026-10-28-unificacao-atletas-design.md e
-- docs/superpowers/plans/2026-10-28-unificacao-atletas-plano.md. Mesmo molde da unificação de
-- Comissão Técnica (0149_unificacao_comissao_tecnica.sql): `atletas` (Profissional) continua sendo
-- a tabela canônica; `atletas_base` é renomeada pra `_old` no final, como backup — não é apagada.
--
-- IMPORTANTE — pré-requisito, rodar ANTES desta migration (bloqueia o passo 5 se vier alguma
-- linha):
--
--   select id, nome_completo, rg, cpf, data_nascimento
--   from atletas_base
--   where rg is null or cpf is null or data_nascimento is null;
--
-- `atletas.rg`/`cpf` têm `unique` (0001_init.sql) e `atletas_base.rg`/`cpf` também (0031) — essa
-- tentativa de rodar a migration em 28/10/2026 bateu nisso ao vivo (ver abaixo, passo 0): 5 atletas
-- que já foram promovidos da Base pro Profissional têm cadastro duplicado nas duas tabelas, mesmo
-- CPF/RG. Pode valer a pena rodar de novo antes de aplicar, só pra conferir se não apareceu mais
-- nenhum caso novo desde então:
--
--   select a.id as atletas_id, a.nome_completo as atletas_nome, a.cpf as atletas_cpf, a.rg as atletas_rg,
--          b.id as atletas_base_id, b.nome_completo as atletas_base_nome, b.cpf as atletas_base_cpf, b.rg as atletas_base_rg
--   from atletas_base b
--   join atletas a on a.cpf = b.cpf or a.rg = b.rg;
--
-- Se aparecer alguém a mais além desses 5 (Felipe Bernardi, João Emanoel Duarte Fagundes, Eduardo
-- Salvador Correia, Henrique Miranda Quixabeira, Victor Barbosa Bispo Pereira — confirmados com o
-- Mateus em 28/10/2026), a migration já trata automaticamente do mesmo jeito (passo 0): não cria
-- uma segunda linha em `atletas`, só reaponta/mescla os dados da Base pro cadastro Profissional já
-- existente. Essa é uma suposição razoável (mesmo nome, mesmo CPF/RG = mesma pessoa promovida),
-- mas vale conferir visualmente se aparecer gente nova na lista antes de rodar.

-- =========================================================
-- 0) Mapeamento de cadastros duplicados (atleta já promovido da Base pro Profissional, com um
--    cadastro em cada tabela). Pra esses, a migration NÃO cria uma segunda linha em `atletas` — os
--    dados da Base (anotações, documentos, contratos, classificação etc.) são reapontados pro id
--    do cadastro Profissional que já existe (decisão do Mateus, 28/10/2026). O cadastro antigo da
--    Base continua intacto em `atletas_base_old` no final, só não gera uma linha nova.
-- =========================================================
create temporary table atletas_duplicados_mapeamento as
select b.id as atletas_base_id, a.id as atletas_id
from public.atletas_base b
join public.atletas a on a.cpf = b.cpf or a.rg = b.rg;

-- =========================================================
-- 1) Coluna `categoria` em `atletas` — nullable primeiro, preenche as linhas existentes
--    (Profissional) com 'profissional', e só depois do passo 5 (quando as linhas da Base também
--    estiverem populadas) é que vira not null + check.
-- =========================================================
alter table public.atletas add column if not exists categoria text;
update public.atletas set categoria = 'profissional' where categoria is null;

-- =========================================================
-- 2) Colunas que hoje só existem em `atletas_base`, passam a existir em `atletas` (nullable —
--    seguem sem uso/sem exibição no formulário quando a categoria é "profissional", exceto
--    classificação, que o Mateus decidiu estender pro Profissional também).
-- =========================================================
alter table public.atletas
  add column if not exists email_pai text,
  add column if not exists email_mae text,
  add column if not exists alojado boolean not null default false,
  add column if not exists classificacao text check (classificacao in ('g1', 'g2', 'g3', 'dispensa')),
  add column if not exists dispensa_motivo text,
  add column if not exists dispensa_nota_tecnica smallint check (dispensa_nota_tecnica is null or dispensa_nota_tecnica between 3 and 9),
  add column if not exists dispensa_nota_fisica smallint check (dispensa_nota_fisica is null or dispensa_nota_fisica between 3 and 9),
  add column if not exists dispensa_nota_tatica smallint check (dispensa_nota_tatica is null or dispensa_nota_tatica between 3 and 9),
  add column if not exists dispensa_nota_comportamental smallint check (dispensa_nota_comportamental is null or dispensa_nota_comportamental between 3 and 9),
  add column if not exists dispensa_data date,
  add column if not exists dispensado_por uuid references public.perfis(id),
  add column if not exists dispensado_em timestamptz,
  add column if not exists valor_ajuda_custo numeric(12, 2),
  add column if not exists agencia text,
  add column if not exists mae_nome text,
  add column if not exists mae_telefone text,
  add column if not exists pai_nome text,
  add column if not exists pai_telefone text,
  add column if not exists escola text;

-- =========================================================
-- 3) `status` — troca a constraint de `atletas` pros 4 valores unificados (hoje só tem 3, sem
--    "dispensado"). Nenhuma conversão de dado precisa acontecer aqui: os 3 valores que já existem
--    em `atletas` (liberado/departamento_medico/transicao) continuam válidos. `atletas_status_
--    historico.status` tem a própria constraint, criada em 0125_atletas_status_transicao.sql antes
--    de "dispensado" existir pro Profissional — também precisa ampliar (achado numa tentativa real
--    de rodar esta migration em 28/10/2026, que falhou no backfill do passo 7 por causa disso).
-- =========================================================
alter table public.atletas drop constraint atletas_status_check;
alter table public.atletas add constraint atletas_status_check
  check (status in ('liberado', 'transicao', 'departamento_medico', 'dispensado'));

alter table public.atletas_status_historico drop constraint atletas_status_historico_status_check;
alter table public.atletas_status_historico add constraint atletas_status_historico_status_check
  check (status in ('liberado', 'transicao', 'departamento_medico', 'dispensado'));

-- =========================================================
-- 4) `tipo_contrato` — libera "iniciacao" nas duas tabelas que hoje só aceitam 4 valores
--    (`atletas` e `atleta_contratos`), igual já é em `atletas_base`/`atleta_base_contratos`. Tem
--    que vir antes do passo 5/7 (que vão inserir linhas da Base, algumas com "iniciacao").
-- =========================================================
alter table public.atletas
  drop constraint if exists atletas_tipo_contrato_check;
alter table public.atletas
  add constraint atletas_tipo_contrato_check
  check (tipo_contrato is null or tipo_contrato in ('definitivo', 'emprestimo', 'amador', 'formacao', 'iniciacao'));

-- `atleta_contratos.tipo_contrato` foi criado com `check` inline (0137_atleta_contrato.sql, sem
-- nome explícito) — em vez de adivinhar o nome que o Postgres gerou sozinho, acha e remove
-- dinamicamente a constraint de check que existe hoje nessa coluna, antes de criar a nova (com
-- nome explícito, pra não depender de adivinhação de novo numa migration futura).
do $$
declare
  nome_constraint text;
begin
  select conname into nome_constraint
  from pg_constraint
  where conrelid = 'public.atleta_contratos'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%tipo_contrato%';
  if nome_constraint is not null then
    execute format('alter table public.atleta_contratos drop constraint %I', nome_constraint);
  end if;
end $$;

alter table public.atleta_contratos
  add constraint atleta_contratos_tipo_contrato_check
  check (tipo_contrato in ('definitivo', 'emprestimo', 'amador', 'formacao', 'iniciacao'));

-- =========================================================
-- 5) Migra as linhas de `atletas_base` pra `atletas` — preserva o `id` original (simplifica o
--    resto da migration: as tabelas filhas, que apontam `atleta_id` pro id antigo, não precisam de
--    nenhum remapeamento, já que o id continua o mesmo em `atletas`, EXCETO pros duplicados do
--    passo 0, que ficam de fora daqui — ver passo 5b). `status = 'suspenso'` converte pra
--    `'liberado'` na hora da cópia (mesmo critério usado em 01/10 quando o Profissional aboliu
--    "suspenso" — ver 0125_atletas_status_transicao.sql). RG/CPF/data_nascimento: a checagem
--    pré-migration (acima) já garante que não sobra nenhum nulo; `atletas.rg/cpf/data_nascimento`
--    já são `not null` desde a criação da tabela (0001_init.sql) e não precisam de nenhum ALTER
--    aqui — só precisavam parar de ser nulos na ORIGEM (`atletas_base`), o que a checagem garante.
-- =========================================================
insert into public.atletas (
  id, categoria, nome_completo, apelido, rg, cpf, data_nascimento, posicao,
  numero_camisa, numero_cbf, numero_fpf, pe_dominante, telefone, email, email_pai, email_mae,
  cidade_natal, uf_natal, endereco_atual,
  cep, logradouro, numero, complemento, bairro, cidade, uf,
  origem_cep, origem_logradouro, origem_numero, origem_complemento, origem_bairro, origem_cidade, origem_uf,
  data_inicio_clube, data_inicio_contrato, empresario_nome, empresario_telefone, empresario_email,
  tamanho_uniforme, foto_path,
  status, data_fim_contrato, tipo_contrato, possui_contrato_formacao,
  alojado, classificacao,
  dispensa_motivo, dispensa_nota_tecnica, dispensa_nota_fisica, dispensa_nota_tatica, dispensa_nota_comportamental,
  dispensa_data, dispensado_por, dispensado_em, valor_ajuda_custo, agencia,
  mae_nome, mae_telefone, pai_nome, pai_telefone, escola,
  possui_alergia_medicamento, alergia_medicamento_qual, ativo,
  created_by, created_at, updated_at
)
select
  id, categoria, nome_completo, apelido, rg, cpf, data_nascimento, posicao,
  numero_camisa, numero_cbf, numero_fpf, pe_dominante, telefone, email, email_pai, email_mae,
  cidade_natal, uf_natal, endereco_atual,
  cep, logradouro, numero, complemento, bairro, cidade, uf,
  origem_cep, origem_logradouro, origem_numero, origem_complemento, origem_bairro, origem_cidade, origem_uf,
  data_inicio_clube, data_inicio_contrato, empresario_nome, empresario_telefone, empresario_email,
  tamanho_uniforme, foto_path,
  case when status = 'suspenso' then 'liberado' else status end,
  data_fim_contrato, tipo_contrato, possui_contrato_formacao,
  alojado, classificacao,
  dispensa_motivo, dispensa_nota_tecnica, dispensa_nota_fisica, dispensa_nota_tatica, dispensa_nota_comportamental,
  dispensa_data, dispensado_por, dispensado_em, valor_ajuda_custo, agencia,
  mae_nome, mae_telefone, pai_nome, pai_telefone, escola,
  possui_alergia_medicamento, alergia_medicamento_qual, ativo,
  created_by, created_at, updated_at
from public.atletas_base b
where not exists (
  select 1 from atletas_duplicados_mapeamento m where m.atletas_base_id = b.id
);

-- =========================================================
-- 5b) Pros duplicados do passo 0 (atleta já promovido, cadastro nos dois lados): em vez de uma
--     linha nova, completa só os campos que hoje só existem na Base e que a linha de `atletas` dele
--     ainda não tem preenchidos (`coalesce` — nunca sobrescreve um valor que já existia do lado
--     Profissional). RG/CPF/data_nascimento/categoria ficam como já estavam em `atletas` (é a fonte
--     da verdade pra quem já é Profissional) — `alojado` é `or` em vez de `coalesce` porque a coluna
--     é `not null default false`, não tem estado "vazio" pra preencher.
-- =========================================================
update public.atletas a
set
  email_pai = coalesce(a.email_pai, b.email_pai),
  email_mae = coalesce(a.email_mae, b.email_mae),
  alojado = a.alojado or b.alojado,
  classificacao = coalesce(a.classificacao, b.classificacao),
  dispensa_motivo = coalesce(a.dispensa_motivo, b.dispensa_motivo),
  dispensa_nota_tecnica = coalesce(a.dispensa_nota_tecnica, b.dispensa_nota_tecnica),
  dispensa_nota_fisica = coalesce(a.dispensa_nota_fisica, b.dispensa_nota_fisica),
  dispensa_nota_tatica = coalesce(a.dispensa_nota_tatica, b.dispensa_nota_tatica),
  dispensa_nota_comportamental = coalesce(a.dispensa_nota_comportamental, b.dispensa_nota_comportamental),
  dispensa_data = coalesce(a.dispensa_data, b.dispensa_data),
  dispensado_por = coalesce(a.dispensado_por, b.dispensado_por),
  dispensado_em = coalesce(a.dispensado_em, b.dispensado_em),
  valor_ajuda_custo = coalesce(a.valor_ajuda_custo, b.valor_ajuda_custo),
  agencia = coalesce(a.agencia, b.agencia),
  mae_nome = coalesce(a.mae_nome, b.mae_nome),
  mae_telefone = coalesce(a.mae_telefone, b.mae_telefone),
  pai_nome = coalesce(a.pai_nome, b.pai_nome),
  pai_telefone = coalesce(a.pai_telefone, b.pai_telefone),
  escola = coalesce(a.escola, b.escola)
from public.atletas_base b
join atletas_duplicados_mapeamento m on m.atletas_base_id = b.id
where a.id = m.atletas_id;

-- =========================================================
-- 6) Agora que toda linha (Profissional + Base) tem `categoria` preenchida, fecha a coluna.
-- =========================================================
alter table public.atletas alter column categoria set not null;
alter table public.atletas add constraint atletas_categoria_check
  check (categoria in ('profissional', 'sub20', 'sub17', 'sub15', 'sub14', 'sub13', 'sub12', 'sub11'));

-- =========================================================
-- 7) Mescla as 5 tabelas filhas. `atleta_id` aponta pro id certo em `atletas` — preservado no
--    passo 5 pra quem não é duplicado; pros duplicados do passo 0, `coalesce` reaponta pro id do
--    cadastro Profissional que já existia (`m.atletas_id`), em vez do id antigo da Base (que nunca
--    ganhou uma linha própria em `atletas`).
-- =========================================================
insert into public.atleta_documentos (id, atleta_id, nome, arquivo_path, created_by, created_at)
select d.id, coalesce(m.atletas_id, d.atleta_id), d.nome, d.arquivo_path, d.created_by, d.created_at
from public.atleta_documentos_base d
left join atletas_duplicados_mapeamento m on m.atletas_base_id = d.atleta_id;

insert into public.atleta_contatos_emergencia (id, atleta_id, nome, parentesco, contato, created_at)
select c.id, coalesce(m.atletas_id, c.atleta_id), c.nome, c.parentesco, c.contato, c.created_at
from public.atleta_base_contatos_emergencia c
left join atletas_duplicados_mapeamento m on m.atletas_base_id = c.atleta_id;

insert into public.atleta_anotacoes (id, atleta_id, texto, criado_por_perfil_id, criado_por_nome, created_at)
select n.id, coalesce(m.atletas_id, n.atleta_id), n.texto, n.criado_por_perfil_id, n.criado_por_nome, n.created_at
from public.atleta_base_anotacoes n
left join atletas_duplicados_mapeamento m on m.atletas_base_id = n.atleta_id;

-- Contratos dos duplicados entram sempre como histórico (`vigente = false`), nunca como o vigente
-- atual: quem já foi promovido pro Profissional tem (ou pode ter) um `atleta_contratos` próprio já
-- vigente, e só pode haver um vigente por atleta (índice único parcial) — tratar o contrato antigo
-- da Base como encerrado evita a colisão e é semanticamente certo (não é mais o contrato corrente).
insert into public.atleta_contratos (
  id, atleta_id, vigente, tipo_contrato, clube_origem, vigencia_inicio, vigencia_fim,
  salario_ctps, direito_imagem, bonificacao, auxilio_moradia, outros,
  criado_por_perfil_id, criado_por_nome, created_at, encerrado_em
)
select
  c.id, coalesce(m.atletas_id, c.atleta_id),
  case when m.atletas_id is not null then false else c.vigente end,
  c.tipo_contrato, c.clube_origem, c.vigencia_inicio, c.vigencia_fim,
  c.salario_ctps, c.direito_imagem, c.bonificacao, c.auxilio_moradia, c.outros,
  c.criado_por_perfil_id, c.criado_por_nome, c.created_at,
  case when m.atletas_id is not null then coalesce(c.encerrado_em, now()) else c.encerrado_em end
from public.atleta_base_contratos c
left join atletas_duplicados_mapeamento m on m.atletas_base_id = c.atleta_id;

-- `atletas_status_historico` (linha do tempo de status) só existe pro Profissional hoje
-- (0125_atletas_status_transicao.sql) — a Base NUNCA teve uma tabela equivalente
-- (`atletas_base_status_historico` não existe no banco; o tipo `AtletaBaseStatusHistoricoRow` em
-- lib/supabase/types.ts ficou órfão, nunca foi usado em nenhum `.from()`). Então não há nada pra
-- "mesclar" aqui — em vez disso, cada atleta migrado da Base (que NÃO é um duplicado do passo 0)
-- ganha uma linha inicial, com o status atual dele (já convertido no passo 5) e data de hoje,
-- exatamente como a 0125 fez na época pro Profissional (mesmo "o histórico começa do zero a partir
-- de hoje"). Duplicados ficam de fora: já têm histórico próprio desde que viraram Profissional, e o
-- status que vale pra eles é o de `atletas`, não o antigo da Base.
insert into public.atletas_status_historico (atleta_id, status, data, criado_por_nome)
select b.id, b.status, current_date, 'Migração do sistema (unificação de Atletas)'
from public.atletas_base b
where not exists (
  select 1 from atletas_duplicados_mapeamento m where m.atletas_base_id = b.id
);

-- =========================================================
-- 8) Renomeia as tabelas antigas pra `_old` — backup, não apagar (mesmo tratamento dado a
--    `comissao_tecnica_base_old`). `criar_contrato_atleta_base` (função) fica como está por
--    enquanto: nenhum código chama ela hoje (a Base nunca teve a tela "Novo contrato" ligada —
--    `novoContratoHref` em app/base/atletas/.../page.tsx e ver/page.tsx sempre apontou pra uma rota
--    que não existe; a unificação da tela de Contrato, passo 7 do plano, resolve isso usando
--    `criar_contrato_atleta`, que já aceita "iniciacao" desde o passo 4 acima). Fica pra limpar no
--    relatório de órfãos no final da fase.
-- =========================================================
alter table public.atletas_base rename to atletas_base_old;
alter table public.atleta_documentos_base rename to atleta_documentos_base_old;
alter table public.atleta_base_contatos_emergencia rename to atleta_base_contatos_emergencia_old;
alter table public.atleta_base_anotacoes rename to atleta_base_anotacoes_old;
alter table public.atleta_base_contratos rename to atleta_base_contratos_old;

notify pgrst, 'reload schema';
