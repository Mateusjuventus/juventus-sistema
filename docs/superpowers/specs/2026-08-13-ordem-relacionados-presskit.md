# Ordem dos Relacionados (alfabética) e do Presskit (goleiro primeiro) — 13/08/2026

Dois ajustes de ordenação pedidos pelo Mateus, valendo para **Futebol Profissional e Futebol de
Base**.

## 1. Pôster de Relacionados em ordem alfabética

Antes, `lib/posters/relacionados-data.ts` ordenava a lista pela numeração da camisa. O pôster é uma
lista de nomes para leitura — quem olha procura um nome, não um número — então a numeração não
ajudava em nada ali. Agora sai em **ordem alfabética pelo nome que aparece**, que é o apelido quando
existe.

O detalhe que faz isso funcionar: ordenar por `nome_completo` (como a consulta chega do banco)
deixaria a lista fora de ordem aos olhos de quem lê, porque quem se chama "Keven Justen" aparece
como "Justen" e cairia depois de "Keven". A ordenação é pelo texto exibido, com `localeCompare`
"pt-BR" para "Ávila" vir antes de "Bruno" em vez de ir para o fim.

Isso virou `lib/futebol/nome-atleta.ts` (`nomeExibido` + `ordenarPorNomeExibido`), puro e testado, e
substituiu a cópia que estava duplicada nos dois formulários de convocação desde o ajuste de 11/08.
Quatro lugares passam a usar a mesma função.

A divisão em duas colunas do pôster não mudou: a primeira metade vai à esquerda, a segunda à
direita — o que agora significa A–L de um lado e M–Z do outro.

## 2. Presskit com o goleiro sempre primeiro

Regra do documento: **goleiro primeiro, em titulares e em reservas**.

- **Profissional** já cumpria por acidente de desenho: ordena por `compararPorPosicao`, e goleiro é
  o rank 0 da ordem tática. Não precisou de mudança de ordenação.
- **Base** ordenava só pela camisa (`compararPorNumeroCamisa`), porque na Base o número é da
  convocação e muda de jogo para jogo. Com isso o goleiro reserva de camisa 12 caía **depois** dos
  de linha 13, 14, 15 — e um goleiro titular de número alto ficava no meio da lista. Passa a usar
  `compararPorNumeroCamisaGoleiroPrimeiro`: goleiro na frente, e o resto (inclusive entre dois
  goleiros) continua pelo número da camisa.

Junto veio `ehGoleiro()`, isolada porque a regra não depende da ordem tática completa — a Base
precisa dela ordenando por número. Ela reconhece "Goleiro"/"Goleira" (sem depender de
maiúscula/acento) e as abreviações "GOL", "GO", "GK", "G", comparadas por **igualdade** e não por
`includes` — senão "GO" casaria com qualquer posição que tivesse essas letras juntas. `rankPosicao`
passou a usá-la também, então as abreviações agora funcionam no Profissional, que antes jogaria um
atleta cadastrado como "GOL" para o fim da lista como posição desconhecida.

## Testado

11 testes novos: `nome-atleta.test.ts` (apelido vazio/só espaço, ordenação pelo texto exibido,
acento, não mutar o array) e a parte nova de `ordem-posicao.test.ts` (abreviações, goleiro de número
maior indo para a frente, desempate entre dois goleiros, goleiro sem número). Total do projeto: 209.
