# Assinatura 1 do Financeiro de jogo (Base) por Supervisor da categoria

## Contexto

Hoje a Assinatura 1 ("Supervisor de Futebol de Base") do Orçamento Previsto e do Relatório de
Despesas de cada jogo da Base (`/base/jogos/[id]/financeiro`, bloco `BlocoAssinaturaDigital` com
`tipoDocumento="orcamento_jogo"`/`"despesas_jogo"`) é configurada uma vez só, pra toda a Base, em
`/base/financeiro/configuracoes`: um nome, um cargo e (opcional) **um** usuário vinculado
(`configuracoes_financeiro_base.assinatura1_usuario_id`). `podeAssinarPapel` (`lib/assinaturas/
config.ts`) só libera esse papel pra esse usuário vinculado — sem vínculo, qualquer master assina.

O Mateus tem dois Supervisores de Futebol de Base, cada um responsável por um grupo de categorias
(Gustavo e Italo — o mesmo recorte por categoria já usado em `comissao_tecnica_base`, ver spec
`2026-09-13-acesso-por-categoria-comissao-tecnica-design.md`). Hoje só o Gustavo está vinculado à
Assinatura 1, então ele consegue assinar o Financeiro de qualquer jogo da Base — inclusive os das
categorias do Italo — e o Italo não consegue assinar nenhum, nem os jogos das categorias que são
dele. Relato do Mateus: "o Italo fez a solicitação [lançou o gasto] mas não aparece pra ele [assinar]
[...] o Gustavo assina os relatórios que são devidos e feitos no login dele. E o Italo precisa
assinar do dele."

