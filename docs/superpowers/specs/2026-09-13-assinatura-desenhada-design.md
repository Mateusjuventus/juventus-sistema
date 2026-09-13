# Assinatura desenhada/anexada, salva por conta

Data: 13/09/2026

## Contexto

Hoje "assinar" um documento (`lib/assinaturas/actions.ts`, `assinarDocumento`) é digitar a senha
de novo pra confirmar — o sistema reautentica a pessoa e grava em `assinaturas_documento` só um
registro de texto: nome, cargo e data/hora (`nome_no_momento`, `cargo_no_momento`, `assinado_em`).
Não existe imagem, traço desenhado ou arquivo nenhum envolvido, em nenhum dos 5 tipos de documento
que usam esse mecanismo: Relatório de Dispensa (`dispensa_base`), Parecer de Captação
(`parecer_captacao_base`), Orçamento e Despesas de jogo (`orcamento_jogo`/`despesas_jogo`) e
Solicitações Profissional/Base (`solicitacao`). Tela (`components/bloco-assinatura-digital.tsx`) e
PDF (`lib/pdf/logistica-shared.tsx`) mostram essa mesma informação em texto: "Assinado digitalmente
por {nome}, {cargo}, em {data}."

Além do texto puro, existe um segundo caminho que nunca pede nada: `autoAssinarComoCreator`, chamado
automaticamente quando quem cria o documento também é o assinante de um dos papéis (ex.: você como
Solicitante ao criar uma Solicitação, o Treinador ao enviar o Relatório de Dispensa) — grava o mesmo
registro de texto na hora, sem qualquer confirmação.

O cliente não quer mais esse modelo: quer uma assinatura de verdade — desenhada na tela ou uma
imagem anexada — salva na conta de cada pessoa e reaproveitada sempre que ela precisar assinar
qualquer coisa no sistema. E não quer mais nenhum documento saindo assinado só com nome/cargo por
escrito — nem os que hoje assinam sozinhos automaticamente.

## Decisão

### 1. Minha Conta ganha "Minha assinatura"

Nova seção em `/minha-conta` (ao lado do que já existe: nome/cargo, trocar senha). A pessoa escolhe
entre desenhar na tela (dedo ou mouse, um quadro tipo canvas) ou anexar uma imagem já pronta da
própria assinatura. Só uma fica ativa por vez; pode trocar quando quiser, quantas vezes quiser.
Nenhum tratamento é aplicado à imagem (sem remover fundo, sem recorte automático) — sobe como está.

### 2. Assinar manualmente não pede mais senha

Quem tem permissão pra assinar um papel (`podeAssinarPapel`, já existente e sem mudança — Encarregado
do Departamento, segundo assinante do Financeiro, signatários configurados do Parecer etc.) clica em
"Assinar" e a assinatura salva da própria conta é aplicada na hora — sem senha, sem checkbox de
confirmação. A trava de "quem pode clicar" já garante que só a pessoa certa consegue; não precisa de
mais nenhuma etapa.

Quem tenta assinar manualmente sem ter cadastrado a própria assinatura em Minha Conta é bloqueado —
a ação recusa e devolve uma mensagem direcionando pra lá.

### 3. Quem cria o documento precisa ter assinatura cadastrada antes de conseguir criar

Isso vale pros papéis que hoje usam `autoAssinarComoCreator` — assinam sozinhos, automaticamente, no
momento em que o documento é criado, sem passar pelo botão "Assinar" (hoje isso é o Solicitante ao
criar uma Solicitação, e o Treinador ao enviar o Relatório de Dispensa; outros documentos, como
Financeiro e Parecer de Captação, já são cobertos pela regra 2 porque todo mundo ali assina
manualmente).

Pra esses papéis, a própria ação de criar o documento passa a exigir assinatura cadastrada
**antes** de deixar criar: sem isso, bloqueia e direciona pra Minha Conta — vale pra qualquer
conta, inclusive Master. Isso inclui "Duplicar solicitação", que hoje também assina
automaticamente a cópia como se fosse uma criação nova (`duplicarSolicitacao` chama o mesmo
`autoAssinarComoCreator`). Depois de cadastrada uma vez, a criação continua exatamente como hoje —
automática, sem nenhum passo a mais — só que a assinatura gravada passa a incluir a imagem de
verdade em vez de só nome/cargo por texto.

Resultado: nenhum documento, de nenhum dos 5 tipos, fica "assinado" só com texto escrito daqui pra
frente — sempre a imagem de verdade, seja assinando na hora de criar ou clicando em "Assinar"
depois.

### 4. Trocar a assinatura salva não muda documentos já assinados

Cada assinatura feita (manual ou automática) grava, junto com o nome e cargo do momento, qual
imagem estava ativa naquela hora — o mesmo princípio que `nome_no_momento`/`cargo_no_momento` já
seguem hoje. Redesenhar ou trocar a assinatura em Minha Conta só vale pra documentos assinados dali
pra frente; os que já foram assinados continuam mostrando a imagem de quando foram assinados.

### 5. Onde e como aparece

