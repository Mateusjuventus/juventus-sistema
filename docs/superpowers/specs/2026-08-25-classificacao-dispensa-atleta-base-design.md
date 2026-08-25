# Classificação G1/G2/G3 e Relatório de Dispensa (Futebol de Base)

Data: 25/08/2026
Status: rascunho — aguardando revisão do Mateus

## Contexto

Pedido do Mateus, verbatim:

> "preciso de classificar esses atletas como G1, G2 ou G3 e colocar cores como borda nele sabe.
> G1 (verde), G2 (amarelo) e G3 (laranja)
>
> o treinador precisa ter acesso para classificar isso também.
> e preciso que tenha também uma parte pro treinador avaliar esse atleta que já nosso para dispensar.
> não é parecer, é relatório de dispensa. deve conter qual período ele estava aqui."

Duas peças distintas, ambas só no **Futebol de Base** (confirmado com o Mateus — o treinador hoje só
tem acesso a categorias da Base via `categorias_treinador`; o Profissional fica de fora):

1. **Classificação G1/G2/G3** — uma etiqueta de nível/prioridade por atleta, com cor de borda.
2. **Relatório de Dispensa** — documento formal para desligar um atleta que já é do clube (diferente
   do Parecer Final, que é só para candidatos da Captação decidindo se entram ou não).

Ambas ficam disponíveis tanto no cadastro interno (admin) quanto numa área nova do Treinador.

## 1. Classificação G1/G2/G3

Campo novo `classificacao` em `atletas_base`: `"g1" | "g2" | "g3"`, **opcional** (nem todo atleta
precisa estar classificado). Sem significado fixo documentado no sistema — cabe ao clube decidir o
que cada grupo representa; o sistema só guarda o rótulo e mostra a cor.

- **G1** → borda verde (`border-l-4 border-l-green-500`)
- **G2** → borda amarela (`border-l-4 border-l-yellow-400`)
- **G3** → borda laranja (`border-l-4 border-l-orange-500`)

Segue o padrão já usado em `app/competicoes/[id]/adversarios/page.tsx` (`.card` com
`border-l-4 border-l-<cor>`) — não é um componente novo, é a mesma receita aplicada aqui.

**Onde aparece:**
- Nos cards da listagem por categoria (`/base/atletas/[categoria]`) — a borda esquerda do card.
- Na página do atleta (`ver` e editar) — uma faixa/etiqueta com a mesma cor e o rótulo "G1"/"G2"/"G3".
- Sem classificação definida: card e página seguem com a borda neutra atual (sem cor), sem "G0" nem
  rótulo de "não classificado" visível — simplesmente não há destaque.

**Quem edita:**
- Cadastro interno: um `SelectField` novo na seção "Dados esportivos" do formulário de editar atleta
  (`app/base/atletas/atleta-base-form.tsx`), ao lado de Categoria/Posição. Opcional, com "Não
  classificado" como opção neutra.
- Treinador: dentro da nova área "Meus atletas" (seção 2) — um seletor rápido por atleta, sem precisar
  abrir o formulário completo de edição (o treinador não tem acesso ao cadastro completo do atleta,
  só a esse campo específico).

## 2. Área do Treinador: "Meus atletas"

Hoje `/treinador` mostra só a fila de candidatos da Captação (`captacao_base`) das categorias do
treinador. Passa a ter uma seção nova, **"Meus atletas"**, com o elenco (`atletas_base`) dessas mesmas
categorias — atletas que já são do clube, não candidatos.

- Lista em cards, mesmo visual da listagem interna (foto, nome, posição, borda pela classificação),
  mas **somente leitura** para todos os dados exceto:
  - Um seletor de classificação (G1/G2/G3/Não classificado) — salva na hora, sem precisar abrir outra
    tela.
  - Um link "Gerar relatório de dispensa" que leva para a tela da seção 3.
- Atletas com status "Dispensado" não aparecem aqui (coerente com a decisão da seção 4 abaixo — o
  treinador só vê quem ainda está ativo no elenco).
- Sem edição de nenhum outro dado do atleta (RG, telefone, contrato etc.) — isso continua exclusivo do
  cadastro interno.

## 3. Relatório de Dispensa

