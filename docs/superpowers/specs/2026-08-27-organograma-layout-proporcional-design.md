# Organograma: layout proporcional (sem estourar de lado) e linhas de conexão padronizadas

Status: aprovado, aguardando implementação

## Contexto

O Organograma da Comissão Técnica do Futebol de Base (`/base/comissao-tecnica/organograma`,
`components/organograma-editor.tsx`) mostra a estrutura em caixas de tamanho fixo
(`LARGURA_CAIXA`/`ALTURA_CAIXA` em `lib/futebol/organograma.ts`): uma árvore de liderança no topo
(caixas arrastáveis livremente) e, abaixo, uma grade de colunas — uma por `grupo` (ex.: Treinador,
Auxiliar Técnico, Analista de Desempenho...).

O Mateus reportou (com screenshots) dois sintomas que vêm da mesma causa:

1. **Na tela**: cada `grupo` novo vira uma coluna nova de largura fixa, sempre esticando o desenho
   mais pra direita — sem limite. Com poucas colunas cabe bem; com mais, força um scroll horizontal
   grande e "fica desproporcional" (palavras dele).
2. **No PDF exportado** (`lib/pdf/organograma-base-document.tsx`): o desenho precisa caber numa
   folha A4 só, então ele já encolhe a posição/tamanho de tudo pra caber na largura disponível — mas
   o tamanho da letra é um valor fixo, não encolhe junto. Quanto mais larga a árvore ficou (pelo
   mesmo motivo do item 1), menor o encolhimento necessário, até a letra passar a vazar pra fora das
   caixas e sobrepor tudo (confirmado por screenshot: nomes ilegíveis, um em cima do outro).

Separadamente, o Mateus também pediu pra arrumar as linhas de conexão ("linha horizontal... acaba
bagunçando"): hoje o cotovelo de cada conector (onde ele vira de vertical pra horizontal) fica a
meio caminho entre o pé da caixa-pai e o topo do filho mais próximo (`busY` em
`components/organograma-editor.tsx` e `lib/pdf/organograma-base-document.tsx`, calculado
independentemente nos dois lugares). Como as caixas de liderança são arrastáveis livremente, essa
distância varia muito de um par pai/filho pro outro — o resultado é uma mistura de cotovelos
apertados e soltos, sem nenhum padrão visual.

Mockup de comparação usado pra alinhar essas decisões com o Mateus:
https://claude.ai/code/artifact/242f213e-d75d-4537-8e2b-eaeddb70eb01 (Opção C — encolher pra caber —
foi a escolhida, junto com a correção do PDF e a padronização das linhas).

## Objetivo

- A grade de colunas do Organograma nunca força scroll horizontal por causa da largura: as caixas
  (e a letra dentro delas) encolhem proporcionalmente conforme mais `grupo`s são adicionados, até um
  limite mínimo de legibilidade — a partir daí volta a valer o scroll horizontal, em vez de continuar
  encolhendo até virar ilegível.
- O PDF nunca mais sobrepõe texto: a letra encolhe junto com a caixa quando o desenho precisa ser
  reduzido pra caber numa folha A4.
- As linhas de conexão (cotovelo tronco → barramento → pé) sempre caem numa distância fixa e curta
  abaixo da caixa-pai, em vez de proporcional à distância até o filho — mesma "cara" em qualquer
  parte do organograma, tela ou PDF.

## Fora de escopo

- Mudar o algoritmo de posicionamento em si (árvore de liderança por profundidade, grade por
  `grupo`×`linha`) — ver `lib/futebol/organograma.ts`. Este ajuste só entra na apresentação visual
  (escala e posição do cotovelo), não em como cada caixa decide sua posição lógica.
- Paginação do PDF em múltiplas folhas — continua sendo sempre uma folha A4 só, como hoje.
- Zoom manual controlado pelo usuário (botões de + / − ou roda do mouse) — o encolhimento é
  automático, calculado a partir do espaço disponível; não é uma feature de zoom interativo.
- O Organograma do Futebol Profissional — não existe hoje (só o da Base, `organograma_base`).

## Design

### 1. Tela: encolher pra caber (Opção C)

A grade de colunas nunca deve ser mais larga que o espaço disponível no cartão onde o Organograma é
desenhado. Em vez de recalcular `LARGURA_CAIXA`/`ALTURA_CAIXA`/tamanhos de fonte um por um (o que
obrigaria a reescrever toda a lógica de posicionamento), o `OrganogramaEditor` passa a medir a
largura disponível do cartão (via `ResizeObserver`, reagindo a redimensionamento da janela) e aplicar
um único fator de escala visual (`transform: scale(...)`) sobre o desenho inteiro — o mesmo desenho
que já é calculado em pixels "lógicos" por `calcularLayoutAutomatico`, só apresentado menor.

- `escala = min(larguraDisponivel / larguraNatural, 1)` — nunca amplia (um organograma pequeno não
  fica gigante), só encolhe. **Sem piso mínimo** (ver atualização de 27/08 abaixo).
- Só a largura entra nessa conta — a altura continua livre (scroll vertical dentro do cartão,
  `maxHeight: 75vh`, já existe e não foi reportado como problema).
