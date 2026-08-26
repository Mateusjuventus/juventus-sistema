# Campograma: modelo de elenco em folha única (foto, classificação, contrato e gráfico)

Status: aprovado e implementado

## Contexto

O Campograma (`/base/atletas/campograma`, `components/campograma-pitch.tsx`) mostra o elenco de uma
categoria da Base separado por posição — não é a escalação de um jogo, é "quantos zagueiros o Sub-17
tem, e quem são" (ver docs/superpowers/specs/2026-08-19-captacao-base-design.md). Hoje cada atleta
aparece como uma pilulazinha branca com número da camisa + nome, sem foto, desenhada sobre um campo
verde decorativo.

Esta spec substitui a versão anterior (mesmo arquivo, mesmo tema) depois de várias rodadas de
mockup com o Mateus. O pedido evoluiu bastante ao longo da conversa: começou com uma referência do
ge.globo (foto circular com anel na cor do time) e terminou adotando o modelo de um relatório real do
Corinthians (PDF "Elenco — Sub 17", com foto, data de nascimento, selo de tipo de contrato e um
gráfico de posições) como referência principal, com a cor de classificação G1/G2/G3 do Juventus (ver
docs/superpowers/specs/2026-08-25-classificacao-dispensa-atleta-base-design.md) no lugar do que lá é
cor de urgência de contrato.

## Objetivo

Duas coisas por trás do mesmo dado, cada uma no seu formato:

1. Um **PDF exportável de uma folha só**, no estilo do relatório do Corinthians, com o elenco da
   categoria organizado por posição, identidade visual do Juventus, e um gráfico de posições.
2. A **tela do sistema**, com o mesmo visual de token (foto + anel + selo), mas interativa: dá pra
   arrastar um atleta de uma posição pra outra e o cadastro já salva.

## Fora de escopo

- O símbolo de cruz do Departamento Médico que aparece no modelo do Corinthians — não foi pedido
  explicitamente, fica de fora por ora.
- Cor de urgência de vencimento de contrato na faixa do atleta (vermelho/azul por data) — o Mateus
  pediu explicitamente pra tirar isso; o selo de contrato mostra só o tipo (P/F), sem cor por data.
- Escalação de jogo de verdade (11 titulares fixos) — o Campograma continua sendo "o elenco inteiro,
  por posição", não uma escalação de partida.
- Mudar a lógica de classificação G1/G2/G3 em si (cores, quem define) — isso já existe; o Campograma
  só passa a exibir a mesma cor que já aparece nos cards de atleta e no painel do treinador.

## Design

### Estrutura por posição (9 linhas, não 5 grupos)

