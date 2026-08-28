# Assinatura digital interna + notificações — design

## Contexto

Mateus pediu pra poder assinar documentos dentro do próprio sistema, sem depender de serviço
externo (Clicksign, DocuSign etc.). O caso que disparou o pedido: o Relatório de Dispensa
(`/treinador/atletas/[id]/dispensa`) precisa da assinatura dele (Supervisor de Futebol) e do
treinador responsável — hoje o PDF só tem uma linha em branco pra assinar na mão. Junto, ele quer
ser avisado quando tiver algo esperando a assinatura dele: um aviso dentro do próprio sistema (sino
com contador de pendências) e um push de verdade no celular (aparece mesmo com o site fechado).

Levantamento feito antes de desenhar isso (ver conversa/histórico da sessão): o sistema usa Supabase
Auth com uma tabela `perfis` (`role`: `master`/`regular`/`treinador`), sem self-signup — um `master`
cria o login de cada pessoa. Não existe hoje nenhuma integração de e-mail/SMS/WhatsApp/push, nem
PWA (manifest/service worker). PDFs oficiais usam `@react-pdf/renderer` em Route Handlers, com um
bloco de assinatura reutilizável (`AssinaturasBlock`/`AssinaturasBlockDinamico` em
`lib/pdf/logistica-shared.tsx`) que hoje só desenha uma linha em branco — nenhum conceito de
assinatura eletrônica em nenhum lugar do schema.

## Escopo — o que entra nessa rodada

Peça genérica (tabela de assinaturas + componente de bloco de assinatura + notificação), reaproveitada
nestes documentos:

