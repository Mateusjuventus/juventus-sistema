# Relacionados, Concentração e Dia de Jogo (pôsteres) — Design

**Data:** 2026-07-17
**Autor:** Mateus Santos (Supervisor de Futebol Profissional — Juventus)
**Status:** Aprovado

## Contexto

Mateus mandou 3 imagens de referência (feitas hoje fora do sistema, provavelmente no Canva) que ele
usa hoje pra divulgar cada jogo: um pôster **RELACIONADOS** (lista de atletas convocados em duas
colunas), um pôster **CONCENTRAÇÃO** (cronograma do dia anterior ao jogo) e um pôster **DIA DE
JOGO** (cronograma do próprio dia do jogo). Os três seguem a mesma identidade visual: escudos no
topo, faixas vinho/dourado, títulos em fonte grossa e arredondada (**Anton**), rodapé
`#MOLEQUETRAVESSO`.

Hoje o sistema já gera PDFs a partir da convocação de um jogo (Presskit, Rooming List, Ônibus,
Credenciamento, Recibo — ver `2026-07-09-convocacao-presskit-logistica-design.md`), todos usando
`@react-pdf/renderer`. Este documento cobre a criação desses 3 pôsteres novos, reaproveitando a
convocação já existente para o RELACIONADOS e criando um cronograma editável por jogo para
CONCENTRAÇÃO e DIA DE JOGO — com exportação em **PDF e JPG** para os três.

Cadastro de Competições com foto/logo (mencionado por Mateus, pra sair automaticamente nos
documentos) fica **fora de escopo deste documento** — combinado que essa parte entra numa rodada
separada depois que os 3 pôsteres estiverem prontos. Até lá, o nome da competição continua sendo
texto livre (campo `competicao` do jogo, como já é hoje) e sem logo próprio no cabeçalho.

## Objetivo

A partir da tela de um jogo já cadastrado:

1. Na aba **Convocação**, gerar o pôster **RELACIONADOS** (PDF ou JPG) com os atletas convocados,
   cada um mostrado pelo **apelido** (campo novo em Atletas), em duas colunas de caixas vinho, no
   mesmo layout da referência.
2. Numa aba nova **Programação**, montar e gerar os pôsteres **CONCENTRAÇÃO** e **DIA DE JOGO** (PDF
   ou JPG cada), cada um com uma lista de linhas horário/atividade/local totalmente editável por
   jogo (ex: "12:00 · Almoço · Javari").

## Fora de escopo

- Cadastro de Competições com logo/foto própria (rodada futura, combinada com Mateus).
- Qualquer mudança nos documentos que já existem (Presskit, Rooming List, Ônibus, Credenciamento,
  Recibo, Financeiro) — esses continuam usando nome completo, sem apelido, exatamente como estão.
- Apelido para Staff Operacional — não existe pedido pra isso; staff não aparece em nenhum dos 3
  pôsteres novos.
- Edição/reordenação por arrastar-e-soltar nas linhas de programação — a lista é editada por
  formulário simples (adicionar linha, editar campos, remover linha), sem drag-and-drop.
- Envio automático desses pôsteres pra WhatsApp/Instagram — a geração só produz o arquivo
  (PDF/JPG) pra download; o compartilhamento continua manual, fora do sistema, como já é hoje com o
  Presskit.

## Modelo de dados

### Alterações em tabelas existentes

- `atletas`: novo campo `apelido` (texto, opcional). Aparece no cadastro logo abaixo de "Nome
  completo". Quando vazio, o pôster RELACIONADOS usa o nome completo no lugar (nunca trava a
  geração por falta de apelido).
- `comissao_tecnica`: novo campo `apelido` (texto, opcional) — adicionado pro cadastro ficar
  consistente com Atletas, mesmo não sendo usado por nenhum dos 3 pôsteres deste documento (comissão
  técnica não entra na lista de RELACIONADOS, que é só de atletas).
