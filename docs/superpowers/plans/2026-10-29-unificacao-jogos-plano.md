# Plano de implementação — Unificação de Jogos/Convocação, Fase 2

Baseado em `docs/superpowers/specs/2026-10-29-unificacao-jogos-design.md`, aprovada pelo Mateus. Mesma ordem que funcionou nas duas unificações anteriores (Comissão Técnica, Atletas): schema primeiro, depois tipos, depois telas (núcleo → cada sub-área → satélites), com sweep de verificação no final.

> Nota sobre este documento: o skill `writing-plans` (da suíte "Superpowers" usada no resto desta convenção `docs/superpowers/`) não está instalado nesta sessão — este plano foi escrito diretamente, seguindo a mesma estrutura do plano da Fase 1 (`docs/superpowers/plans/2026-10-28-unificacao-atletas-plano.md`), em vez de ser gerado por aquele skill.

**Já resolvido antes deste plano** (ver spec, seção "Pré-requisito já resolvido"): bug de `pessoa_id` em `onibus_passageiros_base`/`rooming_list_ocupantes_base` corrigido (`0153`); `convocacao_staff`/`convocacao_staff_base` (tabelas nunca usadas, achadas durante o levantamento) removidas (`0154`).

## 1. Migration SQL (schema + merge de dados)

Um arquivo `0155_unificacao_jogos.sql`, nos mesmos moldes de `0150_unificacao_atletas.sql`:

1. Adicionar `categoria` em `jogos` (nullable primeiro, preencher `'profissional'` em todas as linhas existentes, só então trocar pra `not null` + check de 8 valores — mesma lista de `atletas.categoria`).
2. Adicionar `penaltis_pro`/`penaltis_contra` (`integer`, nullable) em `jogos`.
3. Adicionar `numero_camisa` (`integer`, nullable) em `convocacao_atletas`.
4. Construir o mapeamento `jogo_id_antigo -> jogo_id_novo`: inserir as linhas de `jogos_base` em `jogos` (mapeando `categoria`, `penaltis_pro`/`penaltis_contra`, e o resto dos campos já equivalentes), guardando numa tabela temporária a correspondência entre o id antigo (`jogos_base`) e o novo (`jogos`) — mesmo padrão do passo 0/4 da `0150`.
5. Mesclar as 10 tabelas filhas de jogo (reapontando `jogo_id`/`convocacao_id`/`onibus_lista_id`/`rooming_list_id`/`quarto_id` pros ids novos via o mapeamento do passo 4): `checklist_jogo_itens`, `convocacoes` (+ `convocacao_atletas`, `convocacao_comissao`), `sumulas` (+ `sumula_eventos`), `gastos_jogo`, `onibus_lista` (+ `onibus_passageiros`), `jogo_programacao_itens`, `recibos_jogo`, `rooming_list` (+ `rooming_list_quartos`, `rooming_list_ocupantes`), `jogo_vagas_staff` (+ `jogo_vagas_staff_funcoes`, `jogo_vagas_staff_inscricoes`).
6. `configuracoes_financeiro`/`configuracoes_financeiro_base` são um caso à parte — não têm `jogo_id` (são singleton, 1 linha por departamento, sem coluna hoje que diga de qual departamento é cada linha). Adicionar `departamento text not null check (departamento in ('futebol_profissional','futebol_base')) unique` em `configuracoes_financeiro`, marcar a linha existente como `'futebol_profissional'`, inserir a linha de `configuracoes_financeiro_base` com `'futebol_base'`. Mesma ideia de `categoria` em `jogos`, só que no nível de departamento em vez de categoria de idade.
7. Trocar todas as FKs das tabelas filhas pra apontar pra `jogos`/`convocacoes`/etc. (as canônicas), com o mesmo cuidado da `0151_unificacao_atletas_fks.sql`: derrubar a FK antes de atualizar o dado (não depois), pra não esbarrar num id novo que só existe do lado "errado" durante a transição.
8. Renomear `jogos_base` → `jogos_base_old` e as 10 tabelas absorvidas + `configuracoes_financeiro_base` → `_old` (backup, não apagar — mesmo tratamento de `atletas_base_old`).
9. `notify pgrst, 'reload schema';`

**Atenção**: diferente da Fase 1, aqui não existe um "passo antes de começar" de completar dados nulos — nenhuma coluna está virando `not null` em cima de dado existente que possa estar faltando (categoria/pênaltis/departamento são sempre deriváveis do próprio registro de origem). Mas vale conferir no Supabase, antes de rodar, se não existe nenhuma tabela `_base` com `jogo_id` órfão (apontando pra um `jogos_base.id` que não existe mais) — não deveria acontecer, mas é barato conferir.

## 2. Tipos TypeScript (`lib/supabase/types.ts`)

- `JogoRow` ganha `categoria`, `penaltis_pro`/`penaltis_contra`.
- `JogoBaseRow` é removida.
- `ConvocacaoAtletaRow` ganha `numero_camisa: number | null`.
- `ConfiguracoesFinanceiroRow` ganha `departamento`.
- Os tipos das 10 sub-áreas Base (`...BaseRow`) são removidos; checar e atualizar qualquer lugar que ainda os importe.

