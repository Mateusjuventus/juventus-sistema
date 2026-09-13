# Acesso por categoria vinculado à Comissão Técnica

## Contexto

Hoje `/usuarios` cria contas com papel (`master`/`regular`/`treinador`) e um conjunto de permissões
soltas (departamentos, módulos do Profissional, módulos do Base, categorias de Tarefas visíveis,
categorias de Estoque). Nenhuma dessas colunas segmenta o **Futebol de Base por categoria de
idade** para um usuário `regular` — só o papel `treinador` (mini-app separado, `/treinador/*`, usado
hoje só na Captação) tem uma lista de categorias (`categorias_treinador`).

O Mateus tem hoje dois Supervisores de Futebol de Base: um responsável pelas categorias Sub-15 ao
Sub-20, outro pelas Sub-11 a Sub-14. Ele quer que, ao logar no sistema normal do Base (mesmo
`AppShell`/telas que qualquer usuário de Base já usa hoje — não o mini-app do Treinador), cada um
veja e atue só nas categorias que lhe cabem. Ele também quer que, ao cadastrar essa pessoa em
`/usuarios`, não precise redigitar nome/função — poder puxar isso do cadastro que ela já tem na
Comissão Técnica (`comissao_tecnica`/`comissao_tecnica_base`) — e que esse vínculo fique "vivo": se
a função ou as categorias da pessoa mudarem na Comissão Técnica, o acesso dela se atualiza sozinho,
sem precisar editar o cadastro de usuário de novo. Ele confirmou também que isso deve valer pra
assinatura digital: a função usada pra assinar (`Assinado digitalmente por [nome], [cargo]`) deve
vir desse mesmo vínculo quando ele existir, em vez do texto separado que a pessoa preenche hoje em
Minha Conta.

Toda a exploração de código já foi feita nesta sessão (arquivos, colunas e funções exatas abaixo) —
não é preciso reexplorar antes de planejar a implementação.

## O que já existe (não muda)

- `perfis`: `role` (`master`/`regular`/`treinador`), `modulos_permitidos`, `modulos_base_permitidos`,
  `departamentos_permitidos`, `tarefas_categorias_visiveis`, `estoque_categorias_permitidas`,
  `categorias_treinador`, `nome`/`cargo` (autoeditáveis em Minha Conta, usados hoje na assinatura
  digital), `assinatura_path` (assinatura desenhada/anexada).
- `lib/auth/role.ts`: uma função `get*Permitidos`/`isMaster` por coluna, todas lendo de
  `buscarPerfilPermissoes()` (memoizado por request). Convenção existente: coluna `not null default
  <lista completa>` — quem nunca teve a coluna tocada continua vendo tudo; nada de "vazio = tudo"
  (esse padrão é só do `categorias_treinador`, que é um papel novo sem esse risco de regressão).
- `categorias_treinador`/`getCategoriasTreinador`/o mini-app `/treinador`: continuam exatamente como
  estão, sem nenhuma mudança — é um mecanismo separado, pra um papel separado.
- `comissao_tecnica` (Profissional) e `comissao_tecnica_base` (Base): cadastros de pessoas físicas
  já existentes, com `nome_completo`, `funcao` (texto livre, com sugestões — "Supervisor" é uma
  delas), e (só a de Base) `categorias text[]`. Hoje totalmente desconectados de `perfis`/login.
- `lib/assinaturas/actions.ts` (`assinarDocumento`, `autoAssinarComoCreator`): leem `perfis.nome`/
  `perfis.cargo` na hora de assinar e gravam como `nome_no_momento`/`cargo_no_momento` — uma foto
  daquele instante, que nunca muda depois (mesmo princípio se mantém, ver abaixo).
- Categoria como dimensão de dado: só `atletas_base`, `comissao_tecnica_base` e `jogos_base` têm
  coluna `categoria`. Solicitações e Estoque do Base são listas únicas, sem esse recorte — **ficam
  de fora** deste recurso, confirmado com o Mateus.

## O que muda

### 1. Vínculo de `perfis` com a Comissão Técnica

Duas colunas novas, nulas até alguém vincular:

- `perfis.comissao_tecnica_id` → `references public.comissao_tecnica(id) on delete set null`
  (Profissional).