Documento novo e **diferente do Parecer Final** (que é só para candidatos da Captação, decidindo se
aprova ou dispensa uma inscrição). O Relatório de Dispensa é sobre um atleta que **já é do clube**,
registrando formalmente o desligamento.

**Campos do relatório:**
- **Período no clube** — data de início (`data_inicio_clube`, já existe) até a data da dispensa (novo
  campo `dispensa_data`, editável, default hoje).
- **Motivo da dispensa** — texto livre.
- **Avaliação de desempenho na saída** — as mesmas 4 notas do Parecer Final (Técnica, Física, Tática,
  Comportamental, escala 3 a 9, mesma legenda 3-4 Regular / 5-6 Bom / 7-8 Muito Bom / 9 Excelente).

**Efeito ao gerar:** o atleta passa para um status novo, **"Dispensado"** (hoje só existe
Liberado/Suspenso/Departamento Médico) — só em `atletas_base`, o Profissional não ganha esse status.

**Quem gera:**
- **Treinador** (dentro de "Meus atletas") — preenche os campos e gera o PDF. Depois de gerado, fica
  **travado para ele**: não pode editar nem gerar de novo (mesmo racional do Parecer Final, que também
  trava depois de salvo).
- **Admin** (dentro do cadastro interno do atleta) — pode gerar pela primeira vez OU editar e gerar de
  novo um relatório que o treinador (ou ele mesmo) já tinha feito, a qualquer momento.

**PDF:** mesmo padrão visual dos outros documentos do sistema (`lib/pdf/logistica-shared.tsx` —
cabeçalho com o escudo, cores do clube, bloco de assinatura), gerado sob demanda (sem guardar arquivo,
mesmo esquema do Parecer Final: uma rota `.../dispensa/pdf/route.tsx` que lê os dados salvos e monta o
PDF na hora). Acessível tanto pelo treinador (link "Baixar PDF" depois de gerar) quanto pelo admin
(pelo cadastro do atleta).

Note: já existe uma tela em `/base/atletas/[categoria]/[id]/relatorio` — é um **relatório de
estatísticas** (jogos, período, dados pessoais), sem nenhuma relação com dispensa. Para não confundir
os dois, a tela nova fica em `/base/atletas/[categoria]/[id]/dispensa` (admin) e
`/treinador/atletas/[id]/dispensa` (treinador) — nomes e rotas diferentes, nenhuma reaproveita a outra.

## 4. Comportamento da listagem com atleta dispensado

Confirmado com o Mateus: atleta dispensado **some da listagem principal da categoria** por padrão
(`/base/atletas/[categoria]`) — a query passa a excluir `status = 'dispensado'` a menos que a pessoa
filtre explicitamente por esse status no filtro que já existe (mesmo `<select>` de
Liberado/Suspenso/Departamento Médico, ganha a opção "Dispensado").

Pelo mesmo raciocínio (elenco ativo), o **campograma** (`/base/atletas/campograma`) também passa a
excluir atletas dispensados — hoje ele lista todo mundo da categoria sem filtro nenhum de status; um
atleta dispensado não faz sentido continuar aparecendo posicionado no campo. Esse é o único lugar além
da listagem principal que muda; nenhuma outra tela (convocação, súmula, financeiro) é alterada nesta
spec.

Na página do próprio atleta dispensado (acessível direto pela URL, ou filtrando "Dispensado" na
listagem), o relatório de dispensa fica visível/baixável normalmente.

## Banco de dados

Migration nova em `atletas_base`, só nessa tabela:

```sql
alter table public.atletas_base
  add column if not exists classificacao text check (classificacao in ('g1', 'g2', 'g3')),
  add column if not exists dispensa_motivo text,
  add column if not exists dispensa_nota_tecnica smallint check (dispensa_nota_tecnica is null or dispensa_nota_tecnica between 3 and 9),
  add column if not exists dispensa_nota_fisica smallint check (dispensa_nota_fisica is null or dispensa_nota_fisica between 3 and 9),
  add column if not exists dispensa_nota_tatica smallint check (dispensa_nota_tatica is null or dispensa_nota_tatica between 3 and 9),
  add column if not exists dispensa_nota_comportamental smallint check (dispensa_nota_comportamental is null or dispensa_nota_comportamental between 3 and 9),
  add column if not exists dispensa_data date,
  add column if not exists dispensado_por uuid references public.perfis(id),
  add column if not exists dispensado_em timestamptz;

alter table public.atletas_base drop constraint atletas_base_status_check;
alter table public.atletas_base add constraint atletas_base_status_check
  check (status in ('liberado', 'suspenso', 'departamento_medico', 'dispensado'));
```

