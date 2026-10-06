# Fisioterapia (Base): filtro de categoria em gráfico de pizza + painel de status

## Contexto

Ajuste pedido pelo Mateus em seguida à entrega da Fisioterapia do Futebol de Base
(`docs/superpowers/specs/2026-10-06-fisioterapia-base-design.md`). Ele mandou um print do bloco
"Posições" de `AtletasResumoFiltros` (cards com contagem de "aptos"/"não aptos" por posição,
usado em `/atletas` e `/base/atletas`) como referência de estilo, e pediu duas coisas na tela
`/base/departamento-medico/fisioterapia`:

1. Trocar o `<select>` de categoria (único, "uma categoria por vez") pelo mesmo gráfico de pizza +
   legenda clicável que a Assistência Social já tem (`PizzaCategoria`, em
   `assistencia-social-listagem.tsx`), permitindo marcar várias categorias ao mesmo tempo
   (confirmado via pergunta ao usuário — ele escolheu "várias ao mesmo tempo").
2. Um painel novo, mesmo estilo (pizza + legenda), mostrando quantos atletas estão em cada
   **status**: Apto (liberado), Não apto (suspenso), Depto. Médico (departamento_medico) — com
   contagem e porcentagem de cada, também clicável pra filtrar a grade.

Confirmado com o usuário: a Assistência Social **não** muda — ela já tem o gráfico de categoria
(nada a fazer lá), e o painel de status/porcentagem é só pra Fisioterapia (não existe um "status"
de atleta na Assistência Social; lá o equivalente seria Demandas, fora de escopo aqui).

## Fora de escopo

- Qualquer mudança em `app/base/assistencia-social/*` (já está como deveria ficar).
- Extrair um componente de pizza genérico compartilhado entre as 3 telas que já têm um
  (Assistência Social, Fisioterapia Base, `AtletasResumoFiltros`) — mantém o padrão já estabelecido
  nesta base de código de cada tela ter sua própria cópia pequena do helper de pizza (mesmo critério
  usado ao duplicar `fisioterapia-base.ts`/`status-historico-base.ts` em vez de generalizar os
  originais do Profissional).
- Filtro de status na Fisioterapia do **Profissional** — não foi pedido, só na Base.
- "Dispensado" não entra no painel de status: a query da tela já restringe a `ativo = true`, e
  atletas dispensados não aparecem nela (mesma regra de hoje).

## Design (revisado após o usuário mandar um print do bloco "Posições" de `AtletasResumoFiltros")

O Mateus mandou duas vezes o print do bloco "Posições" (cartões com borda, um por posição, contagem
dentro) e pediu esse estilo pra categoria — mas também pediu pra manter o gráfico de pizza ("gostei
do design"). Em vez de pizza pros dois (plano original desta spec, revisado agora) ou cartão pros
dois, a combinação que atende os dois pedidos sem repetir a mesma informação duas vezes é a mesma
estrutura que `AtletasResumoFiltros` já usa hoje pra Posição (cartão) + Contrato (pizza): um lado
cartão, outro pizza, cada um com uma dimensão diferente.

### Categoria — cartões em grade (substitui o `<select>`)

Mesmo estilo visual do bloco "Posições" (borda arredondada, rótulo em negrito pequeno + números
embaixo, clique alterna seleção) — mas cada cartão é uma categoria, não uma posição, e mostra
contagem total + porcentagem do elenco (não a quebra apto/não apto, que fica no painel de Status ao
lado — ver abaixo, pra não repetir a mesma informação nos dois blocos). Clique no cartão alterna a
categoria num `Set<CategoriaBase>` (multi-seleção, confirmado com o usuário). Conjunto vazio = todas
as categorias. Continua restrito a `categoriasPermitidas` (quem só vê Sub-11 a Sub-14, por exemplo,
só vê esses cartões). Cada cartão ganha um quadradinho colorido com a cor de `CATEGORIA_BASE_COR`
(mesma cor já usada pra categoria em qualquer outro lugar do sistema), pra manter alguma ligação
visual com a pizza removida daqui.

### Status — pizza + legenda (mantém o estilo que o usuário disse ter gostado)

Mesmo componente/matemática de `PizzaCategoria` (Assistência Social)/`PizzaContrato`
(`AtletasResumoFiltros`): `fatiasPizza` sobre as contagens, clique na fatia ou na legenda alterna.
Essa é a pizza que sobrevive no desenho final — ela é quem mostra a porcentagem que o Mateus pediu
("10% Departamento Médico", algo assim), igual ao papel que a pizza de Contrato já tem em
`AtletasResumoFiltros`. 3 status possíveis na lista (que já é só `ativo = true`):

| status (banco) | rótulo | cor |
|---|---|---|
| `liberado` | Apto | verde (emerald, igual ao "apto" de `AtletasResumoFiltros`) |
| `suspenso` | Não apto | âmbar |
| `departamento_medico` | Depto. Médico | vermelho (igual à borda "em tratamento" já usada nos cards) |

Mesmo mecanismo: `Set<AtletaBaseStatus>` (multi-seleção), clique na fatia/legenda alterna, conjunto
vazio = todos os status. Rótulos reaproveitam exatamente os já usados em `STATUS_LABEL_BASE`
(`historico-status-modal-base.tsx`), pra não introduzir um terceiro nome pro mesmo status na mesma
tela.

### Layout

Um único `card` no topo da listagem, `grid lg:grid-cols-2`: Categoria (cartões) à esquerda, Status
(pizza) à direita — mesmo padrão de `AtletasResumoFiltros`, que já põe Posições (cartões) e Contrato
(pizza) lado a lado em telas largas.
Abaixo, a busca por nome e "Limpar filtros" (zera os dois `Set`s e a busca) — mesma linha que já
existe hoje.

A grade de cards abaixo é filtrada pelos três critérios combinados (categoria E status E busca),
mesma lógica client-side que já existe (sem round-trip ao servidor). O indicador visual "em
tratamento" (borda vermelha no card, baseado em lesão ativa) continua existindo e é independente do
novo filtro de status — uma coisa é "está com lesão ativa agora" (fisioterapia), outra é o status
cadastral do atleta (`atletas_base.status`), que já pode divergir por um dia até a sincronização
automática rodar.

### Dado novo necessário

`FisioterapiaAtletaItemBase` (tipo em `app/base/departamento-medico/fisioterapia/page.tsx`) ganha um
campo `status: AtletaBaseStatus`, populado a partir de `atleta.status` (já vem no `select("*")`
existente — não precisa de nova query).

## Verificação

- `npx tsc --noEmit`, `npx eslint` nos arquivos alterados, `npx vitest run`, `npx next build`.
- Conferir visualmente (dados de teste, já que o sandbox não conecta no Supabase real): duas pizzas
  lado a lado, clique em categoria E status filtrando juntos, "Limpar filtros" zerando os três
  campos, contagens batendo com o elenco total.