- `perfis.comissao_tecnica_base_id` → `references public.comissao_tecnica_base(id) on delete set
  null` (Base).

Uma conta normalmente vincula a **no máximo um** desses dois (a pessoa costuma ser de um
departamento só); nada impede tecnicamente os dois estarem preenchidos ao mesmo tempo, mas isso não
é uma configuração que a tela vai incentivar — ver seção 3.

Nova coluna de fallback manual, mesma convenção de sempre (`not null default <lista completa>`):

- `perfis.categorias_base_permitidas text[] not null default array['sub20','sub17','sub15','sub14','sub13','sub12','sub11']`.

### 2. Resolução de categorias e de nome/função — sempre "ao vivo"

Nova função em `lib/auth/role.ts`, `getCategoriasBasePermitidas(supabase)`, espelhando o estilo das
demais `get*Permitidos`:

1. Sem perfil (deslogado) → `[]`.
2. `role === "master"` → todas as categorias.
3. Sem `"futebol_base"` em `departamentos_permitidos` → `[]` (mesma regra de
   `getModulosBasePermitidos`).
4. Com `comissao_tecnica_base_id` vinculado → as categorias **daquele registro**, lidas na hora
   (join, nunca uma cópia salva em `perfis`) — é isso que faz o vínculo "se atualizar sozinho".
5. Sem vínculo → `categorias_base_permitidas` (a lista marcada manualmente no cadastro).

`buscarPerfilPermissoes()` passa a trazer também `comissao_tecnica_base_id` e, via embed do
PostgREST, `comissao_tecnica_base(categorias, nome_completo, funcao)` e
`comissao_tecnica(nome_completo, funcao)` — uma query só, sem N+1.

Mesmo princípio para nome/função ao assinar: uma função nova,
`resolverNomeCargoParaAssinatura(perfil)` (usada por `assinarDocumento` e
`autoAssinarComoCreator` em `lib/assinaturas/actions.ts` no lugar de ler `perfil.nome`/
`perfil.cargo` direto):

1. Com `comissao_tecnica_base_id` OU `comissao_tecnica_id` vinculado → `nome_completo`/`funcao`
   daquele registro (Base tem prioridade no raríssimo caso de estarem os dois preenchidos).
2. Sem nenhum vínculo → `perfis.nome`/`perfis.cargo`, exatamente como hoje.

Uma vez assinado um documento, `nome_no_momento`/`cargo_no_momento` continuam sendo uma cópia fixa
daquele instante — mudar a função na Comissão Técnica depois não altera documentos já assinados,
só as próximas assinaturas.

### 3. Cadastro de usuário (`/usuarios`)

No formulário de criar/editar usuário (`usuario-form.tsx`), para cada departamento marcado em
"Departamentos liberados", aparece um campo novo — um `<select>` "Vincular a alguém da Comissão
Técnica" (mesmo componente/estilo do `<SelectField>` já usado hoje pra "Usuário que assina
digitalmente"), listando as pessoas cadastradas na Comissão Técnica daquele departamento (rótulo:
nome + função). Primeira opção sempre "— Não vincular (preencher manualmente) —".

- **Vinculado**: nome e função aparecem na tela só como referência (não são mais campos de texto
  editáveis ali); se for vínculo com o Base, a lista de categorias também aparece — como texto
  informativo ("Categorias: Sub-11, Sub-12, Sub-13, Sub-14"), não como checkboxes, porque vem do
  registro vinculado. Trocar/remover o vínculo é só escolher outra pessoa ou voltar pra "Não
  vincular".
- **Não vinculado**: continua exatamente como hoje — sem nome/função na tela de usuário (isso
  continua sendo preenchido em Minha Conta, self-service); se o departamento marcado for o Base,
  aparecem os checkboxes de categoria (mesmo componente visual que `categorias_treinador` já usa
  pro Treinador), controlando `categorias_base_permitidas`.

Nenhuma mudança na criação da conta em si (`auth.admin.createUser`) nem nas demais permissões
(módulos, departamentos, Tarefas, Estoque) — isso é aditivo.

### 4. Onde o filtro por categoria passa a valer

