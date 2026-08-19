# Comissão Técnica da Base — uma pessoa em mais de uma categoria

Data: 2026-08-19
Status: aprovado

## O problema

O cadastro de Comissão Técnica da Base (`comissao_tecnica_base`) tem uma `categoria` só por pessoa,
com CPF e RG únicos por linha — não dá nem pra cadastrar a mesma pessoa duas vezes, uma por
categoria. Isso quebra num caso real: um treinador que atende duas categorias ao mesmo tempo (ex.:
Fabinho no Sub-11 e no Sub-12), recebendo um salário só pelas duas (R$3000).

## Decisões (confirmadas com o Mateus)

1. **Categoria vira lista, não valor único** — uma pessoa pode marcar mais de uma categoria no
   cadastro. Mesmo padrão já usado em `perfis.categorias_treinador` (array), não é um conceito novo
   pro banco.
2. **Salário: dividido igual entre as categorias marcadas.** Quem digita um salário mensal e marca
   2 categorias, o Financeiro conta metade do valor em cada uma na quebra "Por categoria" — a
   pessoa continua aparecendo com o valor cheio na listagem nominal (ela recebe R$3000, o que muda
   é só como isso é atribuído por categoria no relatório).
3. **Os cards por categoria da Comissão Técnica somem — vira lista única.** Mesmo padrão já usado
   no Staff Operacional da Base (`/base/staff-operacional`, sem divisão por categoria, com filtro no
   topo). Resolve de raiz o problema de "em qual card essa pessoa aparece": ela aparece na lista
   toda, com um filtro de categoria opcional, e uma coluna mostrando quais categorias ela cobre.

## Modelo de dados

`comissao_tecnica_base.categoria` (text, obrigatório) → `categorias` (text[], obrigatório, pelo
menos 1 item). Migration idempotente (segura pra rodar mais de uma vez, dado o deadlock que já
aconteceu numa migration anterior): adiciona `categorias`, migra o valor antigo pra
`array[categoria]` só se a coluna antiga ainda existir, define not null, adiciona um check
(`categorias <@ array[...] and cardinality(categorias) > 0`), remove a coluna antiga, troca o
índice por um GIN (`categorias`).

## Telas afetadas

- `/base/comissao-tecnica` — de "grade de cards por categoria" pra lista única com busca por nome +
  filtro por categoria (mesmo componente `SearchBar` + `<select>` que o Staff Operacional já usa).
  Nova coluna "Categoria(s)" na tabela.
- `/base/comissao-tecnica/[categoria]/*` (lista, novo, editar, export) — removidos; viram
  `/base/comissao-tecnica/novo`, `/base/comissao-tecnica/[id]`, `/base/comissao-tecnica/export`,
  sem segmento de categoria na URL. O link "+ Nova pessoa" carrega a categoria do filtro ativo (se
  houver) como `?categoria=` só pra pré-marcar o checkbox — não é mais uma obrigação de rota.
- `ComissaoBaseForm` — o `<select>` de Categoria vira um grupo de checkboxes (uma ou mais).
- Depois de salvar (criar/editar/excluir), sempre volta pra `/base/comissao-tecnica` — sem mais a
  lógica de "pra qual categoria redireciona", que não fazia mais sentido com várias categorias por
  pessoa.

## Outros pontos do sistema que liam `categoria` de Comissão Técnica

Levantamento feito por busca no código antes de implementar — todos ajustados pra usar `categorias`
(lista) em vez de `categoria` (valor único):

- `/base/jogos/[id]/convocacao` — filtra a Comissão Técnica disponível pra convocar pela categoria
  do jogo (`.eq("categoria", categoria)` → `.contains("categorias", [categoria])`), senão um
  treinador de duas categorias sumiria da convocação de uma delas.
- `/base/relatorios/avulso/pdf` — mostra a(s) categoria(s) de cada pessoa no PDF avulso (rótulos
  juntos, ex. "Sub-11 · Sub-12", em vez de um só).
- `/base/financeiro` (aba "Geral da Base") — quebra "Por categoria" divide o salário pelas
  categorias da pessoa; listagem nominal mostra o valor cheio e as categorias juntas.

## Fora de escopo

- O mesmo problema pra Staff Operacional ou Atletas — não foi pedido, e não faz sentido pra Atletas
  (um atleta joga numa faixa etária só).
- Valor de salário diferente por categoria (ex.: R$2000 numa, R$1000 noutra) — o Mateus escolheu
  divisão igual automática; valor manual por categoria fica pra depois, se pedido.
