# Relação de Atletas da Base (por categoria) — design

## Contexto

Pedido do Mateus: hoje, pra gerar uma lista dos atletas que o clube tem, a única opção é o
Relatório Avulso (`app/base/relatorios/avulso`), que junta Atletas + Comissão Técnica + Staff numa
lista só, sem separar por categoria — ele teria que marcar manualmente todos os atletas de todas as
7 categorias pra ter uma visão completa, e o resultado sai tudo misturado, sem nenhuma quebra por
categoria.

Ele quer uma opção nova, mais simples e direta: uma lista só de Atletas, sempre organizada por
categoria (Sub-20, Sub-17, ... Sub-11), com a opção de gerar de todas as categorias de uma vez ou
de uma categoria só.

## Decisões (aprovadas em conversa)

1. **Onde aparece**: um botão "Exportar relação" na tela principal de Atletas da Base
   (`/base/atletas`, a grade das 7 categorias) — abre a exportação já com "Todas as categorias"
   selecionado. E um botão "Exportar relação" dentro de cada categoria
   (`/base/atletas/[categoria]`), ao lado do "Exportar para Excel" que já existe ali — abre a mesma
   tela já com aquela categoria selecionada.
2. **Escopo (todas vs. uma)**: um seletor único ("Todas as categorias" ou uma das 7), não uma
   seleção múltipla de categorias específicas — bate com o pedido literal do Mateus ("selecionar
   todos ou somente uma categoria").
3. **Quais atletas entram (status)**: uma lista de checkboxes de status (Liberado, Suspenso,
   Departamento Médico, Dispensado) — decidido na hora de gerar, com "Liberado" pré-marcado (mas
   pode marcar mais ou desmarcar). Se nenhum status ficar marcado no envio, entende-se como "todos
   os status" (evita gerar um documento vazio por engano).
4. **Quais colunas aparecem**: escolhidas na hora de gerar, igual ao Relatório Avulso hoje — mesmo
   conjunto de colunas de Atleta que já existe lá (ver `COLUNAS_ATLETAS` em
   `lib/pdf/relatorio-avulso-document.tsx`), **menos "Categoria"** (aqui ela já é o título de cada
   bloco, repetir seria redundante), **mais uma nova coluna "Classificação"** (G1/G2/G3/Dispensa
   pendente, via `classificacaoAtletaLabel` de `lib/futebol/classificacao-atleta.ts` — hoje essa
   informação não está em nenhum relatório em PDF, só no Campograma).
5. **Layout do PDF**: mesmo padrão de `lib/pdf/relatorio-geral-base-document.tsx` (seção "Atletas"):
   uma faixa-título por categoria ("Sub-20 (12)"), com sua própria tabela, e "Nenhum atleta
   cadastrado nessa categoria" quando vazia — sempre na ordem canônica de `CATEGORIAS_BASE`
   (Sub-20 → Sub-11). Quando o escopo é uma categoria só, sai apenas aquele bloco. Cabeçalho/rodapé
   reaproveitam `lib/pdf/logistica-shared.tsx` (`DepartamentoEyebrow`, `DocumentoFooter`,
   `sharedStyles`), mesmo padrão de todo documento do sistema.

## Fora de escopo (deliberado)

- Comissão Técnica e Staff **não** entram nesta tela — o Relatório Avulso continua sendo o caminho
  pra isso (ele já cobre bem esse caso, o problema do Mateus era só com a lista de Atletas).
- Nenhuma seleção individual de atleta (diferente do Avulso, que tem uma lista com checkbox por
  pessoa) — aqui entra todo mundo que bater com categoria + status escolhidos. Simplifica a tela: só
  2 filtros (categoria, status) em vez de marcar pessoa por pessoa.
- Excel não muda — o "Exportar para Excel" que já existe em `/base/atletas/[categoria]` continua
  igual, sem relação com esta feature (formatos/casos de uso diferentes: Excel pra manipular dados,
  PDF pra imprimir/compartilhar uma relação formal).

## Estrutura técnica

### Novo: `app/base/atletas/relacao/page.tsx`

Server Component simples (sem busca no Supabase — só precisa da lista estática de categorias). Lê
`searchParams.categoria` (`"todas"` por padrão, ou um valor de `CategoriaBase` vindo do botão da
tela de categoria) e renderiza `<RelacaoAtletasBaseForm categoriaInicial={...} />` dentro do
`AppShell`/`PageHeader` padrão.

### Novo: `components/atletas-base/relacao-atletas-form.tsx`

Client Component. `<form method="POST" action="/base/atletas/relacao/pdf" target="_blank">` (mesmo
padrão de submissão do Avulso — sem Server Action, abre o PDF numa aba nova):

- `<select name="categoria">`: "Todas as categorias" (`value="todas"`) + as 7 de `CATEGORIAS_BASE`,
  `defaultValue={categoriaInicial}`.
- Checkboxes de status (`status_liberado`, `status_suspenso`, `status_departamento_medico`,
  `status_dispensado`), só `status_liberado` marcado por padrão.
- Checkboxes de coluna (mesmo padrão de `GrupoColunas` do Avulso Base): Apelido, Nascimento, CPF,
  RG, Telefone, Posição, Nº Camisa, Nº CBF/FPF, Pé dominante, Naturalidade, Endereço, Início no
  clube, Tipo de contrato, Fim de contrato, Contrato de formação, Empresário, Situação,
  Classificação — mesmos defaults marcados do Avulso (Nascimento, CPF, RG, Telefone, Posição) mais
  Nº Camisa, Situação e Classificação pré-marcados (fazem mais sentido como "roster" padrão do que
  os defaults do Avulso, pensado pra outro caso de uso).
- Botão "Gerar PDF".

### Novo: `app/base/atletas/relacao/pdf/route.tsx`

Mesmo padrão de `app/base/relatorios/avulso/pdf/route.tsx` (POST, lê `FormData`, sem Server
Action). Busca `atletas_base` (`categoria` = valor escolhido, se não for `"todas"`; filtro `.in("status", [...])`
só quando ao menos um checkbox de status foi marcado), agrupa nas 7 categorias (ou só 1), ordena por
nome dentro de cada grupo, monta `RelacaoAtletaLinha[]` e renderiza
`<RelacaoAtletasBaseDocument />`.

### Novo: `lib/pdf/relacao-atletas-base-document.tsx`

Reaproveita a técnica de largura de coluna dinâmica (`ColunaDef`/`larguraColunas`) de
`relatorio-avulso-document.tsx`, com o conjunto de colunas de Atleta menos Categoria mais
Classificação (ver acima), e a estrutura de seção-por-categoria
(`atletasSubtitulo`/`sharedStyles.emptyState`) de `relatorio-geral-base-document.tsx`. Cabeçalho:
título "Relação de Atletas" + subtítulo com o escopo (categoria ou "Todas as Categorias") e quais
status entraram.

### Botões novos

- `app/base/atletas/page.tsx`: `<Link href="/base/atletas/relacao" className="btn-secondary">Exportar relação</Link>`
  ao lado dos botões já existentes (Campograma, Configurações).
- `app/base/atletas/[categoria]/page.tsx`: `<Link href={`/base/atletas/relacao?categoria=${categoria}`} className="btn-secondary">Exportar relação</Link>`
  ao lado do "Exportar para Excel" já existente.

## Verificação final

`npx tsc --noEmit`, `npx vitest run` (novo teste unitário pro agrupamento por categoria e pro
fallback "nenhum status marcado = todos"), `npx eslint` nos arquivos tocados, `npx next build`, e
checagem visual (gerar um PDF de teste com fixture, comparando com `relatorio-geral-base-document`
pro estilo de seção).