- **Atletas da Base**: a tela de seleção de categoria (`app/base/atletas/page.tsx`) só lista os
  cartões das categorias permitidas; a rota `app/base/atletas/[categoria]/page.tsx` passa a
  verificar `getCategoriasBasePermitidas` e redireciona (mesmo padrão de guarda já usado em
  `ehCategoriaBaseValida`) se a pessoa tentar acessar uma categoria fora da lista dela — vale pra
  listagem, ficha, classificação G1/G2/G3 e Relatório de Dispensa, que já vivem dentro dessa rota.
- **Jogos da Base**: `app/base/jogos/page.tsx` só lista jogos cujo `categoria` esteja entre as
  permitidas; abrir um jogo fora da lista (`app/base/jogos/[id]/*` — Financeiro, Convocação,
  Programação, tudo que vive dentro do jogo) é bloqueado do mesmo jeito.
- **Master** sempre vê tudo, sem exceção (mesma regra de todas as outras permissões).
- Solicitações e Estoque do Base **não mudam** — continuam sem recorte por categoria, como
  confirmado.

### 5. Minha Conta

Quando a conta logada tem `comissao_tecnica_id`/`comissao_tecnica_base_id` vinculado, o bloco de
nome/cargo em `/minha-conta` deixa de ser um formulário editável e passa a mostrar só o valor atual
somente leitura, com uma nota ("Vinculado ao cadastro da Comissão Técnica — pra alterar, atualize o
cadastro lá"). Sem vínculo, continua exatamente como hoje (campo de texto, autoeditável).

## Fora de escopo

- Solicitações e Estoque do Futebol de Base continuam sem filtro por categoria.
- O papel `treinador` e `categorias_treinador` não mudam em nada.
- Vínculo com Comissão Técnica **do Profissional** só afeta nome/função (não existe conceito de
  categoria no Profissional) — não introduz nenhum filtro de acesso novo lá.
- Não é criado nenhum papel novo (`supervisor` etc.) — continua sendo um usuário `regular` (ou
  `master`) com Base liberado, só que agora com um recorte de categoria em cima.
- Configurações de assinatura (Encarregado, Departamento de Compras/Financeiro, Aprovador em
  `configuracoes_solicitacoes*`, assinaturas do Financeiro/Parecer) continuam vinculando um usuário
  só, sem noção de categoria — não fazem parte deste recurso.

## Verificação

- `npx tsc --noEmit`, `npx vitest run`, `npx eslint`, `npx next build` limpos.
- Testes novos/ajustados em `lib/auth/role.ts` (ou arquivo de teste correspondente) cobrindo
  `getCategoriasBasePermitidas`: master vê tudo; sem "futebol_base" liberado vê nada; vinculado à
  Comissão Técnica do Base usa as categorias do registro vinculado (e ignora
  `categorias_base_permitidas` mesmo que preenchida); sem vínculo usa `categorias_base_permitidas`.
- Testes cobrindo `resolverNomeCargoParaAssinatura`: com vínculo (Base e Profissional) usa
  nome/função do registro vinculado; sem vínculo usa `perfis.nome`/`cargo`; os dois vinculados ao
  mesmo tempo (edge case) prioriza o do Base.
- Roteiro manual (dados de teste — sandbox não conecta no Supabase real):
  - Cadastrar um usuário vinculando a um registro da Comissão Técnica do Base com categorias
    Sub-11 a Sub-14: ele só vê essas categorias em Atletas e em Jogos da Base.
  - Editar a função/categorias desse mesmo registro na Comissão Técnica: o acesso do usuário já
    reflete sem tocar no cadastro dele.
  - Esse mesmo usuário assina um documento: a função usada na assinatura é a da Comissão Técnica,
    não a que estava (ou não) preenchida em Minha Conta.
  - Um usuário sem vínculo continua com o comportamento de hoje: preenche nome/cargo em Minha
    Conta, categorias de Base marcadas manualmente (ou todas, se nunca mexeram).
  - Master continua vendo tudo, em qualquer categoria.
- Colar o SQL da migração completo no chat pro Mateus rodar no SQL Editor do Supabase antes de
  testar.
- Depois do `next build` limpo: sincronizar os arquivos alterados pra `repo-atual` via device
  bridge, commit local, e passar o comando de `git push` pro Mateus rodar do lado dele — só com
  autorização explícita dele no chat, nunca a partir de um aviso automático do stop-hook.