A spec de 2026-09-13 já havia deixado isso de fora de propósito ("Configurações de assinatura [...]
assinaturas do Financeiro/Parecer continuam vinculando um usuário só, sem noção de categoria — não
fazem parte deste recurso"). Esta spec volta nesse ponto especificamente pro Financeiro da Base.

## O que já existe (não muda)

- `comissao_tecnica_base`: `nome_completo`, `funcao` (texto livre — "Supervisor" é uma das funções
  cadastradas hoje), `categorias text[]` (as categorias de idade que aquela pessoa cobre).
- `perfis.comissao_tecnica_base_id` → vincula o login daquela pessoa ao registro dela na Comissão
  Técnica da Base (ver spec de 2026-09-13). Hoje já decide o que ela vê (atletas, jogos) por
  categoria via `getCategoriasBasePermitidas` (`lib/auth/role.ts`).
- `jogos_base.categoria`: toda partida já pertence a uma categoria só.
- `configuracoes_financeiro_base`: `assinatura1_nome`/`assinatura1_cargo`,
  `assinatura2_nome`/`assinatura2_cargo`/`assinatura2_usuario_id` — usados em dois lugares
  diferentes:
  - No PDF do **Relatório Geral da Prestação de Contas** (`/base/financeiro/pdf-geral`, agregado de
    toda a Base, sem conceito de categoria) — nome/cargo impressos direto, sem assinatura digital.
    **Não muda nada aqui.**
  - No bloco de assinatura digital do Orçamento/Despesas de cada jogo (`papeisAssinaturaFinanceiro`
    monta o rótulo do papel a partir do cargo configurado).
- `podeAssinarPapel` (`lib/assinaturas/config.ts`) continua exatamente como está, e continua sendo
  usado para a **Assinatura 2** (Coordenador) — essa não muda: um usuário vinculado só (ou "qualquer
  master", se não vincular ninguém), valendo pra toda a Base, como hoje.
- `BlocoAssinaturaDigital`, `buscarAssinaturas`, `assinarDocumento`, `assinaturas_documento`: o
  mecanismo de assinatura em si (pendente/assinado, nome e cargo "no momento") não muda — só muda
  **quem tem permissão de clicar em assinar** o papel `assinatura1`.

## O que muda

### Elegibilidade da Assinatura 1 passa a depender da categoria do jogo

Nova função em `lib/auth/role.ts`, `ehSupervisorDaCategoriaBase(supabase, categoria: string):
Promise<boolean>`, espelhando o estilo de `getCategoriasBasePermitidas`:

1. `master` → `true` (master sempre pode assinar, mesmo com um Supervisor certo já vinculado —
   serve de reserva se o Supervisor estiver de férias, afastado etc.).
2. Sem perfil logado → `false`.
3. Sem `perfis.comissao_tecnica_base_id` vinculado → `false`.
4. Com vínculo: busca `comissao_tecnica_base.funcao` e `.categorias` daquele registro (ao vivo, não
   copiado). `true` somente se `funcao` contém "supervisor" (case-insensitive — cobre "Supervisor",
   "Supervisor de Futebol de Base" etc.) **e** `categoria` está em `categorias`.

Em `app/base/jogos/[id]/financeiro/page.tsx`, o cálculo de `papeisQuePossoAssinar` passa a resolver
cada papel com a regra certa:

- `assinatura1`: `ehSupervisorDaCategoriaBase(supabase, jogo.categoria)` (a categoria vem do próprio
  `jogo` já carregado por `verificarAcessoJogoBase`).
- `assinatura2`: continua usando `podeAssinarPapel` exatamente como hoje, sem mudança.

Nenhuma categoria com Supervisor configurado ainda → ninguém (fora o master) assina a Assinatura 1
dos jogos dela, até alguém cadastrar/vincular a função certa na Comissão Técnica da Base — não tem
fallback de "qualquer master" pra usuário comum aqui (diferente da Assinatura 2), porque o ponto
inteiro é não deixar o Supervisor errado assinar o jogo de outra categoria.

### Tela `/base/financeiro/configuracoes`

A seção "Assinatura 1" perde o campo "Usuário que assina digitalmente" (não existe mais um usuário
vinculado configurado aqui — quem pode assinar vem da Comissão Técnica da Base, não desta tela).
Nome e Cargo continuam exatamente como estão (usados no rótulo do papel e no PDF do Relatório
Geral). A seção "Assinatura 2" não muda em nada.

Texto de apoio da tela é ajustado pra deixar claro que a Assinatura 1 agora depende do cadastro da
Comissão Técnica: "Quem pode assinar como Assinatura 1 em cada jogo é definido pela categoria da
pessoa na Comissão Técnica da Base (função 'Supervisor' + categorias cadastradas lá), não aqui —
edite em [link pra Comissão Técnica da Base]."

### Migração

`configuracoes_financeiro_base.assinatura1_usuario_id` fica sem uso (nenhum código lê mais essa
coluna). Dropar a coluna na mesma migração, já que não há mais tela que a preencha — evita um campo
morto no banco. SQL completo vai ser colado no chat pro Mateus rodar no SQL Editor do Supabase antes
de testar, como de costume.

## Casos de borda

- Pessoa vinculada a mais de uma categoria (ex: Sub-11 a Sub-14 na mesma linha da Comissão Técnica):
  elegível pra assinar a Assinatura 1 de jogos de qualquer uma dessas categorias.
- Duas pessoas com função "Supervisor" cadastradas pra categorias que se sobrepõem (configuração
  incomum, mas possível): as duas ficam elegíveis pro mesmo jogo — não é um erro, é só uma
  consequência de como a Comissão Técnica foi cadastrada.
- Alguém com função "Supervisor" mas **sem** a categoria daquele jogo na lista dela: não assina esse
  jogo (mesmo sendo Supervisor de outras categorias).
- Pessoa com acesso à categoria mas função diferente de Supervisor (treinador, fisioterapeuta
  etc.): nunca fica elegível pra Assinatura 1, não importa a categoria.
- Trocar a função ou as categorias de alguém na Comissão Técnica da Base muda quem pode assinar os
  **próximos** jogos na hora — documentos já assinados não mudam (`nome_no_momento`/
  `cargo_no_momento` continuam sendo uma foto fixa de quando foi assinado, como já é hoje).

## Fora de escopo

- Futebol Profissional não muda em nada — continua com usuário único vinculado por papel, como hoje
  (confirmado com o Mateus).
- Relatório Geral da Prestação de Contas (agregado da Base) não ganha assinatura digital nem
  vínculo por categoria — continua um nome/cargo fixo impresso, configurado nesta mesma tela.
- Assinatura 2 (Coordenador) não muda — continua um papel único pra toda a Base.
- Nenhuma mudança em Solicitações, Parecer Final ou qualquer outro tipo de documento assinável.
- Não cria nenhum papel novo de usuário (`supervisor` etc.) — continua sendo resolvido a partir do
  `funcao` texto livre já existente na Comissão Técnica da Base.

## Verificação

- `npx tsc --noEmit`, `npx vitest run`, `npx eslint`, `npx next build` limpos.
- Teste novo cobrindo `ehSupervisorDaCategoriaBase`: master sempre `true`; sem vínculo `false`; com
  vínculo mas função sem "supervisor" `false`; com vínculo e função "Supervisor" mas categoria fora
  da lista `false`; com vínculo, função "Supervisor" e categoria na lista `true`; comparação
  case-insensitive da função.
- Roteiro manual (sandbox não conecta no Supabase real):
  - Gustavo (Supervisor, Sub-15 a Sub-20) abre o Financeiro de um jogo Sub-17: vê o botão de
    assinar a Assinatura 1. Abre o de um jogo Sub-12: não vê.
  - Italo (Supervisor, Sub-11 a Sub-14) abre o Financeiro de um jogo Sub-12: vê o botão de assinar
    a Assinatura 1 (hoje não via). Abre o de um jogo Sub-17: não vê.
  - Master abre o Financeiro de qualquer jogo: sempre vê o botão de assinar a Assinatura 1,
    independente da categoria.
  - Tela `/base/financeiro/configuracoes`: Assinatura 1 sem o campo de usuário vinculado;
    Assinatura 2 inalterada.
  - PDF do Relatório Geral da Base continua imprimindo o nome/cargo configurado, sem mudança.
- Depois do `next build` limpo: sincronizar os arquivos alterados pra `repo-atual` via device
  bridge, commit local, e passar o comando de `git push` pro Mateus rodar do lado dele — só com
  autorização explícita dele no chat.
