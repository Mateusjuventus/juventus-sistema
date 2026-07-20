# Futebol de Base — Design

**Data:** 2026-07-20
**Autor:** Mateus Santos (Supervisor de Futebol Profissional — Juventus)
**Status:** Aprovado

## Contexto

O sistema hoje cobre só o departamento Futebol Profissional (7 módulos: Atletas, Comissão
Técnica, Staff Operacional, Jogos, Solicitações, Estoque, Financeiro). A camada de permissões já
tem um segundo departamento previsto — `lib/auth/departamentos.ts` define `"futebol_base"` com
prefixo de rota `/base`, e `app/base/page.tsx` é hoje só um placeholder "em breve". Este documento
é o design completo pra construir esse segundo departamento: Mateus pediu para "duplicar
exatamente" o Futebol Profissional para o Futebol de Base, com algumas diferenças pontuais e a
adição das categorias de idade (Sub20 a Sub11) no módulo Atletas (e, por consequência, em Jogos e
Comissão Técnica, que também precisam saber a qual categoria pertencem).

## Objetivo

Um segundo departamento completo, "Futebol de Base", com os mesmos 7 módulos do Futebol
Profissional (menos os itens listados em "Fora de escopo"), operando sobre dados totalmente
independentes — nenhum atleta, jogo, gasto etc. do Futebol de Base aparece nas telas do Futebol
Profissional e vice-versa. Atletas, Comissão Técnica e Jogos do Futebol de Base são organizados
por categoria (Sub20, Sub17, Sub15, Sub14, Sub13, Sub12, Sub11); Staff Operacional, Estoque e
Solicitações ficam como listas únicas, sem divisão por categoria (times de base costumam
compartilhar staff/estoque/fluxo de solicitações entre categorias).

## Fora de escopo

- **Carga de Ingressos** e **Credenciamento** dentro de Jogos — não fazem sentido pro Futebol de
  Base (sem bilheteria paga nem credenciamento de imprensa/autoridades no mesmo nível).
- **Estoque Médico** — o Futebol de Base só tem a categoria Esportivo.
- **Avisos** — não existe uma versão pro Futebol de Base neste momento (ver "Avisos" abaixo).
- Painel comparativo entre os dois departamentos (ex: um dashboard somando Profissional + Base) —
  cada departamento tem seus próprios paineis/relatórios, sem visão consolidada entre os dois.
- Qualquer restrição de acesso por categoria dentro de um módulo (ex: um usuário que só pode ver o
  Sub15) — a permissão é por módulo inteiro do Futebol de Base, igual ao Profissional hoje; dentro
  do módulo, quem tem acesso vê todas as categorias.
- Sugestão automática de categoria a partir da data de nascimento do atleta — o campo categoria é
  sempre escolhido manualmente no cadastro.

## Arquitetura de dados

**Tabelas e rotas totalmente separadas do Futebol Profissional** (sufixo `_base` nas tabelas,
prefixo `/base` nas rotas), em vez de reaproveitar as tabelas existentes com uma coluna de
departamento. Motivo: o sistema já está em uso diário por Mateus; reaproveitar as tabelas atuais
exigiria adicionar um filtro de departamento em praticamente toda query do sistema hoje (dezenas de
arquivos), com risco real de algum filtro esquecido misturar dado de um departamento com o outro.
Tabelas/rotas separadas são puramente aditivas — nenhuma linha de código do Futebol Profissional
muda. O custo é code duplication (um bug corrigido num módulo não corrige o espelho sozinho), aceito
conscientemente em troca do isolamento total.

## Infraestrutura de departamento e navegação

- **`app/page.tsx`** (escolha de departamento): hoje o card "Futebol de Base" é sempre
  desabilitado/"em breve", mesmo pra quem tem a permissão. Passa a ser um link normal (igual ao
  card do Futebol Profissional), condicionado a `departamentos_permitidos` incluir
  `"futebol_base"`.
- **`lib/auth/modulos-base.ts`** (novo arquivo, mesmo formato de `lib/auth/modulos.ts`): catálogo
  `MODULOS_BASE` com `ModuloBaseChave = "atletas" | "comissao_tecnica" | "staff_operacional" |
  "jogos" | "solicitacoes" | "estoque" | "financeiro"` (mesmas 7 chaves, mas um tipo próprio —
  não reaproveita `ModuloChave` porque os `prefixo` são diferentes: `/base/atletas`,
  `/base/jogos` etc.).
- **Migration nova**: coluna `modulos_base_permitidos text[]` em `perfis` (mesmo formato de
  `modulos_permitidos`, default = todos os 7). `lib/auth/role.ts` ganha
  `getModulosBasePermitidos()`, espelhando `getModulosPermitidos()`: master tem todos; quem não
  tem `"futebol_base"` em `departamentos_permitidos` não tem nenhum módulo de Base, independente
  do que estiver em `modulos_base_permitidos`.