## 3. Formulário único de Jogo (`app/jogos/jogo-form.tsx`)

- Absorve `app/base/jogos/jogo-form-base.tsx`.
- Seletor de Categoria no topo (Profissional + 7 da Base), mesmo padrão do formulário de Atletas.
- Campos de pênaltis visíveis condicionalmente (mata-mata) — campo já existe nas duas categorias pra mata-mata, mas só faz sentido mostrar quando o formato da fase permitir empate (mesma lógica que já decide isso hoje, só migrando de onde estiver).

## 4. Listagem e hub por jogo

- `app/jogos/page.tsx` absorve `app/base/jogos/page.tsx` (dashboard e export continuam só do Profissional).
- `components/jogo-tabs.tsx` absorve `components/jogo-tabs-base.tsx` — lista de abas condicionada por categoria (Credenciamento/Ingressos só pro Profissional).
- `components/jogos/jogo-card.tsx` absorve `jogo-card-base.tsx`.
- Rotas `/base/jogos/...` passam a redirecionar pra `/jogos/...` (mesmo tratamento que `/base/atletas/...` recebeu).

## 5. Actions do núcleo

- `app/jogos/actions.ts` absorve `app/base/jogos/actions.ts`.
- `app/jogos/[id]/operacao-actions.ts`/`operacao-data.ts` absorvem os equivalentes Base.

## 6. Checklist

Mescla `app/jogos/[id]/checklist/` com `app/base/jogos/[id]/checklist/` — tela e action já são campo a campo idênticas, é troca mecânica de tabela.

## 7. Convocação

Mescla `convocacao-form.tsx`/`convocacao-form-base.tsx` e as actions. Campo `numero_camisa` só aparece editável quando a categoria do jogo é de Base (decisão da spec) — Profissional continua lendo o número fixo do cadastro do atleta.

## 8. Súmula

Mescla `app/jogos/[id]/sumula/` com `app/base/jogos/[id]/sumula/` (dados do jogo, eventos, importação). Os campos de terceiro tempo passam a valer pra qualquer categoria com `numero_tempos = 3` da competição (hoje só Base usa — Profissional fica disponível, sem mudança de comportamento visível pra ele).

## 9. Financeiro de jogo

Mescla `app/jogos/[id]/financeiro/` com `app/base/jogos/[id]/financeiro/`. A leitura de `configuracoes_financeiro` passa a filtrar por `departamento` em vez de ler de duas tabelas diferentes.

## 10. Ônibus

Mescla `onibus-form.tsx`/`onibus-form-base.tsx` e o PDF (`lib/pdf/onibus-document.tsx` já é compartilhado — só ajustar o tipo).

## 11. Programação (Concentração / Dia de Jogo)

Mescla `app/jogos/[id]/programacao/` com `app/base/jogos/[id]/programacao/` (telas, jpg e pdf de concentração e dia de jogo). Não mexe na "Programação Semanal" do treinador — é outra coisa, fora de escopo.

## 12. Recibo

Mescla `recibo-form.tsx`/`recibo-form-base.tsx`, PDF e PDF consolidado (já compartilhados — só tipo).

## 13. Rooming-list

Mescla `rooming-list-form.tsx`/`rooming-list-form-base.tsx`, PDF e PDF de envio (já compartilhados — só tipo).

## 14. Vagas de Staff

Mescla `app/jogos/[id]/vagas/` com `app/base/jogos/[id]/vagas/` (actions + página).

## 15. Presskit e Relacionados

Sem tabela própria — só merge de rota (`app/jogos/[id]/presskit/route.tsx` absorve a versão Base; idem `relacionados/jpg` e `relacionados/pdf`).

## 16. Telas satélite

- `/area-financeira/jogos` e `/area-financeira/base/jogos` viram uma rota só, somente leitura.
- `/treinador/jogos` reponta pras rotas unificadas, mantendo o mesmo recorte restrito de hoje (só Convocação e Relacionados) — não ganha acesso a nenhuma aba nova.

## 17. Fora de escopo (confirmar que nada quebrou, sem redesenhar)

Dashboard, Credenciamento e Ingressos continuam como estão — só conferir, ao final, que nenhum deles ficou acidentalmente quebrado pela troca de tipo/tabela do núcleo (`JogoRow` mudou de shape).

## 18. Verificação final e sweep

- `git grep -n -i "jogos_base\b\|JogoBaseRow\|_base\b" app/jogos app/base/jogos lib/futebol lib/pdf components` (pedir ao Mateus pra rodar no repositório real e colar o resultado completo, mesmo padrão das duas unificações anteriores) — esperado aparecer bastante coisa em Competições/Súmulas-import e Financeiro avulso (fora de escopo desta fase, só confirmar que não quebrou nada que É desta fase).
- Build local/Vercel, com o mesmo cuidado de sempre sobre gaps de staging por profundidade no listing recursivo do device bridge.
- Relatar arquivos órfãos (`jogo-form-base.tsx`, `app/base/jogos/actions.ts`, `jogo-tabs-base.tsx`, etc.) pro Mateus apagar.
