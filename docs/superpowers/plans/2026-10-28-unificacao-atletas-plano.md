# Plano de implementação — Unificação de Atletas, Fase 1 (Núcleo)

Baseado em `docs/superpowers/specs/2026-10-28-unificacao-atletas-design.md`, aprovada pelo Mateus. Segue a mesma ordem que funcionou na unificação de Comissão Técnica: schema primeiro, depois tipos, depois telas, depois o ajuste pontual da Captação, com verificação/sweep no final.

**Antes de começar**: rodar no banco (SQL editor do Supabase) uma consulta de verificação —

```sql
select id, nome_completo, rg, cpf, data_nascimento
from atletas_base
where rg is null or cpf is null or data_nascimento is null;
```

Se vier alguma linha, esses cadastros precisam ser completados manualmente (pelo Mateus ou quem for) antes de aplicar a migration — ela vai falhar no `ALTER COLUMN ... SET NOT NULL` se sobrar algum nulo. Isso bloqueia o passo 1 até ser confirmado "zero linhas" ou os dados serem completados.

## 1. Migration SQL (schema + backfill + função)

Um arquivo `0150_unificacao_atletas.sql`, nos mesmos moldes de `0149_unificacao_comissao_tecnica.sql`:

1. Adicionar `categoria` em `atletas` (nullable primeiro), preencher `'profissional'` em todas as linhas existentes, só então trocar pra `not null` + check constraint (8 valores).
2. Adicionar em `atletas` as colunas que só existem em `atletas_base` hoje: `email_pai`, `email_mae`, `alojado`, `classificacao`, `dispensa_motivo`, `dispensa_nota_tecnica`, `dispensa_nota_fisica`, `dispensa_nota_tatica`, `dispensa_nota_comportamental`, `dispensa_data`, `dispensado_por`, `dispensado_em`, `valor_ajuda_custo`, `agencia`, `mae_nome`, `mae_telefone`, `pai_nome`, `pai_telefone`, `escola` — todas nullable.
3. Trocar a constraint de `status` em `atletas` pra `check (status in ('liberado','transicao','departamento_medico','dispensado'))`.
4. Inserir as linhas de `atletas_base` em `atletas` (convertendo `status = 'suspenso'` pra `'liberado'` antes/durante o insert), mapeando toda coluna equivalente + as novas do passo 2 + `categoria` = valor escalar que já tinham.
5. Mesclar as 5 tabelas filhas (reapontando `atleta_id` pros ids novos em `atletas`, via a correspondência criada no passo 4):
   - `atleta_documentos` ← dados de `atleta_documentos_base`
   - `atleta_contatos_emergencia` ← dados de `atleta_base_contatos_emergencia`
   - `atleta_anotacoes` ← dados da tabela de anotações da Base (confirmar nome exato antes de escrever o SQL — ver pendência #3 da spec)
   - `atleta_contratos` ← dados de `atleta_base_contratos` (ajustando `tipo_contrato` pra aceitar os 5 valores antes do insert)
   - `atletas_status_historico` ← dados de `atletas_base_status_historico`
6. Trocar a constraint de `tipo_contrato` em `atleta_contratos` pra aceitar os 5 valores (`definitivo|emprestimo|amador|formacao|iniciacao`).
7. Alterar RG/CPF/data_nascimento em `atletas` pra `not null` (depois de confirmado o passo "antes de começar").
8. Unificar `criar_contrato_atleta`/`criar_contrato_atleta_base` numa função só (a versão do Profissional já serve, só precisa aceitar o `tipo_contrato` ampliado).
9. Renomear `atletas_base` → `atletas_base_old` e as 5 tabelas filhas absorvidas → `_old` (backup, não apagar — mesmo tratamento de `comissao_tecnica_base_old`). NÃO apagar `captacao_base`, `assistencia_social_atendimentos`, `fisioterapia_historico_importado` (fora de escopo).
10. `notify pgrst, 'reload schema';`

## 2. Tipos TypeScript (`lib/supabase/types.ts`)

- `AtletaRow` ganha os campos novos (categoria + os 18 campos ex-Base) e o `status` ampliado.
- `AtletaBaseRow` é removida (ou marcada deprecated/redirecionada pra `AtletaRow`, a decidir no código — mesmo padrão de `ComissaoTecnicaBaseRow` removido na unificação anterior).
- Checar e atualizar os tipos das 5 tabelas filhas mescladas.

## 3. Categorias (`lib/auth/categorias-base.ts` ou novo arquivo)

Criar o equivalente de `CATEGORIAS_COMISSAO_TECNICA` pra Atletas — provavelmente `CATEGORIAS_ATLETA` (profissional + as 7 de `CATEGORIAS_BASE`), reaproveitando `CategoriaBase` já existente. Cuidado: diferente de Comissão Técnica, aqui cada atleta tem exatamente 1 categoria (campo escalar), não uma lista — então os helpers de validação/label podem ser reaproveitados, mas os filtros no código usam `=` em vez de `.includes()`.

## 4. Formulário único (`app/atletas/atleta-form.tsx`)

- Juntar `atleta-form.tsx` (Profissional) com `atleta-base-form.tsx` (Base) num só componente.
- Seletor de Categoria no topo.
- Seção "Classificação" (G1/G2/G3) visível pra qualquer categoria.
- Seção com mãe/pai/escola/alojado/ajuda de custo/agência visível só quando a categoria selecionada é de Base (checar resposta do Mateus sobre essa pendência da spec antes de implementar — se ele pedir mostrar pra Profissional também, ajustar aqui).
- RG/CPF/data de nascimento passam a ser `required` no formulário pros dois (já eram pro Profissional).

## 5. Tela de listagem (`app/atletas/page.tsx`)

- Unificar com `app/base/atletas/[categoria]/page.tsx`.
- 1 bloco por categoria (Profissional + Sub-20...Sub-11), igual ao padrão que a Base já tem — reaproveitar a estrutura de blocos que a Base já usa, não a de 2-blocos da Comissão Técnica.
- Acessível pelos dois departamentos, com os 2 interruptores de módulo decidindo quais blocos aparecem (mesmo padrão de `/comissao-tecnica`).
- Rota `/base/atletas/[categoria]` passa a redirecionar pra `/atletas?categoria=...` (mesmo tratamento que `/base/comissao-tecnica` recebeu).

## 6. Actions (`app/atletas/actions.ts`)

- Mesclar com `app/base/atletas/actions.ts` — criar/editar/excluir atleta de qualquer categoria por um só conjunto de actions.

## 7. Subtelas de `[id]/*` — escopo desta fase

Dentro de `app/atletas/[id]/` hoje existem: `anotacoes`, `contrato`, `dados-de-jogo`, `documentacao`, `ficha`, `relatorio`, `ver`. Pra esta fase (núcleo), mesclam com o equivalente em `app/base/atletas/[categoria]/[id]/`:

- `ver` — tela principal de visualização, inclui contrato/histórico (`contrato-secao.tsx`, já compartilhado) e agora também Classificação. Mesclar.
- `contrato` — já é compartilhado via `components/contrato-secao.tsx`; só trocar a function de banco chamada (passo 1.8) e garantir que funciona pra qualquer categoria.
- `documentacao` — mesclar (tabela já unificada no passo 1.5).
- `anotacoes` — mesclar (tabela já unificada no passo 1.5).

**Ficam para as fases futuras, não mexer agora**: `dados-de-jogo` (depende de Jogos/Convocação, fase própria) e `relatorio`/`ficha` em PDF, SE esses PDFs dependerem de módulos de fases futuras (confirmar ao chegar nesse passo — se forem só dados do núcleo, podem entrar aqui; senão, adiar). O Relatório de Dispensa da Base (`app/base/atletas/[categoria]/[id]/dispensa`) continua restrito à Base, só repontando pra tabela unificada.

## 8. Captação — ajuste pontual

- Schema de validação da inscrição pública (`lib/validation/schemas.ts`, o schema usado no formulário de inscrição da Captação) passa a exigir RG/CPF/data de nascimento.
- Formulário público de inscrição (componente de form da Captação) ganha esses 3 campos como obrigatórios.
- Action final de aprovação (que hoje insere em `atletas_base`) passa a inserir em `atletas` com a `categoria` correspondente.

## 9. Verificação final e sweep

- `git grep -n -i "atletas_base\b" ` no repo real (pedir ao Mateus, mesmo padrão usado na Comissão Técnica) pra achar qualquer referência que ficou presa — provavelmente vai aparecer bastante coisa em Jogos/Convocação/Competições/Fisioterapia/Financeiro/Programação/Relatórios, que é esperado (fora de escopo desta fase) — só confirmar que não quebrou nada que É desta fase.
- Build local/Vercel.
- Relatar arquivos órfãos (`atleta-base-form.tsx`, `app/base/atletas/actions.ts`, etc.) pro Mateus apagar.

## 10. Sweep de referência de tabela em todo o resto do sistema (decisão do Mateus, 28/10)

Em vez de view de compatibilidade, o Mateus decidiu trocar a referência de tabela/tipo em TODO módulo que ainda lê/escreve `atletas_base` — sem redesenhar a tela de cada um ainda (isso continua pras fases futuras), só trocando `.from("atletas_base")` → `.from("atletas")` com o filtro de categoria certo, e `AtletaBaseRow` → `AtletaRow`, em: Jogos/Convocação, Competições/Súmulas, Fisioterapia, Financeiro, Programação, Relatório Avulso, Organograma/Campograma, Treinador, e qualquer outro lugar que apareça. Isso muda o tamanho real desta fase — não é mais só "núcleo", é núcleo + sweep completo de referências.

Mesmo padrão que funcionou na unificação de Comissão Técnica (depois de duas rodadas de sweep reativo falharem): pedir ao Mateus pra rodar, no repositório real, e colar o resultado completo —

```
git grep -n -i "atletas_base\b\|AtletaBaseRow\|atleta_base_" > atletas-grep.txt
```

(ou redirecionar pra um arquivo e anexar o arquivo, em vez de printar no terminal — evita o problema do `less` paginando e cortando a saída, que já aconteceu uma vez nesta sessão). Isso dá a lista completa e autoritativa de todo arquivo a tocar nesta fase, em vez de eu ir adivinhando pasta por pasta.

## Observação sobre as fases futuras

Mesmo com o sweep de referência de tabela feito nesta fase, Jogos/Convocação, Competições/Súmulas, Fisioterapia, Financeiro, Programação, Relatório Avulso e Organograma/Campograma continuam como telas SEPARADAS (`/base/jogos`, `/base/competicoes`, etc.) — só passam a ler da tabela unificada. Unificar a TELA de cada um (juntar `/jogos` com `/base/jogos` numa só, por exemplo) continua sendo trabalho de cada fase futura, não desta.