1. **Relatório de Dispensa** (`atletas_base`) — 2 assinantes: você (papel "Departamento de Futebol
   de Base") + o Treinador responsável (papel "Treinador / Responsável pela avaliação").
2. **Parecer Final de Avaliação** (Captação, `captacao_base`) — lista de assinantes configurável
   (hoje vem de `configuracoes_parecer_captacao_base`), mesmo princípio dos outros.
3. **Orçamento Previsto (Pré-Jogo)** e **Relatório de Despesas do jogo** (ambos ancorados em
   `jogos`/`jogos_base`) — 2 assinantes fixos, os mesmos já configurados hoje (você + Pedro Machado,
   ambos com login confirmado).
4. **Solicitações** (`solicitacoes`) — 2 assinantes: Solicitante (quem cria, automaticamente — a
   pessoa loga e preenche, então já é ela mesma) + Encarregado do Departamento (a definir por
   departamento, numa tela de configuração nova, do mesmo jeito que o financeiro configura os 2
   assinantes fixos hoje). Sem "Aprovador" — Mateus confirmou que não precisa desse papel.
5. **Operacional** (Termo de Retirada, Ficha de Estoque, Liberação de Veículos, Recibo) — assina
   digital só quem for usuário logado do sistema (ex.: o responsável pelo setor no Estoque); quem
   não tem login (quem retira material, testemunha, motorista) continua com linha em branco pra
   assinar na mão, do jeito que é hoje. Documento fica "meio digital, meio físico" nesses casos.

**Fora de escopo por agora** (decisão explícita do Mateus, não esquecimento):

- **Prestação de Contas, Despesas Avulsas (relatório e orçamento) e Relatório Geral da Base** — não
  têm hoje nenhum registro fixo por trás (são recalculados do zero a cada PDF gerado, sem tabela de
  "fechamento"/período). Assinar exigiria criar primeiro um conceito de "fechar" um período — fica
  pra uma rodada futura, se for do interesse.
- **Ordem de assinatura**: não importa — qualquer assinante pode assinar em qualquer ordem, o
  documento só fica "completo" quando todos os papéis esperados já assinaram.
- **Trava de edição após assinado**: documento continua editável normalmente depois de assinado por
  todo mundo. Se o conteúdo for editado depois, as assinaturas antigas continuam valendo, mesmo que
  fiquem desatualizadas em relação ao conteúdo novo — risco assumido explicitamente pelo Mateus, pra
  não travar o fluxo de correções.

## Modelo de dados

Nova tabela `assinaturas_documento`, genérica pra todos os tipos de documento acima:

```
id               uuid, pk
tipo_documento   text   -- 'dispensa_base' | 'parecer_captacao_base' | 'orcamento_jogo' |
                          -- 'despesas_jogo' | 'solicitacao' | 'termo_retirada' | 'estoque_ficha' |
                          -- 'veiculos_liberacao' | 'recibo'
documento_id     uuid   -- id da linha do documento (atletas_base.id, captacao_base.id, jogos.id, etc.)
papel            text   -- 'treinador' | 'departamento' | 'solicitante' | 'encarregado' | etc.
usuario_id       uuid   -- references auth.users, quem assinou
nome_no_momento  text   -- snapshot do nome no instante da assinatura (não muda se o perfil mudar depois)
cargo_no_momento text
assinado_em      timestamptz
```

`(tipo_documento, documento_id, papel)` é único — um papel só pode ter uma assinatura ativa por
documento (assinar de novo, se algum dia for preciso, substitui a anterior).

Cada tipo de documento "declara" em código (`lib/assinaturas/config.ts`, um arquivo novo) quais
papéis espera e como resolver quem PODE assinar cada papel — em alguns casos é fixo (financeiro:
sempre você + Pedro), em outros depende do registro (dispensa: o treinador responsável daquele
atleta específico), e no caso do Solicitante, é sempre quem criou a solicitação logado.

## Como assinar (fluxo)

Um componente novo, `<BlocoAssinaturaDigital>`, substitui a exibição da linha em branco na TELA (não
no PDF) de cada documento acima: mostra cada papel esperado, quem já assinou (nome + data/hora) e um
botão "Assinar" pra quem ainda falta, visível só pra quem tem permissão de assinar aquele papel
específico.

Assinar = revisar o documento na tela + confirmar a senha de novo (reautenticação, tipo abrir um
cofre — garante que foi a pessoa mesma, não alguém com o celular/computador dela aberto) — sem
desenhar assinatura na tela. Ao confirmar, grava a linha em `assinaturas_documento`.

No PDF, o bloco de assinatura (`AssinaturasBlock`/`AssinaturasBlockDinamico`, adaptados) passa a
mostrar, por papel: **"Assinado digitalmente por [nome], [cargo], em [DD/MM/AAAA HH:MM]"** se já
assinado, ou **"Pendente de assinatura"** se ainda não. Nos documentos Operacionais, papéis sem
assinante logado continuam com a linha em branco de sempre.

## Notificações

Dois canais, disparados no MESMO evento: assim que um documento é criado/enviado e um papel específico
fica esperando a assinatura de alguém, essa pessoa é notificada (não há notificação pros outros
eventos — "o outro já assinou", "ficou 100% completo" — por decisão do Mateus, só o pedido de
assinatura em si).

**Sino no sistema**: tabela nova `notificacoes` (`id`, `usuario_id`, `tipo`, `mensagem`, `link`,
`lida` boolean, `criado_em`). Um sino com contador de não-lidas no `AppShell` (visível em toda tela
logada), lista as pendências, marca como lida ao clicar (navega pro documento).

**Push no celular**: Web Push nativo do navegador (sem SaaS terceiro) — chave própria do sistema
(VAPID), manifest.json + service worker novos (o sistema fica "instalável"), pedido de permissão de
notificação na primeira vez que a pessoa loga (opt-in, pode recusar), inscrição guardada numa tabela
`push_subscriptions` (`usuario_id`, `endpoint`, `chaves`). No servidor, ao criar uma notificação,
dispara o push pra quem tiver inscrição salva, usando a biblioteca `web-push`.

**Limitação conhecida do iPhone**: push só chega se a pessoa tiver instalado o site na tela de início
("Adicionar à Tela de Início") — pelo Safari normal, sem instalar, o iOS não entrega push nenhum. Em
Android com Chrome funciona direto, só aceitando a permissão. O sino continua funcionando em
qualquer aparelho/navegador, independente disso — é a garantia mínima pra todo mundo.

## O que muda por documento (resumo)

| Documento | Papéis que assinam | Quem resolve o papel |
|---|---|---|
| Relatório de Dispensa | Departamento, Treinador | Departamento = você (fixo); Treinador = responsável daquele atleta |
| Parecer Final de Avaliação | lista configurável | vem de `configuracoes_parecer_captacao_base` |
| Orçamento Pré-Jogo / Despesas do jogo | 2 assinantes fixos | você + Pedro Machado (config atual do financeiro) |
| Solicitação | Solicitante, Encarregado | Solicitante = quem criou; Encarregado = config nova por departamento |
| Operacional (Termo/Estoque/Veículos/Recibo) | só quem tem login | resto continua em branco (papel físico) |

## Verificação

Como sempre: `npx tsc --noEmit`, `npx vitest run` e `npx next build` limpos antes de qualquer entrega.
Testes novos cobrindo: resolução de quem pode assinar cada papel por tipo de documento, bloqueio de
assinar papel já assinado por outra pessoa, geração do texto "assinado por/pendente" no PDF, e o
disparo de notificação (sino + registro de push) no momento certo.

## Atualização (28/08) — Fase 1 entregue: infra central + Relatório de Dispensa

Primeira fatia implementada e entregue, ponta a ponta:

- **Migration `0089_assinaturas_notificacoes_push.sql`**: as 3 tabelas do design, mais `perfis`
  ganhando `nome`/`cargo` (o sistema só tinha e-mail até aqui — sem nome, não tinha o que escrever
  no lugar da linha em branco de assinatura). Cada pessoa preenche o próprio nome/cargo uma vez em
  `/minha-conta` (autoatendimento, sem aprovação); sem isso preenchido, a ação de assinar recusa e
  explica onde ir preencher.
- **`lib/assinaturas/`**: `config.ts` (papéis esperados por tipo de documento — só `dispensa_base`
  por enquanto) e `actions.ts` (`assinarDocumento` com reautenticação de senha,
  `autoAssinarComoCreator` pra quem cria o documento assinar o próprio papel sem senha de novo,
  `buscarAssinaturas`).
- **`<BlocoAssinaturaDigital>`**: componente de tela reaproveitável, usado nas duas telas do
  Relatório de Dispensa (Treinador e cadastro interno).
- **`lib/notificacoes/`** + `<SinoNotificacoes>` no rodapé da sidebar do `AppShell` — só aparece nas
  telas com sidebar (não em `/treinador`, que é uma área à parte sem esse chrome).
- **Web Push**: `public/manifest.json` + `public/sw.js` + `<PushOptIn>` (convite discreto, some
  sozinho se não suportado/recusado) + `lib/push/` (envio via pacote `web-push`, com as 3 chaves
  VAPID em variável de ambiente). Ícones gerados a partir do escudo já existente
  (`public/brand/juventus-escudo.png`).
- **`AssinaturasBlock`/`AssinaturasBlockDinamico`** (`lib/pdf/logistica-shared.tsx`) ganharam um
  terceiro estado por assinatura, sem mudar nada pros documentos que ainda não foram ligados
  (Financeiro, Parecer Final continuam com a linha em branco de sempre): `assinadoDigitalmenteEm`
  mostra "Assinado digitalmente por [nome], [cargo], em [data]"; `pendente` mostra "Pendente de
  assinatura" no lugar da linha em branco.

**Decisão de implementação não coberta em detalhe no design original**: quem CRIA o documento
auto-assina o próprio papel na hora (sem pedir senha de novo — a pessoa já acabou de se autenticar
preenchendo e enviando o formulário). No Relatório de Dispensa: o Treinador que preenche pelo
`/treinador` auto-assina "treinador"; quem preenche pelo cadastro interno (`/base/atletas/...`)
auto-assina "departamento". O outro papel fica pendente, com aviso (sino + push) pra quem falta —
hoje resolvido como "todo usuário com papel master" (única forma de saber quem é "o Departamento"
sem criar uma config nova só pra isso).

Testes novos: `lib/assinaturas/config.test.ts` (papéis esperados da Dispensa) e
`lib/pdf/relatorio-dispensa-document.test.ts` (mapeamento de assinaturas salvas pro formato do
documento, incluindo os dois papéis pendentes). 311 testes no total, `tsc`/`build` limpos.

**Pendente do lado do Mateus**: rodar a migration SQL (mandada em separado no chat) e configurar 3
variáveis de ambiente novas (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` —
já geradas, valores no `.env.local` sincronizado) no painel de onde o sistema está hospedado, senão
o envio de push fica em modo "no-op" silencioso (nada quebra, só não envia).

## Atualização (28/08) — Fase 2, parte 1: Parecer Final + Financeiro de jogo

Segunda fatia: Parecer Final de Avaliação e os 2 documentos do Financeiro de jogo (Orçamento
Pré-Jogo e Relatório de Despesas, Profissional e Base) — 4 PDFs no total — ligados na mesma infra
da Fase 1. Diferença importante desses três em relação à Dispensa: os assinantes não são "um papel
fixo do sistema" (Treinador/Departamento), são pessoas *configuráveis* pelo Mateus em telas que já
existiam (`/financeiro/configuracoes`, `/base/financeiro/configuracoes`, dentro de
`/base/captacao`) — só nome/cargo digitados, sem ligação a nenhum login.

**Decisão tomada com o Mateus antes de implementar**: cada assinante configurado agora pode ser
vinculado a um usuário real do sistema (novo campo "Usuário que assina digitalmente" nas 3 telas de
configuração). Só a pessoa vinculada consegue clicar em "Assinar" naquele papel. Configuração
antiga, ainda sem vínculo feito → qualquer "master" pode assinar no lugar (fallback deliberado, pra
não travar quem já usava essas telas sem saber desse campo novo).

- **Migration `0090_assinaturas_vinculo_usuario.sql`**: `assinatura1_usuario_id`/
  `assinatura2_usuario_id` em `configuracoes_financeiro` e `configuracoes_financeiro_base`; e um
  `id` estável (backfill) em cada linha de `configuracoes_parecer_captacao_base.assinaturas` — vira
  `assinaturas_documento.papel` quando aquela linha assina, então não pode depender da posição na
  lista (reordenar/adicionar no meio não pode "roubar" uma assinatura já feita).
- **`lib/assinaturas/config.ts`**: `TipoDocumento` ganhou `parecer_captacao_base`, `orcamento_jogo`
  e `despesas_jogo`. Diferente da Dispensa (papéis fixos), esses três têm assinantes configuráveis
  — em vez de forçar isso num `papeisEsperados` estático, dois helpers novos montam a lista na hora
  a partir da configuração salva: `papeisAssinaturaFinanceiro` (2 papéis fixos "assinatura1"/
  "assinatura2", rótulo = cargo configurado) e `papeisAssinaturaParecer` (1 papel por linha
  configurada com nome preenchido, chave = `id` estável da linha). `podeAssinarPapel` centraliza a
  regra "vinculado assina, sem vínculo qualquer master assina".
- **`lib/auth/perfis.ts`** (novo): `buscarPerfisParaSelecao` — lista de usuários pro `<select>` de
  vínculo nas 3 telas de configuração.
- **Orçamento/Despesas do jogo não têm um "criar" único** (diferente da Dispensa) — são gerados sob
  demanda a partir dos gastos lançados incrementalmente. Sem momento de auto-assinatura: os dois
  assinantes configurados assinam manualmente, direto na aba Financeiro do jogo (Profissional e
  Base), onde `<BlocoAssinaturaDigital>` aparece pra cada documento assim que ele fica disponível
  (Orçamento quando há gasto lançado, Despesas quando há algum valor efetuado).
- **Parecer Final**: quem preenche as notas (o Treinador) é uma pessoa DIFERENTE de quem assina
  (a lista configurada de staff) — também sem auto-assinatura. `<BlocoAssinaturaDigital>` aparece
  em `/base/captacao/[id]`, dentro do card do Parecer Final.
- **PDFs**: os 4 routes do Financeiro de jogo e o do Parecer Final agora buscam
  `assinaturas_documento` e mesclam com a configuração via `montarAssinaturasFinanceiroComDigital`
  (`lib/pdf/assinaturas.ts`) e `montarAssinaturasParecer` (`lib/pdf/parecer-final-document.tsx`) —
  mesmo padrão do `montarAssinaturasDispensa` da Fase 1: assinado mostra o nome/cargo de quem
  REALMENTE assinou (retrato do momento), pendente mostra o cargo configurado como rótulo de quem
  falta.
- Testes novos: `lib/assinaturas/config.test.ts` (helpers novos), `lib/pdf/assinaturas.test.ts`
  (mescla do Financeiro) e `lib/pdf/parecer-final-document.test.ts` (mescla do Parecer). 322 testes
  no total, `tsc`/`build` limpos.

**Pendente do lado do Mateus**: rodar a migration `0090` (SQL mandado em separado no chat) e, se
quiser travar quem assina cada papel do Financeiro/Parecer a uma pessoa específica (em vez do
fallback "qualquer master"), abrir as 3 telas de configuração e escolher o usuário em "Usuário que
assina digitalmente" pra cada assinante.

**Fora desta fatia, ainda pendente**: Solicitações (+ tela nova de Encarregado por departamento) e
os documentos Operacionais (Termo de Retirada, Estoque, Veículos, Recibo) — próxima fatia.

## Atualização (28/08) — Fase 2, parte 2: Solicitações

Terceira fatia: as Solicitações (Compra, Pagamento, Exame Médico, Reembolso, Passagem Aérea,
Transporte, Hospedagem — Profissional e Base) agora assinam digitalmente. 2 assinantes: **Solicitante**
(quem cria — auto-assina o próprio papel na hora, mesmo padrão do Relatório de Dispensa) e
**Encarregado do Departamento** (pessoa configurada numa tela nova, `/solicitacoes/configuracoes` e
`/base/solicitacoes/configuracoes` — vinculável a um login, mesmo padrão do Financeiro/Parecer).

- **Simplificação em relação ao PDF antigo**: o documento tinha 4 linhas de assinatura em branco
  (Solicitante, Encarregado Departamento, um rótulo derivado do tipo tipo "Departamento
  Financeiro", e Aprovador). Confirmado com o Mateus que não precisa do papel de Aprovador nem da
  4ª linha — o bloco de assinatura virou os 2 mesmos que todo outro documento usa
  (`AssinaturasBlock`, `lib/pdf/logistica-shared.tsx`), mostrando "Assinado digitalmente" ou
  "Pendente de assinatura" no lugar das linhas em branco.
- **Migration `0091_assinatura_solicitacoes.sql`**: `configuracoes_solicitacoes` e
  `configuracoes_solicitacoes_base` (tabelas singleton novas, mesmo formato do Financeiro:
  `encarregado_nome`/`encarregado_cargo`/`encarregado_usuario_id`). `solicitacoes`/
  `solicitacoes_base` já tinham uma coluna `created_by` desde o início, mas nunca era preenchida —
  agora `createSolicitacao`/`createSolicitacaoBase`/`duplicarSolicitacao(Base)` gravam
  `created_by` e auto-assinam o Solicitante.
- **`lib/assinaturas/config.ts`**: `TipoDocumento` ganhou `"solicitacao"` (mesmo tipo pras duas
  tabelas, Profissional e Base — igual ao Orçamento/Despesas do jogo, `documento_id` já distingue).
  `papeisAssinaturaSolicitacao` monta os 2 papéis fixos ("solicitante"/"encarregado").
- `<BlocoAssinaturaDigital>` aparece em `/solicitacoes/[id]` e `/base/solicitacoes/[id]`, entre o
  formulário de edição e a lista de itens.
- Testes novos: `papeisAssinaturaSolicitacao` em `lib/assinaturas/config.test.ts` e
  `lib/pdf/solicitacao-document.test.ts` (mescla de assinaturas salvas). 326 testes no total,
  `tsc`/`build` limpos.

**Pendente do lado do Mateus**: rodar a migration `0091` e, se quiser, configurar o Encarregado do
Departamento em `/solicitacoes/configuracoes` e `/base/solicitacoes/configuracoes` (nome, cargo e o
usuário vinculado) — sem isso, o papel "Encarregado" fica sem rótulo específico e qualquer master
pode assinar no lugar.

**Fora desta fatia, ainda pendente**: os documentos Operacionais (Termo de Retirada, Estoque,
Veículos, Recibo) — última fatia da Fase 2.

## Correção (28/08) — "Minha Conta" não conseguia salvar nome/cargo

Bug encontrado em produção ao testar: salvar nome/cargo em `/minha-conta` retornava `permission
denied for table perfis`. Causa: a migration 0023 deixou `perfis` de propósito sem política de
update para usuários comuns (só master, via `service_role`, pode alterar `role`) — Fase 1 passou a
exigir autoatendimento de nome/cargo (qualquer usuário logado edita o próprio) sem que existisse
política nenhuma pra isso.

**Migration `0092_perfis_autoatualizar_nome_cargo.sql`**: política nova, estreita — cada usuário só
altera a própria linha (`auth.uid() = id`), e o grant de update é só nas colunas `nome`/`cargo`
(nunca `role`/`email`), então mesmo uma tentativa de update forjada direto na tabela não alcança o
campo de permissão.
