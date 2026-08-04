# Convocação — redesenho visual

Status: Aprovado

## Objetivo

Repaginar a tela de Convocação (dentro de um Jogo) pra ficar mais rápida e visual de usar,
inspirada num sistema de referência que o usuário mostrou: em vez de uma tabela longa com um
dropdown "Titular / Reserva / Não convocado" por atleta, o fluxo passa a ser clicar num atleta
disponível pra convocá-lo (ele desce pra uma lista de "Convocados"), com uma tag colorida de
posição pra escanear a grade rapidamente. Este é o primeiro de uma sequência de projetos maiores
(Súmula, Estatísticas do Atleta, Integração FPF, Calendário, Layout dos módulos) — cada um vai
ganhar seu próprio spec depois deste.

Este spec cobre **só a interação e o visual da Convocação**. O modelo de dados de convocação
(`convocacoes` / `convocacao_atletas` / `convocacao_comissao`) já existe e não muda — só a tela
que usa esses dados. Espelhado em Futebol Profissional (`/jogos/[id]/convocacao`) e Futebol de
Base (`/base/jogos/[id]/convocacao`), como todo o resto do sistema.

## Categoria de posição (novo campo)

Hoje "Posição" no cadastro do atleta é um campo de texto livre (ex: "Lateral direito", "Meia
central"), sem uma categoria fixa — não dá pra gerar uma tag curta e colorida a partir dele de
forma confiável.

Novo campo `categoria_posicao` nas tabelas `atletas` e `atletas_base`, enum com 5 valores fixos:
`goleiro` | `zagueiro` | `lateral` | `meia` | `atacante`. O campo de texto livre "Posição"
continua existindo do jeito que está (mais descritivo, usado em listagens e PDFs) — o novo campo é
só pra classificação/tag, exibido como GOL / ZAG / LAT / MEI / ATA com uma cor própria cada
(mesmo espírito das cores por módulo já usadas na tela inicial).

A migração tenta preencher `categoria_posicao` automaticamente pros atletas já cadastrados,
combinando palavras-chave no texto livre de "Posição" (ex: contém "gol" → goleiro; "zag" →
zagueiro; "lateral" → lateral; "meia"/"meio" → meia; "atacante"/"ponta"/"centroavante" → atacante).
Quem não bater com nenhuma palavra-chave fica com `categoria_posicao` nulo — a grade de Convocação
mostra esses atletas com uma tag cinza "—" em vez de travar ou esconder o atleta. O cadastro do
atleta (`atleta-form.tsx` / `atleta-base-form.tsx`) ganha um novo campo obrigatório de seleção
(Goleiro/Zagueiro/Lateral/Meia/Atacante) pra cadastros novos e edições — assim a lista para de
crescer sem categoria com o tempo.

## Tela de Convocação

Duas abas no topo do formulário: **Atletas** e **Diretoria/Staff**. A aba Diretoria/Staff é a
atual seção "Comissão Técnica / Diretoria" (mesma lista de checkboxes que já existe), só que vira
uma aba em vez de ficar sempre visível abaixo da lista de atletas.

**Aba Atletas** — dividida em duas partes:

1. *Atletas Disponíveis*: grade de cartões pequenos (foto redonda ou iniciais quando não há foto,
   tag de posição, nome), um por atleta com status `liberado`. Clicar num cartão adiciona o atleta
   à lista de Convocados abaixo (como reserva, por padrão). Atletas já convocados somem desta
   grade (evita duplicar). Um link "Ver Lesionados" no rodapé da grade revela, numa lista à parte,
   os atletas com status `departamento_medico` (escondidos por padrão) — clicar neles também os
   convoca. Sem seção de suspensos/inativos nesta etapa.

2. *Convocados*: lista dos atletas adicionados, cada linha com foto, tag de posição, nome, número
   da camisa (só exibição — vem do cadastro do atleta, não é editável aqui) e um checkbox "atleta
   titular" (desmarcado = reserva). Um X remove o atleta da lista (ele volta a aparecer na grade de
   Disponíveis). O select de "Capitão do jogo" continua existindo, agora abaixo desta lista,
   limitado aos atletas presentes nela.

Botão único no final, "Salvar Convocados", chamando a mesma `saveConvocacao` já existente — o
formato dos dados enviados (`atleta_<id>=titular|reserva`, `comissao_<id>`, `capitaoAtletaId`)
não muda, só a interface que os monta. Fora de escopo nesta etapa: notificar convocados (não há
canal de notificação hoje) e edição do número da camisa por essa tela (sempre reflete o cadastro).

## Implementação

- Client Component novo (precisa de estado: quem está convocado, aba ativa, grade de lesionados
  aberta/fechada) substituindo o corpo de `convocacao-form.tsx` — mas mantendo a mesma prop de
  `action` (server action) e o mesmo `<form>` submetido no final, só trocando os inputs internos
  por hidden inputs gerados a partir do estado local, pra não precisar mexer em
  `actions.ts`/`saveConvocacao`.
- Reaproveita `getSignedPhotoUrl` (já usado em outras telas) pra foto do atleta.

## Fora de escopo

- Notificar Convocados (sem canal de notificação implementado).
- Número da camisa por jogo (sempre usa o do cadastro).
- "Ver Inativos"/suspensos (não pedido).
- Qualquer coisa de Súmula, Estatísticas do Atleta, Integração FPF, Calendário ou Layout dos
  módulos — cada um vai virar spec e etapa própria depois desta.