- O arrasto (`iniciarArrasto`) precisa dividir o delta do ponteiro (`clientX`/`clientY`) pela escala
  atual antes de aplicar à posição lógica da caixa — sem isso, arrastar sob uma escala menor que 1
  moveria a caixa mais rápido que o cursor.
- O wrapper que recebe `width`/`height` no layout (pra não sobrar espaço em branco reservado além do
  desenho já encolhido) usa as dimensões *escaladas* (`largura * escala`); o `transform: scale()` em
  si fica num elemento filho, no tamanho lógico original, com `transform-origin: top left`.

### 2. PDF: letra encolhe junto com a caixa

`lib/pdf/organograma-base-document.tsx` já calcula um fator `escala` pra caber numa página A4 (largura
e altura), e já aplica esse fator à posição e ao tamanho de cada caixa (`larguraCaixaPdf`,
`alturaCaixaPdf` etc.) — o bug é que os `fontSize` de `caixaNome`, `caixaCargo`,
`cabecalhoGrupoTexto` e `rotuloLinhaTexto` são valores fixos no `StyleSheet`, não multiplicados por
`escala`. A correção: os quatro tamanhos de fonte passam a ser calculados dinamicamente
(`fontSize base × escala`) e aplicados inline, do mesmo jeito que `larguraCaixaPdf`/`alturaCaixaPdf`
já são hoje, em vez de vir do `StyleSheet` estático. Sem piso mínimo aqui (diferente da tela) — o PDF
sempre precisa caber numa folha só, então, no caso extremo de um organograma muito grande, a letra
fica pequena mas nunca sobrepõe, o que já é estritamente melhor que o bug atual.

### 3. Linhas de conexão: cotovelo em distância fixa

A fórmula atual do cotovelo (`busY = paiBaixoY + Math.max(16, (menorTopoFilho - paiBaixoY) / 2)`,
duplicada em `components/organograma-editor.tsx` e `lib/pdf/organograma-base-document.tsx`) vira uma
distância fixa e curta a partir do pé da caixa-pai, com uma salvaguarda pro caso do filho estar mais
perto do que essa distância (não deixa o cotovelo cair em cima ou depois do filho):

```
GAP_BARRAMENTO = 20 // px lógicos
busY = paiBaixoY + Math.min(GAP_BARRAMENTO, Math.max(4, menorTopoFilho - paiBaixoY - 4))
```

Como a lógica de calcular os conectores (tronco, barramento, pés) hoje está duplicada quase
idêntica nos dois arquivos (tela e PDF), este ajuste é a oportunidade de extrair uma função pura
compartilhada `calcularConectores(nos, posicoes)` pra `lib/futebol/organograma.ts` — mesma pasta que
já centraliza `calcularLayoutAutomatico`, testável isoladamente, e usada pelos dois lugares. Isso
elimina o risco de tela e PDF divergirem de novo no futuro (o mesmo tipo de bug que motivou o item 2
acima).

## Dados

Nenhuma mudança de schema — é só apresentação (JS/CSS na tela, cálculo de layout no PDF). Nenhuma
migration nova.

## Testes

- `calcularConectores` (nova função extraída): testável isoladamente em
  `lib/futebol/organograma.test.ts` — cobrir o caso de gap grande (cotovelo fica no piso fixo) e gap
  pequeno (cotovelo usa a salvaguarda, sem ultrapassar o filho).
- Cálculo de `escala` da tela (função pura, ex. `calcularEscalaOrganograma(larguraNatural,
  larguraDisponivel)`): testável — casos de caber sem encolher (escala 1), encolher dentro do piso, e
  bater no piso de 0.6.
- Fonte escalada do PDF: verificação visual manual pelo Mateus, mesmo padrão dos demais documentos
  do sistema (sem teste automatizado de layout de PDF).
- Arrasto com escala: verificação manual (arrastar uma caixa com o organograma encolhido e conferir
  que ela acompanha o cursor 1:1).

## Atualização (27/08, mesmo dia) — piso de 0.6 removido

Depois de implementado e entregue, teste real do Mateus mostrou que o piso `ESCALA_MINIMA = 0.6`
ainda era conservador demais: com o volume real de colunas do organograma dele (~6 grupos), o
desenho continuava mais largo que a tela mesmo encolhido até o piso — ele seguia precisando reduzir
o zoom do navegador manualmente pra ver tudo, exatamente o incômodo que este design deveria
eliminar ("quando eu deixo no tamanho normal 100% ele aumenta e tenho que ficar mexendo").

Correção: `calcularEscalaOrganograma` perdeu o piso — agora é só `Math.min(1, larguraDisponivel /
larguraNatural)`, igual ao raciocínio que o PDF já usava (sempre cabe, sem limite de encolhimento).
`ESCALA_MINIMA_ORGANOGRAMA` foi removida do código (`lib/futebol/organograma.ts`) e dos testes. Não
muda nada do resto do design (arrasto dividido pela escala, `ResizeObserver`, wrapper com dimensões
escaladas) — só o clamp inferior da função de escala.
