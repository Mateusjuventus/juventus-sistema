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

## Atualização (27/08, mesmo dia) — tela tremendo, card largo demais, e espaço vazio

Três rodadas de teste real do Mateus depois da entrega acima, todas no mesmo dia:

1. **"A tela fica tremendo"**: a escala encolhe largura E altura juntas (mesma `transform:
   scale()`), então uma escala menor às vezes tirava a barra de rolagem vertical do cartão (altura
   escalada abaixo de 75vh) — sem reservar o espaço dela, isso aumentava a largura medida pelo
   `ResizeObserver`, que recalculava a escala pra cima, que devolvia a barra, que diminuía a
   largura de novo — loop infinito. Corrigido com `scrollbar-gutter: stable` (reserva o espaço da
   barra sempre) e `overflow-x-hidden` no cartão (o scroll horizontal nunca é necessário, já que a
   escala garante que a largura sempre cabe).
2. **"Não gostei da tela deste tamanho, está muito larga"**: a tela do Organograma usava
   `largura="total"` no `AppShell` (largura cheia da página, sem o teto `max-w-6xl` que as outras
   ~40 telas do sistema usam) — decisão de uma versão anterior, de antes de existir o
   encolher-pra-caber. Com a escala, dar mais espaço só faz o card crescer em torno de um desenho
   que continua do mesmo tamanho. Revertido pro padrão do sistema (mesmo usado no Campograma).
3. **"Continua esse espaço grande"** (mesmo já com a largura padrão): a largura do desenho era
   forçada simétrica em torno de x=0 (`minX = -maxX`) só pra manter o Presidente centralizado via
   rolagem programática — mas a grade de membros normalmente estica bem mais pra um lado que a
   árvore de liderança, então isso preenchia o lado curto com espaço vazio do tamanho do lado
   longo, dobrando a largura à toa (e, por consequência, encolhendo a escala mais do que precisava).
   Corrigido: a largura agora usa os limites reais do conteúdo (sem simetria forçada), e o
   Presidente fica centralizado centralizando o próprio desenho (já do tamanho certo) dentro do
   cartão via CSS (`mx-auto`), não mais preenchendo com espaço vazio. Como consequência,
   `calcularScrollHorizontalCentralizado` ficou morta (não há mais o que rolar, com
   `overflow-x-hidden`) e foi removida do código e dos testes.

## Atualização (27/08, mesmo dia) — o mesmo bug de espaço vazio existia no PDF, e a letra do PDF

O PDF (`lib/pdf/organograma-base-document.tsx`) tinha o MESMO bug de largura simétrica do item 3
acima (`extensaoX = Math.max(Math.abs(minXBruto), Math.abs(maxXBruto), ...)`), implementado
independentemente na função equivalente do PDF (`calcularDiagrama`) — o texto saía visualmente
deslocado pra um lado da página mesmo com o bloco todo centralizado (`diagramaWrap: alignItems:
"center"`), porque a metade "vazia" do bloco ficava sempre do lado curto. Corrigido do mesmo jeito:
`minX`/`maxX` usam os limites reais do conteúdo, sem forçar simetria.

Separadamente, o Mateus também pediu letra maior no PDF ("aumente essa letra"). Os tamanhos de
fonte de referência (`FONTE_*_BASE`, ver acima) foram aumentados: nome 6,5→10pt, cargo 5,5→8pt,
cabeçalho de grupo e rótulo de linha 6→8,5pt. Verificado com um script de render (mesma técnica de
`renderToFile` + inspeção visual da imagem já usada antes nesta spec) em dois cenários sintéticos:
um organograma pequeno (escala 1, sem encolher) pra garantir que a letra maior não estoura a caixa,
e um parecido com o real do Mateus (~5 colunas de grupo + hierarquia de liderança com alguns
níveis) pra conferir legibilidade quando precisa encolher bastante — em ambos o texto ficou legível
e dentro da caixa, sem sobrepor nada (a caixa mantém `overflow: hidden` como rede de segurança:
se algum nome muito comprido não couber num organograma extremamente encolhido, ele é cortado
dentro da própria caixa, nunca vaza por cima de outra).