O Campograma hoje agrupa por `categoria_posicao` (5 grupos: goleiro/zagueiro/lateral/meia/atacante,
calculados a partir da posição específica via `categoriaDaPosicao`, ver
`lib/futebol/categoria-posicao.ts`). Essa versão passa a ter uma linha por **posição específica**
(as 9 opções de `AtletaPosicao`), igual ao nível de detalhe do modelo do Corinthians. Ordem de cima
pra baixo (do gol pro ataque — revisão de 26/08, o Mateus pediu essa ordem no lugar da "ataque pro
gol" da primeira versão desta spec):

Goleiro, Zagueiro, Lateral Direito, Lateral Esquerdo, Volante, Meia, Atacante, Ponta Direita, Ponta
Esquerda.

Cada linha mostra o rótulo da posição à esquerda e os atletas daquela posição específica ao lado,
quebrando em várias linhas conforme necessário (não é uma escalação de 11 fixos — uma categoria pode
ter, por exemplo, 3 zagueiros e 0 pontas-direita). Atleta sem posição cadastrada (só acontece em
cadastros muito antigos, ver `categoriaDaPosicao`) continua aparecendo numa lista auxiliar abaixo do
elenco, igual ao "Sem posição classificada" que já existe hoje — não arrastável, já que não tem uma
posição de origem definida.

### O token de cada atleta

- Foto retangular (~66×72px), com **anel/borda de 3px na cor da classificação** G1/G2/G3
  (reaproveitando as cores já definidas em `lib/futebol/classificacao-atleta.ts`) — sem
  classificação, borda neutra cinza-clara. A cor é só a borda, sem escrever a sigla em cima da foto
  (pedido explícito do Mateus).
- Fallback sem foto: inicial do nome sobre fundo neutro, mesmo padrão já usado em
  `app/base/atletas/[categoria]/page.tsx` (`getSignedPhotoUrl`).
- Um selo pequeno e redondo no canto superior direito da foto, com **P** (fundo preto) ou **F**
  (fundo vermelho) — identifica o tipo de contrato. Como o sistema usa
  "Definitivo/Empréstimo/Amador/Iniciação" (não "Profissional/Formação" como no Corinthians), o
  mapeamento é: `definitivo` e `emprestimo` → **P**; `amador` e `iniciacao` → **F**. Atleta sem tipo
  de contrato cadastrado não mostra selo nenhum.
- Abaixo da foto: nome do atleta (mesmo texto curto de hoje — apelido, ou primeiro nome, via
  `nomeCampograma`), em negrito, e numa linha menor abaixo, a data de nascimento (dd/mm/aaaa).
- **Sem** o número da camisa no token — foi removido a pedido do Mateus; a contagem por posição
  aparece no gráfico (abaixo), não em cada atleta.

### Cabeçalho

Brasão do Juventus (`JuventusCrestMark`) ao lado do título "Elenco — `<Categoria>`" (ex.: "Elenco —
Sub-17") e a data, mesmo espírito do cabeçalho "Elenco - Sub 17" do modelo de referência.

### Legenda

Linha pequena abaixo da lista de atletas: as quatro cores de classificação (G1 verde, G2 amarelo, G3
laranja, cinza = não classificado) e os dois selos de contrato (P = Definitivo/Empréstimo, F =
Amador/Iniciação).

### Gráfico de posições

Um gráfico de radar (teia/aranha) com **9 eixos**, um por posição específica — mesmo espírito do
gráfico do modelo do Corinthians. Cada eixo é uma linha simples que sai do centro até a borda,
rotulada com o nome da posição e a quantidade entre parênteses (ex.: "Zagueiro (3)"), e o valor
plotado nessa linha é o número de atletas daquela posição na categoria. A escala do gráfico é relativa
— a posição com mais atletas na categoria define a borda externa, as demais são proporcionais a ela
(não um número fixo tipo "máximo 10"), pra o desenho aproveitar bem o espaço em qualquer categoria.
Ao lado do gráfico, um número grande com o total de atletas do elenco.

### Identidade visual (marca d'água e faixa lateral)

- **Marca d'água**: o brasão completo do Juventus, bem grande e com opacidade baixa (~5%), centrado
  atrás de todo o conteúdo — decoração discreta, não deve atrapalhar a leitura de nenhum dado.
- **Faixa lateral vertical**: uma faixa estreita (~42px) na cor grená (`#3F0724`), ocupando a altura
  inteira da folha, com uma textura sutil de listras verticais e o monograma "J" grande e claro
  (baixa opacidade), centralizado na faixa — inspirado numa referência visual que o Mateus mandou.
  Como não existe um arquivo oficial desse monograma isolado no projeto, ele é desenhado com
  tipografia (serifada, negrito) até que o Mateus forneça um arquivo oficial, se quiser trocar depois.

### PDF exportável (uma folha só)

Botão "Exportar" na tela do Campograma gera um PDF com todo esse desenho, no padrão já usado no
sistema pra outros documentos (`lib/pdf/*.tsx`, reaproveitando `lib/pdf/logistica-shared.tsx` onde
fizer sentido — cores, cabeçalho/rodapé). Página única (A4 retrato): para categorias com elenco
grande, o tamanho da foto de cada atleta encolhe proporcionalmente (calculado a partir do total de
atletas da categoria) pra garantir que tudo continue cabendo numa folha só, sem quebrar pra uma
segunda página.

### Tela do sistema: arrastar e soltar pra mudar de posição

Na tela (não no PDF), cada atleta pode ser arrastado de uma linha de posição pra outra. Como agora
cada linha já representa uma posição específica (não mais um grupo com várias posições possíveis),
soltar o atleta numa linha define exatamente a nova posição dele — sem precisar de nenhum seletor
extra de desambiguação. Ao soltar, uma Server Action atualiza o campo `posicao` do atleta
(`atletas_base.posicao`) e a tela re-renderiza com o atleta já na linha nova.

## Dados

A página do Campograma (`app/base/atletas/campograma/page.tsx`) já busca os atletas da categoria; só
precisa passar a buscar também `foto_path`, `classificacao`, `tipo_contrato` e `data_nascimento`
(hoje só busca id/nome/apelido/número/posição) e gerar as signed URLs em lote com `Promise.all`, igual
já é feito na listagem de atletas. Sem migration nova — todos esses campos já existem em
`atletas_base`.

## Testes

- Mapeamento de tipo de contrato pro selo P/F (`definitivo`/`emprestimo` → P, `amador`/`iniciacao` →
  F, sem tipo → sem selo) é lógica pura, testável em `lib/futebol/campograma.ts`.
- Cálculo do gráfico de posições (contagem por uma das 9 posições) também é lógica pura, testável.
- Arrastar-e-soltar: a Server Action que atualiza `posicao` deve ser coberta manualmente (é uma
  mutação simples de um campo já validado em `atletaBaseSchema`), sem necessidade de teste unitário
  dedicado.
- PDF: verificação visual manual pelo Mateus (mesmo padrão dos outros documentos do sistema, que não
  têm teste automatizado de layout de PDF).