Na tela (`BlocoAssinaturaDigital`) e no PDF (`lib/pdf/logistica-shared.tsx`), um papel assinado passa
a mostrar a imagem da assinatura em cima, com nome, cargo e data/hora embaixo — igual um documento
físico de verdade, mantendo a mesma informação de rastreabilidade que já existe hoje, só acrescentando
a imagem.

Documentos assinados **antes** desta mudança não têm imagem salva — continuam mostrando só o texto
de sempre ("Assinado digitalmente por {nome}, {cargo}, em {data}."), sem nada retroativo.

### 6. Vale para os 5 tipos de documento

Relatório de Dispensa, Parecer de Captação, Orçamento de jogo, Despesas de jogo e Solicitações
(Profissional e Base) — é um mecanismo compartilhado (`lib/assinaturas/*`,
`components/bloco-assinatura-digital.tsx`), muda uma vez e passa a valer em todos os pontos que já
usam esse mecanismo hoje.

## Fora de escopo

- Tratamento de imagem da assinatura anexada (remover fundo, recortar, ajustar contraste) — sobe
  como o arquivo veio.
- Validade jurídica ou certificação digital (ICP-Brasil, carimbo do tempo oficial etc.) — continua
  sendo uma assinatura de conveniência dentro do sistema, não uma assinatura digital certificada.
- Qualquer mudança em quem pode assinar cada papel — regras de `podeAssinarPapel`, configuração do
  Encarregado do Departamento, dos assinantes do Financeiro ou do Parecer — isso já está definido e
  não muda.
- Mudanças em `/usuarios` ou no restante de Minha Conta (nome, cargo, trocar senha).

## Implementação (visão geral)

- **Banco**: `perfis` ganha uma coluna com o caminho (Storage) da assinatura **atual** de cada
  conta; `assinaturas_documento` ganha uma coluna com o caminho que valia **no momento** de cada
  assinatura (snapshot, copiado da coluna de `perfis` na hora de assinar — mesmo princípio de
  `nome_no_momento`/`cargo_no_momento`).
- **Armazenamento**: bucket privado (padrão já usado em `lib/supabase/storage.ts` — signed URL,
  nunca público), com um caminho novo a cada vez que a pessoa salva uma assinatura (nunca
  sobrescreve o arquivo anterior) — é isso que permite o snapshot da regra 4 continuar funcionando
  mesmo depois de trocar a assinatura.
- **Minha Conta**: novo componente client-side pra desenhar (canvas) — precisa de uma biblioteca
  pequena de captura de traço em canvas, hoje inexistente no projeto — e um campo de anexar imagem;
  os dois caem no mesmo fluxo de salvar.
- **`lib/assinaturas/actions.ts`**: `assinarDocumento` perde a reautenticação por senha; passa a
  checar se a conta tem assinatura cadastrada (senão recusa com mensagem direcionando pra Minha
  Conta) e grava o snapshot do caminho da imagem. `autoAssinarComoCreator` grava o mesmo snapshot
  quando existe (como segunda trava, além do bloqueio na tela de criar da regra 3).
- **Ações de criar/duplicar** dos documentos cujo papel assina automaticamente (Nova Solicitação e
  Duplicar Solicitação — Profissional e Base — e o fluxo do Treinador de enviar o Relatório de
  Dispensa): checam se a conta logada tem assinatura cadastrada antes de deixar prosseguir; sem
  isso, recusam e direcionam pra Minha Conta.
- **`components/bloco-assinatura-digital.tsx`** e os blocos de assinatura em PDF
  (`lib/pdf/logistica-shared.tsx`, `lib/pdf/assinaturas.ts`, `lib/pdf/parecer-final-document.tsx`):
  passam a exibir a imagem (via signed URL / `<Image>` do `@react-pdf/renderer`) acima do texto,
  quando o registro tiver um caminho de assinatura salvo; sem caminho (assinaturas antigas),
  continuam mostrando só o texto de hoje.
- Migração SQL: as duas colunas novas (colar o SQL completo no chat pro Mateus rodar no SQL Editor
  do Supabase, como sempre).

## Verificação

- Cadastrar assinatura em Minha Conta (desenhando e anexando os dois, em momentos diferentes) e
  trocar depois.
- Tentar criar uma Solicitação (ou enviar um Relatório de Dispensa) sem ter assinatura cadastrada:
  bloqueia e direciona pra Minha Conta; depois de cadastrar, consegue criar normalmente e o
  documento já nasce assinado com a imagem.
- Tentar assinar manualmente (Encarregado, Financeiro, Parecer) sem assinatura cadastrada: mesmo
  bloqueio.
- Assinar com assinatura cadastrada: aplica na hora, sem senha, aparece a imagem na tela e no PDF.
- Trocar a assinatura depois de já ter assinado algo: o documento antigo continua com a imagem de
  antes; só as próximas assinaturas usam a nova.
- Um documento assinado antes desta mudança continua mostrando só o texto, sem imagem.
- `npx tsc --noEmit`, `npx vitest run`, `npx eslint` e `npx next build` limpos antes da entrega.