## Atualização (27/08, mesmo dia) — caixas de liderança se sobrepondo (bug real, não só visual)

O Mateus reportou que caixas de liderança (sem Grupo) às vezes "somem da tela" depois de criadas, e
que a cada atualização "fica saindo do lugar", além de aparecerem sobrepostas ao exportar o PDF.
Investigando `ajustarPosicoesAutomaticas`
(`app/base/comissao-tecnica/organograma/actions.ts`): toda caixa sem Grupo tem sua posição
calculada uma vez e "congelada" (salva em `pos_x`/`pos_y`) na primeira vez que é salva — pra não
ficar recalculando (e pulando de lugar) toda vez que QUALQUER outra caixa do organograma muda.
O problema: como a posição de cada caixa no cálculo automático depende de quantas outras existem
no mesmo nível (`calcularLayoutAutomatico`), só recalcular a caixa RECÉM-criada — deixando as já
congeladas como estavam — podia fazer a caixa nova cair bem em cima de uma caixa já existente.
Reproduzido com um teste isolado: um Presidente sozinho congelado numa posição; ao adicionar uma
segunda caixa de liderança do lado dele, a posição calculada pra ela sobrepõe boa parte da largura
da primeira — na tela, uma cobre a outra (a mais nova, desenhada por cima, "esconde" a mais antiga
por trás dela — dá a impressão de "sumiu").

Correção: nova coluna `pos_manual` em `organograma_base` (migration `0088`) marca se uma posição
veio de arrasto manual (`moverNoOrganograma` agora grava `pos_manual: true`) ou é
automática/calculada. `ajustarPosicoesAutomaticas` passa a recalcular JUNTAS todas as caixas
automáticas (`pos_manual = false`) a cada criação/edição — não só a mais nova — garantindo que elas
nunca se sobrepõem entre si (só grava quem de fato mudou de posição, pra não gerar updates à toa);
caixas com `pos_manual = true` nunca são tocadas, preservando arranjos de propósito. Migration
faz backfill: quem já tinha posição salva vira `pos_manual = true` (mais seguro que reflowar
arranjos que o Mateus já ajustou na mão). Verificado com uma simulação isolada do algoritmo (sem
Supabase): 6 caixas de liderança adicionadas em sequência, nunca uma sobrepõe outra; uma caixa
marcada manual mantém a posição mesmo com novas caixas sendo criadas depois dela.

## Atualização (27/08, mesmo dia) — letra do PDF ainda pequena; piso de fonte + corte de texto