Nenhuma mudança de RLS/grant necessária — `atletas_base` já tem a política
`authenticated_full_access` (qualquer usuário autenticado tem acesso à tabela; a restrição por
categoria do treinador é feita no código da aplicação, igual já acontece hoje com `captacao_base` via
`getCategoriasTreinador`).

## Tipos TypeScript

- `AtletaBaseStatus = AtletaStatus | "dispensado"` (novo tipo, só para `AtletaBaseRow.status` —
  mesmo padrão já usado em `AtletaBaseTipoContrato`, que estende `AtletaTipoContrato` com
  "iniciacao" sem mexer no tipo do Profissional).
- `AtletaClassificacao = "g1" | "g2" | "g3"` novo, usado em `AtletaBaseRow.classificacao: AtletaClassificacao | null`.
- Novos campos em `AtletaBaseRow`: `classificacao`, `dispensa_motivo`, `dispensa_nota_tecnica`,
  `dispensa_nota_fisica`, `dispensa_nota_tatica`, `dispensa_nota_comportamental`, `dispensa_data`,
  `dispensado_por`, `dispensado_em`.

## Arquivos afetados

- `supabase/migrations/0087_atleta_base_classificacao_dispensa.sql` (novo).
- `lib/supabase/types.ts` — `AtletaBaseStatus`, `AtletaClassificacao`, novos campos em `AtletaBaseRow`.
- `lib/futebol/classificacao-atleta.ts` (novo) — label e classe de cor por classificação (mesmo
  padrão de `lib/futebol/captacao.ts`: `corCaptacaoStatus`/`captacaoStatusLabel`).
- `lib/validation/schemas.ts` — schema do formulário de dispensa (`relatorioDispensaSchema`, com as
  4 notas 3-9, motivo obrigatório, data de dispensa obrigatória) e `ATLETA_CLASSIFICACAO_OPTIONS`.
- `app/base/atletas/atleta-base-form.tsx` + `actions.ts` + `[categoria]/[id]/page.tsx` — campo
  Classificação no formulário de editar atleta.
- `app/base/atletas/[categoria]/page.tsx` — borda por classificação nos cards, exclui dispensados da
  listagem por padrão, novo item "Dispensado" no filtro de status.
- `app/base/atletas/[categoria]/[id]/ver/page.tsx` — faixa de classificação, e link/estado do
  relatório de dispensa (se já tiver sido gerado).
- `app/base/atletas/[categoria]/[id]/dispensa/page.tsx` + `actions.ts` + `pdf/route.tsx` (novo) —
  tela do admin para gerar/editar o Relatório de Dispensa.
- `app/base/atletas/campograma/page.tsx` — exclui atletas dispensados.
- `app/treinador/page.tsx` — nova seção "Meus atletas".
- `app/treinador/atletas/actions.ts` (novo) — ação de salvar classificação (com checagem de
  categoria via `getCategoriasTreinador`, mesmo padrão de segurança do parecer).
- `app/treinador/atletas/[id]/dispensa/page.tsx` + `actions.ts` (novo) — tela do treinador para gerar
  o Relatório de Dispensa (trava depois de salvo) — reaproveita a mesma lib de PDF/rota do admin.
- `lib/pdf/relatorio-dispensa-document.tsx` (novo) — componente do PDF, mesmo estilo do
  `lib/pdf/parecer-final-document.tsx`.

## Fora de escopo (deliberado)

- Futebol Profissional não ganha classificação nem relatório de dispensa nesta rodada.
- Nenhuma tela nova de "atletas dispensados" dedicada — para ver quem foi dispensado, usa o filtro de
  status já existente na listagem da categoria.
- O treinador não vê uma lista separada de "já dispensados" (diferente do padrão "Já avaliados" que
  existe na Captação) — se quiser conferir depois, é pelo cadastro interno.