- **`lib/supabase/middleware.ts`**: ganha a checagem equivalente pras rotas `/base/*` (mesmo
  padrão da checagem existente pra `/atletas`, `/jogos` etc., usando `moduloDaRota` de
  `modulos-base.ts` em vez de `modulos.ts`).
- **`app/usuarios/`**: a tela de cadastro/edição de usuário ganha uma segunda seção de checkboxes
  ("Módulos do Futebol de Base"), visível/editável só quando o departamento
  `"futebol_base"` está marcado pro usuário — mesmo padrão da seção atual de módulos do
  Profissional.
- **`app/base/page.tsx`**: vira a home de verdade do departamento (hoje é placeholder estático),
  no mesmo formato de `app/profissional/page.tsx` — cards dos módulos liberados, com contagens
  (quantidade de atletas, jogos cadastrados etc.).
- **`components/app-shell.tsx`**: `NAV_LINKS` hoje é uma lista fixa de 4 módulos do Profissional.
  Passa a existir uma segunda lista `NAV_LINKS_BASE` com os módulos de Base; o `AppShell` recebe
  um novo prop `departamento?: "futebol_profissional" | "futebol_base"` (default
  `"futebol_profissional"`) que decide qual lista usar e para onde aponta o link "Início". Todas
  as páginas novas de `/base/*` passam `departamento="futebol_base"` ao usar `AppShell`.

## Módulo: Atletas

- **Tabela nova `atletas_base`**: os mesmos campos de `atletas` hoje (nome completo, apelido, rg,
  cpf, data de nascimento, posição, número da camisa, pé dominante, telefone, cidade/UF natal,
  endereço atual, data início clube, empresário, status, data fim contrato, foto), mais uma coluna
  nova `categoria text not null check (categoria in ('sub20','sub17','sub15','sub14','sub13',
  'sub12','sub11'))`.
- **Tela inicial do módulo (`/base/atletas`)**: 7 cards, um por categoria, cada um mostrando a
  quantidade de atletas cadastrados ali. Clicar num card leva pra lista daquela categoria
  (`/base/atletas/[categoria]`) — mesma tabela/ações de sempre (cadastrar, editar, excluir,
  exportar), só filtrada pela categoria do card.
- **Cadastro/edição**: mesmo formulário de hoje (`atleta-form.tsx` adaptado), com a categoria
  pré-preenchida a partir de qual card a pessoa entrou (também pode trocar a categoria na edição,
  se o atleta subir de categoria).

## Módulo: Comissão Técnica

Mesmo padrão do Atletas: tabela nova `comissao_tecnica_base` com os campos de hoje mais
`categoria` (mesmo enum de 7 valores), tela inicial com 7 cards, lista por categoria dentro de
cada um.

## Módulo: Staff Operacional

- **Tabela nova `staff_operacional_base`**: mesmos campos de `staff_operacional`, sem `categoria`
  (lista única, compartilhada entre todas as categorias de base).
- **Autocadastro público também incluído** (ajuste feito durante o brainstorming — inicialmente
  seria só do Profissional): rota pública nova `/cadastro-staff-base`, com liga/desliga próprio
  (tabela nova `configuracoes_cadastro_staff_base`, mesmo formato de
  `configuracoes_cadastro_staff`) — completamente independente do toggle do Profissional. O
  formulário público escreve direto em `staff_operacional_base` via client de service-role, mesmo
  padrão de `app/cadastro-staff/actions.ts`. Dentro da tela de Staff Operacional (Base), o mesmo
  componente de liga/desliga e cópia do link (`components/cadastro-publico-toggle.tsx`,
  reaproveitado) aponta pra essa configuração nova.
- Catálogo de funções (`staff_funcoes_catalogo`) continua **compartilhado** entre os dois
  departamentos — são só nomes de função (ex: "Fisioterapeuta", "Roupeiro"), não há motivo pra
  duplicar.

## Módulo: Jogos

- **Tabela nova `jogos_base`**: mesmos campos de `jogos` hoje, mais `categoria` obrigatória (mesmo
  enum de 7 valores) — cada jogo pertence a exatamente uma categoria.
- **Sub-abas mantidas** (mesma tabela-satélite de hoje, cada uma com sufixo `_base` e apontando
  pra `jogos_base`): Checklist (`checklist_jogo_itens_base`), Convocação (`convocacoes_base` +
  `convocacao_atletas_base` + `convocacao_comissao_base` + `convocacao_staff_base`), Recibo de
  Pagamento (`recibos_jogo_base`), Presskit (mesmo gerador de PDF, sem tabela própria — como hoje),
  Ônibus (`onibus_lista_base` + `onibus_passageiros_base`), Rooming List (`rooming_list_base` +
  `rooming_list_quartos_base` + `rooming_list_ocupantes_base`), Programação + Pôsteres
  (`jogo_programacao_itens_base`, reaproveitando o mesmo código de geração de pôster parametrizado
  pelos dados do jogo de Base).