O aumento de fonte da rodada anterior (valores de referência maiores, ver acima) não resolveu de
verdade: em organogramas com bastante gente a escala já é pequena o bastante (bate no lado da
ALTURA, não da largura — hierarquia de liderança com vários níveis) pra que qualquer valor de
referência razoável, multiplicado por ela, ainda vire letra minúscula. O Mateus confirmou ("AUMENTA
POR FAVOR") que continuava pequeno.

Também nesse teste, medindo os pixels de um screenshot dele lado a lado com um render de teste meu:
o PDF **já estava centralizado corretamente** (`diagramaWrap: alignItems: "center"` funciona) — o
screenshot dele tinha proporção de tela bem diferente de uma página A4 paisagem (1367×761 vs a
proporção real 842×595), sinal de que era uma janela/visualizador cortando/rolando a página, não o
PDF em si fora do centro. Vale avisar isso a ele e pedir pra conferir abrindo o arquivo completo.

Correção da letra: os 4 tamanhos de fonte (`FONTE_*_BASE`) ganharam um **piso mínimo**
(`FONTE_*_MIN`) — a letra nunca fica menor que isso, mesmo que a escala continue encolhendo. Como um
piso de fonte, sem mais nada, faz o nome às vezes precisar de 2 linhas dentro de uma caixa que só
tem espaço pra 1 (a segunda linha do nome ficava desenhada em cima do cargo — bug visto no teste
visual, `overflow: "hidden"` não evita isso porque o conteúdo cresce dentro da própria caixa, não
"vaza" pra fora dela), o texto (nome, cargo, cabeçalho de grupo, rótulo de linha) agora passa por
`truncarParaCaber` antes de renderizar: corta com "…" se a largura estimada do texto (comprimento ×
tamanho da fonte × uma largura média de caractere) não couber na largura disponível da caixa. É uma
estimativa (react-pdf não mede o texto real antes de desenhar), calibrada visualmente pra não deixar
sobrar/faltar demais. Também aumentei um pouco o orçamento de página usado (`LARGURA_PAGINA_UTIL`
760→770, `ALTURA_PAGINA_UTIL` 385→400 — ainda dentro da margem real da folha A4 paisagem).

Verificado com o mesmo script de render + inspeção visual (e, dessa vez, medição de pixel por
código pra achar precisamente onde o texto começa/termina, não só olhando a imagem): num
organograma pequeno (escala 1) os nomes aparecem inteiros, sem cortar; num organograma parecido com
o real do Mateus (~5 colunas + hierarquia com vários níveis, escala ~0.32) a letra fica bem maior
que antes e nunca mais sobrepõe nada — nomes longos cortam com "…" em vez de quebrar linha.

## Atualização (27/08, mesmo dia) — piso de FONTE sozinho não bastava; agora é piso de ESCALA + folha que cresce

Rodando o script de render com dados parecidos de verdade com os do Mateus (~30 pessoas, vários
níveis de liderança + 5 colunas de grupo, um deles — TREINADOR — empilhando vários técnicos), a
escala calculada ficou em ~0.33 (o lado da ALTURA é o gargalo, não a largura). Nesse cenário a
correção da rodada anterior (piso só na FONTE, com a CAIXA continuando a encolher sozinha até
0.33×) tem um bug: a caixa fica menor do que a letra no tamanho "mínimo" precisa — o resultado, visto
no render de teste, é texto cortado bem curto demais ("Claudio R…" pra "Claudio Roberto Fiorito
Filho", praticamente todo nome virando só as primeiras 2-3 palavras). Achei isso ANTES de mandar
pro Mateus, rodando o script de preview que tinha ficado pendente — bom ter simulado com dados
parecidos com os reais em vez de só um organograma pequeno de teste.

Causa raiz: caixa e fonte encolhiam por escalas diferentes na prática — a fonte parava de encolher
no piso, a caixa não. Correção: o piso passa a ser da ESCALA do diagrama inteiro
(`ESCALA_MINIMA_PDF = 0.85`), não só da fonte — caixa e letra sempre encolhem juntas, na mesma
proporção, então o "encaixe" de caracteres por caixa fica sempre parecido com o de um organograma
que nunca precisou encolher (os pisos de fonte antigos, `FONTE_*_MIN`, viram rede de segurança
redundante, já que 0.85 é folgado acima da pior razão MIN/BASE deles, ~0.82). Consequência: um
organograma grande o bastante pra precisar de escala menor que 0.85 não cabe mais espremido numa
folha A4 — em vez disso a FOLHA cresce (`larguraPagina`/`alturaPagina`, usando `size={[largura,
altura]}` do react-pdf em vez de `size="A4"` fixo) pra caber o diagrama nesse piso de escala.
Organograma pequeno/médio continua numa folha A4 comum (só cresce quando precisa) — do jeito que
uma pessoa desenhando isso à mão pegaria uma folha maior em vez de espremer a letra.

Verificado de novo com o mesmo organograma de teste (~30 pessoas): a folha cresceu de A4
(842×595pt) pra ~1258×1219pt, e virtualmente todos os nomes aparecem inteiros (só um nome
excepcionalmente comprido cortou, esperado) — sem sobreposição, letra grande e legível, e
centralização conferida por medição de pixel (margem esquerda/direita do desenho within ~4pt uma da
outra, praticamente igual).

## Atualização (27/08, mesmo dia) — pessoa vinculada sumia da lista pra sempre; "mover linha" sem feedback

Três pedidos do Mateus na mesma rodada, todos ligados ao mesmo ponto de fricção real:

1. Perguntou como vincular a MESMA pessoa em mais de uma categoria (ex.: um técnico que atende Sub15
   E Sub17 — precisa de uma caixa em cada).
2. Reportou que os botões "▲/▼ Mover linha" "não estão ajudando nada".
3. Pediu pra facilitar a inclusão de pessoas no organograma, e um "botão de salvar" perto do painel
   de mover linha.

Investigando o seletor "Pessoa da Comissão Técnica" (`PainelEdicao` em `organograma-editor.tsx`):
uma vez que uma pessoa é vinculada a QUALQUER caixa do organograma, ela desaparecia da lista pra
sempre (`pessoasDisponiveis` filtrava fora quem já tivesse uma `comissao_tecnica_base_id` usada em
`nos`) — pensado originalmente só pra evitar vínculo duplicado por engano. Efeito colateral: (a)
impossível vincular a mesma pessoa numa segunda caixa de propósito (o caso real do Sub15/Sub17
acima), e (b) se uma caixa ficava difícil de achar na tela (por qualquer motivo — inclusive o próprio
bug de sobreposição já corrigido antes), não tinha como vinculá-la de novo em outro lugar nem pra
recuperar/localizar. Provavelmente a mesma causa do "sumiu da lista" relatado numa rodada anterior
(o Igor Silvério, citado no código como o exemplo que motivou o aviso de "falta Grupo").

Correção: o seletor sempre mostra todo mundo agora; quando a pessoa já está em outra caixa, o nome
dela no seletor ganha um aviso "(já em: <grupo/linha ou "liderança">)" — não impede escolher de novo,
só avisa, então dá pra vincular de propósito (Sub15 e Sub17 viram duas caixas normais, mesma pessoa)
sem abrir mão do aviso contra duplicar sem querer.

Sobre "mover linha não ajuda nada": `moverLinhaOrganograma` (`actions.ts`) tinha DOIS lugares onde um
erro do Supabase desaparecia em silêncio — a `select` inicial ignorava `error`, e nenhum dos `update`
em paralelo (`Promise.all`) era conferido depois. Se algo desse errado (RLS, rede, o que for), o
clique literalmente não fazia nada visível e não tinha como saber se era um bug ou erro passageiro.
Agora a função devolve `{ error }` quando algo falha, e o painel mostra a mensagem no lugar do texto
de ajuda. Não adicionei um botão de "Salvar" separado ali — os botões já movem/salvam na hora
(propositalmente, pra não precisar digitar número), então um botão a mais seria redundante; o que
faltava era o retorno de erro visível, que é o que resolve de verdade a sensação de "não fez nada".
Perguntei ao Mateus se isso resolve ou se ele queria mesmo um botão explícito por outro motivo.

Não mudei o espaçamento vertical dentro de uma coluna quando ela só tem gente em ALGUMAS
`linha`s da grade (ex.: coluna "Preparador Físico" só com Sub20 e mais uma linha bem abaixo, gerando
um vão grande entre as duas) — é o comportamento pretendido da grade (todas as colunas alinham na
MESMA altura pra cada `linha`, mesmo que uma coluna específica não tenha ninguém numa linha que
outra coluna usa); comprimir por coluna quebraria esse alinhamento, que é o ponto central do desenho
em grade. Expliquei isso ao Mateus em vez de mudar o código.

## Atualização (27/08, mesmo dia) — Gildesson "sumido" e o vão entre Treinador de Goleiro/Preparador Físico: dois bugs de verdade, achados com o próprio seletor corrigido acima

Com a correção do seletor "Pessoa da Comissão Técnica" (rodada anterior — agora sempre mostra todo
mundo, com um "(já em: ...)" pra quem já está em outra caixa), o próprio Mateus conseguiu localizar o
Gildesson: aparecia como "já em: Preparador Físico · Comissão Sub17" — exatamente a mesma combinação
que o Halamo Icaro Silva. Confirmando por código: `calcularLayoutAutomatico` calculava a posição de
CADA célula da grade (grupo × linha) uma vez só, por linha — se dois nós tivessem o mesmo par
(grupo, linha), os dois recebiam a MESMA posição, um desenhado exatamente em cima do outro. Como
célula de grade nunca pode ser arrastada (`naGrade`, ver `Caixa` em `organograma-editor.tsx`), não
tinha como separar os dois manualmente nem perceber qual dos dois estava por baixo — o caso real de
dois preparadores físicos pra Sub17 (perfeitamente válido) ficava indistinguível de um bug.

No mesmo print enviado pelo Mateus (tela inteira), reparei também no vão grande entre as colunas
"Treinador de Goleiro" e "Preparador Físico" — bem mais largo que o espaço normal entre as outras
colunas. Causa raiz, achada lendo `calcularLayoutAutomatico`: o índice de coluna (x) de cada `grupo`
vinha da posição dele na lista ORDENADA de todos os grupos diferentes, contando TODOS eles — mesmo
um grupo cujos membros foram TODOS arrastados (arrasto manual, salvo) pra outro canto do organograma
(o caso do "Coordenador de Performance", que o Mateus tinha posicionado perto da liderança, acima da
grade principal). Esse grupo continuava "reservando" o degrau de largura dele na fileira de baixo,
mesmo sem nenhuma caixa de verdade ali — um vão vazio do tamanho de uma coluna inteira, bem no meio
de colunas que continuavam normais.

Duas correções em `lib/futebol/organograma.ts` (`calcularLayoutAutomatico`), a função de layout
compartilhada entre tela e PDF:

1. **Célula duplicada empilha em vez de sobrepor.** Quando mais de um nó cai no mesmo (grupo,
   linha), em vez de dar a mesma posição pra todos, empilha um abaixo do outro dentro daquela célula
   (mesma lógica de "quem não tem linha empilha embaixo da grade", só que dentro da célula). Isso
   desalinha a PRÓPRIA coluna um pouco mais pra baixo dali em diante (uma linha extra "atrasa" só
   quem está naquela coluna específica) — outras colunas continuam alinhadas normalmente entre si.
2. **Coluna 100% arrastada não reserva espaço.** Novo campo opcional `automatico` em `OrganogramaNo`
   (`false` só quando aquela caixa específica tem posição manual salva; célula de grade sempre conta
   como automática, já que nunca pode ser arrastada). Um `grupo` só reserva um degrau de largura na
   fileira de baixo se tiver PELO MENOS um membro ainda em posição automática — um grupo 100%
   arrastado passa batido, sem abrir vão. `pos_manual` (a coluna adicionada na correção do bug de
   sobreposição, mais cedo nesse mesmo dia) é exatamente o dado que já existia pra alimentar isso —
   só precisou ser encanado até aqui: `OrganogramaNoData` (tela), `OrganogramaBaseNoDocumento` (PDF)
   e a query de `ajustarPosicoesAutomaticas` (servidor) ganharam/passaram a usar `posManual`/
   `pos_manual` nesse cálculo.

Verificado com 4 testes novos em `organograma.test.ts` (célula duplicada empilha, célula duplicada
não desalinha outras colunas, coluna 100% arrastada não reserva espaço) e com um render de PDF de
teste reproduzindo o cenário real relatado (Gildesson + Halamo os dois em Preparador Físico ×
Comissão Sub17, Coordenador de Performance arrastado pra cima) — as duas caixas de Sub17 aparecem
empilhadas, sem sobrepor, e o vão entre Treinador de Goleiro e Preparador Físico sumiu.

## Atualização (27/08, mesmo dia) — botão "Reorganizar automaticamente"

Depois de várias rodadas de teste (arrastando caixas pra reproduzir bugs, inclusive), o organograma
do Mateus acumulou arrastos que já não faziam sentido nenhum — "uma bagunça", nas palavras dele. Ele
pediu pra organizar tudo automaticamente de novo, podendo continuar selecionando/arrastando caixa
por caixa a partir daí conforme precisar.

Novo botão "Reorganizar automaticamente" ao lado de "+ Nova caixa", com confirmação em duas etapas
(mesmo padrão do `DeleteButton`, sem `window.confirm`, já que desfaz de uma vez todo arrasto manual
salvo). A ação (`reorganizarOrganograma` em `actions.ts`) zera `pos_x`/`pos_y`/`pos_manual` de quem
tinha arrasto salvo (`pos_manual = true`) e chama `ajustarPosicoesAutomaticas` — a mesma função que
já recalcula tudo junto depois de qualquer criação/edição — pra recolocar todo mundo no layout
automático de uma vez. Célula de grade nem entra nessa conta (nunca é arrastada, já está sempre no
automático). Dali em diante o Mateus volta a arrastar só quem precisar; cada caixa arrastada de novo
volta a ficar protegida do recálculo automático, exatamente como antes.

## Atualização (27/08, mesmo dia) — achada a causa da bagunça que voltava sozinha: clique virava micro-arrasto

Mesmo depois do "Reorganizar automaticamente", o Mateus mandou um print mostrando a bagunça de
volta — caixas de liderança ("??? Coordenador Técnico", "??? Performance") sobrepondo cabeçalho de
grupo e outras caixas da grade, em posições que não faziam sentido nenhum.

Causa raiz, lendo `iniciarArrasto` em `organograma-editor.tsx`: não existia um limiar mínimo de
distância pra distinguir um CLIQUE (só selecionar a caixa, abrir o painel de edição) de um ARRASTO de
verdade. Qualquer `pointermove`, mesmo de 1px, entre apertar e soltar o botão — o tremor natural da
mão no mouse/trackpad, bem comum — já disparava `setOverrides` e, ao soltar, `moverAction` salvava
aquilo como posição manual (`pos_manual: true`) igual a um arrasto de propósito. Ou seja: só de
CLICAR numa caixa de liderança ou "grupo sem linha" pra abrir o painel dela, às vezes ela ficava
"congelada" numa posição quase igual à original (mas não exatamente) — tirada do recálculo automático
pra sempre, sem o Mateus ter arrastado nada. Explica por que a bagunça "voltava sozinha": bastava
clicar em algumas caixas ao longo do uso normal (nem precisa ser muitos cliques) pra ir acumulando
esses micro-arrastos invisíveis.

Correção: o arrasto só passa a "valer" (mover a caixa na tela, e salvar ao soltar) depois que o
cursor andar mais que 4px na tela. Abaixo disso, soltar o botão não salva posição nenhuma — é
tratado como um clique puro, do jeito que sempre devia ter sido.

## Atualização (27/08, mesmo dia) — formulário de edição mais fácil de preencher

Depois do "Reorganizar automaticamente", o Mateus esclareceu um ponto e trouxe uma nova reclamação:
reorganizar é uma ação da TELA (não existe um botão separado no PDF) — o PDF só lê as mesmas posições
salvas em `organograma_base`, então qualquer reorganização feita na tela já aparece automaticamente
no PDF na próxima exportação, sem precisar de nada a mais. E, separado disso: "quero uma maneira mais
fácil de preencher, está confuso".

O campo mais confuso era "Grupo" — até aqui era texto livre (`<input list=.../><datalist>`), a mesma
armadilha que já tinha causado bug real duas vezes nesse mesmo dia (coluna "quase igual" por causa de
espaço a mais ou acento faltando, ver seção acima sobre a grade). "Linha" já tinha sido resolvida
assim numa rodada anterior; "Grupo" ficou de fora na hora e continuava sendo a fonte da confusão.

Mudanças em `organograma-editor.tsx`:

1. **Grupo virou `<select>`**, no mesmo padrão que "Linha" já usava: lista os grupos que já existem
   + opção "— nenhum (caixa de liderança) —" + "+ Nova coluna (digitar)..." (abre um campo de texto
   só quando escolhida). Elimina de vez a classe de bug de coluna duplicada por erro de digitação,
   além de ser mais rápido — escolher da lista em vez de lembrar/digitar o nome exato de uma coluna
   que já existe.
2. **Grupo e Linha ganharam um bloco visual só deles**, com borda e título "Onde fica no organograma"
   — juntos porque são os dois campos que decidem se a caixa vira uma célula da grade ou fica na
   árvore de liderança; separá-los visualmente do resto do formulário deixa essa relação mais clara
   (antes os dois campos apareciam soltos entre outros, sem indicar que trabalham juntos). Texto de
   ajuda consolidado embaixo dos dois, num só lugar.
3. **"Reporta para" passou a listar em ordem alfabética** (antes seguia a ordem de cadastro, sem
   critério visível) — mais fácil de achar quem se procura numa lista que só cresce.

Verificado com `tsc --noEmit`, `vitest run` (307 testes, sem mudança de comportamento de layout —
só UI do formulário) e `next build`, todos limpos.

## Atualização (27/08, mesmo dia) — "a tela e o PDF ficam diferentes"

Mateus relatou que as posições das caixas na tela e no PDF exportado às vezes não batem. Causa raiz,
em `organograma-editor.tsx`: a posição otimista de uma caixa arrastada (`overrides`, usada pra
mover a caixa na tela instantaneamente, antes da confirmação do servidor) nunca era descartada — uma
vez que uma caixa era arrastada, `overrides[id]` ficava guardado na memória do navegador pelo resto
da sessão naquela aba, e o cálculo de posição da tela sempre priorizava esse valor sobre o que
estava realmente salvo no banco (`no.posX`/`no.posY`). O PDF, por outro lado, sempre lê direto do
banco a cada exportação — nunca teve (nem deveria ter) esse estado otimista.

Isso dava dois jeitos concretos de divergir:

1. **Depois de "Reorganizar automaticamente"**: o banco zera e recalcula a posição de tudo, mas o
   `overrides` da caixa que tinha sido arrastada antes continuava valendo na tela — ela continuava
   aparecendo no lugar antigo (arrastado) mesmo com o banco já reorganizado. O PDF, lendo do banco,
   já mostrava certo.
2. **Falha silenciosa ao salvar um arrasto**: `moverNoOrganograma` (a ação chamada ao soltar uma
   caixa) não conferia erro nenhum do Supabase — se o `update` falhasse por qualquer motivo, a
   caixa continuava "arrastada" só na tela (o `overrides` nunca soube que não tinha sido salvo),
   enquanto o banco (e portanto o PDF) ficava com a posição antiga.

Duas correções, as duas em conjunto:

- `moverNoOrganograma` agora confere o erro do Supabase e devolve `{ error }` (mesmo padrão já usado
  em `moverLinhaOrganograma`/`excluirNoOrganograma`/`reorganizarOrganograma`) em vez de falhar em
  silêncio; a tela mostra esse erro numa faixa vermelha acima do organograma.
- Novo `useEffect` que descarta TODAS as posições otimistas (`setOverrides({})`) sempre que `nos`
  chega atualizado do servidor — ou seja, depois de qualquer ação (arrastar, salvar, excluir,
  reorganizar). Na prática: a posição otimista dura só o tempo entre soltar o arrasto e a tela
  revalidar com o dado real; depois disso, `no.posX`/`no.posY` (o mesmo dado que o PDF lê) sempre
  manda. Se um arrasto falhar ao salvar, a mesma limpeza roda na hora (via o retorno de erro), então
  a caixa volta visualmente pra onde estava de verdade — errada, mas igual ao que o PDF mostraria,
  em vez de mentir uma posição que nunca existiu no banco.

Verificado com `tsc --noEmit`, `vitest run` (307 testes) e `next build`, todos limpos.