- `jogos`: 3 campos novos, todos opcionais:
  - `concentracao_data` (date) — dia da concentração, que pode ser diferente do dia do jogo (ex:
    concentração na quarta, jogo na quinta). Enquanto vazio, os botões de gerar Concentração ficam
    desabilitados com um aviso pra preencher a data primeiro.
  - `concentracao_regras` (text) — o texto das "Orientações de Concentração" (lista de regras).
    Recebe um valor padrão pré-preenchido (as 5 regras do exemplo de Mateus) toda vez que o jogo é
    criado, mas fica editável por jogo caso precise mudar algo específico daquela partida.
  - `dia_jogo_liberacao` (text, opcional) — a frase final do pôster Dia de Jogo (ex: "Atletas
    liberados após o almoço!"). Livre, sem valor padrão — Mateus preenche na hora.

### Tabela nova: `jogo_programacao_itens`

Uma linha por item de cronograma (horário + atividade + local), pertencente a um jogo e marcada como
`concentracao` ou `dia_jogo` — as duas seções guardam linhas na mesma tabela, diferenciadas pelo
`tipo`.

```sql
create table public.jogo_programacao_itens (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogos(id) on delete cascade,
  tipo text not null check (tipo in ('concentracao', 'dia_jogo')),
  ordem integer not null default 0,
  horario text not null,       -- texto livre: aceita "12:00" ou "7:00 às 7:45", como no exemplo
  atividade text not null,     -- ex: "Almoço", "Entrada em campo" — ignorado quando eh_confronto = true
  local text not null,         -- ex: "Javari", "Vestiário"
  eh_confronto boolean not null default false, -- ver abaixo
  created_at timestamptz not null default now()
);
```

`horario` é texto livre (não um tipo `time` do Postgres) porque o exemplo de Dia de Jogo tem uma
linha "7:00 às 7:45" — um intervalo, não um horário único.

`ordem` é preenchida automaticamente (posição em que a linha foi adicionada) e usada só pra manter a
sequência de exibição — reordenar significa remover e recriar a linha na posição certa (sem
drag-and-drop, conforme "Fora de escopo").

Uma linha especial do Dia de Jogo — o confronto em si (ex: "JUVENTUS X FERROVIÁRIA") — **não** é
digitada como texto de atividade: no formulário de adicionar linha da seção Dia de Jogo, existe um
checkbox "Esta linha é o confronto" — quando marcado, o campo de atividade fica desabilitado e o
pôster preenche esse texto sozinho, a partir do adversário + mandante do jogo (do mesmo jeito que já
aparece hoje em Convocação). Evita que Mateus precise digitar o nome do adversário de novo e erre a
formatação, e evita qualquer ambiguidade de "palavra mágica" no texto da atividade.

RLS: mesma regra das demais tabelas de logística de jogo — leitura para `authenticated`, escrita só
para quem tem o módulo Jogos liberado (sem policy adicional além do que já existe hoje pra tabelas
dependentes de `jogos`).

## Telas

### Convocação (aba já existente) — botão "Gerar Relacionados"

Ao lado do botão "Gerar Presskit (PDF)" que já existe, dois novos: **"Relacionados (PDF)"** e
**"Relacionados (JPG)"** — habilitados assim que a convocação tiver ao menos 1 atleta titular ou
reserva salvo (mesma regra do Presskit hoje).

### Programação (aba nova)

Duas seções na mesma página, cada uma com:

- Um formulário pra adicionar linha (horário, atividade, local + botão "Adicionar"), e a lista das
  linhas já adicionadas, cada uma com botão "Remover".
- Seção Concentração: campo de data (`concentracao_data`) e uma caixa de texto com as regras
  (`concentracao_regras`, pré-preenchida, editável).
- Seção Dia de Jogo: campo de texto livre pra frase de liberação (`dia_jogo_liberacao`). A data
  usada no pôster é sempre `jogos.data_jogo` (não duplica campo).
- Ao fim de cada seção: botões "Gerar Concentração (PDF)" / "(JPG)" e "Gerar Dia de Jogo (PDF)" /
  "(JPG)" — desabilitados enquanto a seção não tiver nenhuma linha adicionada (Concentração também
  exige `concentracao_data` preenchida).

### Cadastro de Atletas / Comissão Técnica

Campo "Apelido" novo, texto livre opcional, logo abaixo de "Nome completo" nos formulários de
criar/editar.

## Geração do PDF e do JPG

Os 3 pôsteres reaproveitam a paleta e os componentes visuais já usados no Presskit (`lib/pdf/`):
vinho `#5C0A35`, vinho escuro `#3F0724`, dourado `#C9A227`, escudo do Juventus
(`public/brand/juventus-escudo-mark.png`) e o escudo do adversário (`jogos.adversario_logo_path`,
já existente). Título e faixas usam a fonte **Anton** (baixada como arquivo `.ttf` e adicionada em
`public/fonts/`, do mesmo jeito que a fonte da assinatura do Presskit).

**PDF:** `@react-pdf/renderer`, a mesma ferramenta já usada em todos os PDFs do sistema hoje — um
documento novo por pôster em `lib/pdf/` (`relacionados-document.tsx`,
`programacao-concentracao-document.tsx`, `programacao-dia-jogo-document.tsx`), servidos por rotas
`route.tsx` iguais às que já existem (`app/jogos/[id]/relacionados/pdf/route.tsx` etc.).

**JPG:** o sistema ainda não gera imagem nenhuma hoje. Em vez de adicionar uma ferramenta pesada tipo
navegador headless (Puppeteer/Chromium, que deixaria o site mais lento e mais caro no Vercel), a
imagem é gerada com o `ImageResponse` que já vem embutido no Next.js (`next/og`) — desenha o mesmo
layout usando um subconjunto de HTML/CSS e devolve uma imagem pronta, sem depender de programa
externo. O resultado sai como PNG (mesma nitidez de texto que um JPG, sem perda de qualidade) e é
convertido para `.jpg` de fato com a biblioteca `sharp` antes de entregar o arquivo pro download —
assim o arquivo que Mateus recebe é realmente um `.jpg`, do jeito que ele pediu. `sharp` é uma
biblioteca padrão e leve, usada por milhares de projetos Next.js — só está sendo adicionada agora
porque, até aqui, o sistema nunca tinha precisado gerar imagem.

Como o layout dos 3 pôsteres precisa existir tanto em `@react-pdf/renderer` (pro PDF) quanto em
`next/og` (pro JPG) — são duas tecnologias diferentes, cada uma com seu próprio jeito de descrever
o layout —, o código é organizado assim: uma função só busca e prepara os dados de cada pôster (ex:
`buildRelacionadosData(jogoId)`, que busca convocação + apelidos), e essa mesma função alimenta os
dois "desenhos" (PDF e JPG) de cada pôster. Isso evita duplicar a lógica de busca de dados — só o
desenho visual é escrito duas vezes (inevitável, dado que são ferramentas diferentes), mas os dois
desenhos de um mesmo pôster ficam lado a lado no mesmo arquivo pra facilitar manter os dois
iguais se algo mudar no layout depois.

## Plano de entrega

Como em todas as rodadas anteriores: Mateus recebe um `.zip` com os arquivos alterados/novos (upload
manual pelo GitHub) e o SQL das migrações novas (`apelido` em Atletas/Comissão, os 3 campos novos em
Jogos, e a tabela `jogo_programacao_itens`) pra colar no SQL Editor do Supabase. Nenhuma migração
anterior pendente é necessária além da correção de GRANT já entregue na rodada passada.

## Pendências / decisões já tomadas nesta conversa

- RELACIONADOS mostra **só atletas** (não inclui comissão técnica nem staff).
- Apelido ausente nunca bloqueia a geração — cai pro nome completo.
- Linhas de Concentração/Dia de Jogo são livres por jogo (sem template fixo travado).
- Regras de Concentração têm um texto padrão pré-preenchido, editável por jogo; a frase de liberação
  do Dia de Jogo é sempre digitada na hora, sem padrão.
- Fonte dos títulos: **Anton**.
