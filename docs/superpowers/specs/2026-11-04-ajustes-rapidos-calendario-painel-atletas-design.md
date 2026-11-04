# Ajustes rápidos — navegação do Calendário e contagem do painel de Atletas

Data: 04/11/2026
Status: aprovado pelo Mateus (ver conversa), pronto para implementação

## Contexto

Dentro da leva grande de ajustes pedida em 04/11/2026 (painel principal novo, contrato do
atleta, comissão técnica etc.), estes dois itens foram escolhidos para ir primeiro por
serem pequenos, isolados, e não dependerem de nenhuma outra frente:

1. Calendário (`/profissional/calendario`) não deixa navegar para outros meses.
2. O painel geral de Atletas (`/atletas`, sem `?categoria=`) conta atletas dispensados nos
   totais, quando não deveria.

As demais frentes da leva grande (Dashboard novo, Contrato do Atleta, Comissão Técnica
etc.) seguem como specs separadas, cada uma no seu próprio ciclo.

## 1. Calendário — navegação entre meses

### Problema

`app/profissional/calendario/page.tsx` sempre calcula `ano`/`mes` a partir de
`hojeBrasilia()` — não há como ver outro mês. Isso era uma limitação conhecida (ver
comentário em `CalendarioWidget`), não um bug introduzido por outra mudança.

### Solução

- A página passa a aceitar `searchParams.ano` e `searchParams.mes` (ambos opcionais).
  Quando ausentes ou inválidos, usa o mês atual — comportamento de hoje preservado.
- `CalendarioWidget` ganha duas setas (◀ mês anterior / mês seguinte ▶) ao lado do título
  "Calendário — Mês de Ano". Cada seta é um link para
  `/profissional/calendario?ano=X&mes=Y`, calculado a partir do mês/ano atualmente exibido
  (com virada de ano nas duas direções: dezembro → janeiro do ano seguinte e vice-versa).
- Quando o mês exibido não é o mês atual, aparece também um atalho "Hoje" para voltar
  rápido, sem precisar clicar várias vezes na seta.
- `gradeDoMes`/`limitesDoMes` (`lib/futebol/calendario.ts`) já recebem `ano`/`mes` como
  parâmetro — nenhuma mudança nelas é necessária.

### PDF do calendário

`app/profissional/calendario/pdf/route.tsx` hoje sempre gera o mês corrente. Por decisão
do Mateus, o PDF deve acompanhar o mês que está sendo visualizado na tela, não ficar
travado no mês atual:

- A rota passa a aceitar os mesmos `?ano=&mes=` (mês atual quando ausentes).
- O link "Gerar PDF" no widget passa esses dois parâmetros vindos do mês atualmente
  exibido, em vez de sempre abrir sem parâmetros.

### Fora de escopo

- Nenhuma outra tela do sistema tem calendário mensal próprio hoje (confirmado por busca
  no repositório) — este ajuste cobre só esta tela.

## 2. Painel geral de Atletas — não contar dispensados

### Problema

Em `app/atletas/page.tsx`, a função `AtletasIndice` (índice `/atletas` sem `?categoria=`,
com os totais Base/Profissional e o card de contagem por categoria) já filtra atletas
inativos:

```ts
supabase.from("atletas").select("categoria, tipo_contrato").eq("ativo", true)
```

Mas não filtra por `status`. Um atleta pode estar com `status = "dispensado"` e ainda
assim `ativo = true` (dispensar não desativa o cadastro automaticamente — são dois campos
independentes, ver comentário em `AtletaRow.ativo`). Isso faz o painel geral continuar
contando atletas dispensados nos totais e nos cards por categoria, mesmo que a listagem
detalhada de cada categoria já esconda "Dispensado" por padrão
(`statusOcultoPorPadrao="dispensado"` em `AtletasResumoFiltros`).

Essa é a única consulta do sistema que monta esse tipo de contagem/painel geral — não há
outro lugar com o mesmo problema (confirmado por busca).

### Solução

Adicionar `.neq("status", "dispensado")` à mesma consulta, junto do `.eq("ativo", true)`
que já existe. Isso ajusta automaticamente:

- Os totais "Base"/"Profissional" no topo do painel.
- A composição por tipo de contrato dentro de cada um.
- O número em cada card de categoria (ex: "Sub-17: 18 atletas ativos").

Nenhuma mudança de schema, nenhuma mudança visual — só a consulta que alimenta os números.
A listagem detalhada de cada categoria (`/atletas?categoria=X`) não muda: ela já mostra
dispensados quando o usuário tira o filtro padrão, e isso continua assim — o ajuste é só
no painel geral/resumo.

## Testes/verificação

- `npx tsc --noEmit -p tsconfig.json` sem erros antes de subir.
- Verificação manual: navegar alguns meses pra frente/trás no Calendário, confirmar que
  volta certo (inclusive virada de ano), gerar PDF em um mês diferente do atual e
  confirmar que sai o mês certo.
- Verificação manual: marcar um atleta como dispensado (sem desativar) e confirmar que ele
  sai da contagem do painel geral, mas continua aparecendo na listagem da categoria dele
  quando o filtro de status é ajustado.