- **Sub-abas removidas**: Carga de Ingressos, Credenciamento (sem tabelas nem rotas
  correspondentes em Base).
- **Convocação filtrada por categoria**: ao convocar atletas/comissão técnica pra um jogo de Base,
  a lista de opções mostra só quem tem a mesma `categoria` do jogo (ex: jogo do Sub17 só deixa
  convocar atletas e comissão do Sub17). Staff (lista única, sem categoria) aparece inteiro pra
  qualquer jogo.

## Módulo: Financeiro

- **Tabela nova `gastos_jogo_base`**, ligada a `jogos_base` (mesmos campos de `gastos_jogo`).
- Catálogo `categorias_gasto` continua compartilhado (são só nomes genéricos como "Hospedagem",
  "Transporte" — não há motivo pra duplicar).
- **`configuracoes_financeiro_base`** própria (assinaturas usadas no PDF), independente da do
  Profissional — os responsáveis por assinar podem ser pessoas diferentes.
- **Painel geral novo** em `/base/financeiro`, mesmo formato de `/financeiro` hoje (soma todos os
  jogos de Base, por categoria de gasto).

## Módulo: Estoque

- **Tabelas novas**: `estoque_itens_base`, `estoque_entradas_base` + `estoque_entrada_itens_base`,
  `estoque_saidas_base` + `estoque_saida_itens_base` — mesmos campos de hoje. Sem coluna
  `categoria` (ao contrário do Estoque do Profissional, que tem Esportivo/Médico) — o Estoque do
  Base só existe pra material esportivo, então não precisa da dimensão de categoria; a rota fica
  fixa em `/base/estoque` (sem o segmento dinâmico `[categoria]` que o Profissional tem).

## Módulo: Solicitações

**Tabelas novas** `solicitacoes_base` + `solicitacao_itens_base`, mesmos campos de hoje, lista
única (sem categoria) em `/base/solicitacoes`.

## Avisos

Hoje "Avisos" (`/avisos`) não é uma tabela própria — é uma tela que junta automaticamente Tarefas
em aberto/com prazo perto e itens de Checklist de jogos vencidos (ver `app/avisos/page.tsx`). Não
haverá uma versão desse painel pro Futebol de Base neste momento — quem só tem acesso ao Futebol
de Base não vê o link de Avisos na navegação. Tarefas continua sendo uma lista única, compartilhada
entre os dois departamentos, sem mudança.

## Fases de implementação

Esta spec cobre o desenho completo dos 7 módulos, mas a construção é dividida em fases — cada fase
é entregue e testada antes de começar a próxima:

1. **Infraestrutura de departamento + Atletas** — navegação, permissões (`modulos_base_permitidos`,
   `MODULOS_BASE`), home do departamento, módulo Atletas completo com os 7 cards de categoria.
2. **Comissão Técnica + Staff Operacional** — incluindo o autocadastro público do Staff.
3. **Jogos + Financeiro** — o maior bloco (Jogos tem 7 sub-abas mantidas).
4. **Estoque + Solicitações**.

## Testes / verificação

- Um usuário com só `"futebol_base"` em `departamentos_permitidos` (sem `"futebol_profissional"`)
  consegue entrar em `/base` e nos módulos liberados, mas não consegue acessar nenhuma rota do
  Profissional (`/atletas`, `/jogos` etc. redirecionam).
- Um usuário com os dois departamentos liberados vê as duas opções na tela inicial e navega entre
  os dois sem misturar dado (um atleta cadastrado em `/base/atletas/sub17` não aparece em
  `/atletas`, e vice-versa).
- Cadastrar um atleta em cada uma das 7 categorias e confirmar que o card mostra a contagem certa.
- Cadastrar um jogo do Sub15 e confirmar que a tela de Convocação só oferece atletas/comissão do
  Sub15 pra escolher, não de outras categorias.
- Ligar o autocadastro público do Staff Operacional (Base) e confirmar que preencher o formulário
  em `/cadastro-staff-base` cria a linha em `staff_operacional_base` (não em `staff_operacional`),
  e que ligar/desligar esse toggle não afeta o do Profissional.
- Confirmar que Jogos (Base) não tem as abas de Carga de Ingressos nem Credenciamento, e que
  Estoque (Base) só mostra a categoria Esportivo.
- Confirmar que o link de Avisos não aparece pra quem só tem acesso ao Futebol de Base.
