# Organograma da Base: cartão por comissão, supervisores como nível hierárquico

Data: 15/09/2026

## Contexto

O Organograma da Comissão Técnica/Diretoria do Futebol de Base (`/base/comissao-tecnica/organograma`)
hoje desenha uma grade: uma coluna por função (Treinador, Auxiliar Técnico, Supervisor, Prep.
Físico...) cruzando com uma linha por comissão (Sub20, Sub17, Sub14 e Sub13...). O Mateus reportou
dois problemas, com uma imagem de referência do resultado atual:

1. **Ilegível**: com ~10 colunas de função, a tela encolhe tudo pra sempre caber sem barra de
   rolagem — a letra fica minúscula.
2. **A estrutura real não aparece**: hoje "Supervisor" é só mais uma coluna da grade, com uma pessoa
   diferente preenchida em cada linha. Na vida real, o Gustavo é o supervisor QUE LIDERA as comissões
   Sub20, Sub17 e Sub15, e o Italo lidera Sub14/Sub13 e Sub12/Sub11 — uma relação hierárquica de
   verdade, que a grade não mostra (nenhuma linha de conexão liga o Gustavo especificamente às
   comissões dele).

O processo de brainstorming passou por duas rodadas de mockup: a primeira propôs só separar a grade
em dois blocos (um por supervisor) mantendo colunas de função — o Mateus não gostou do formato
horizontal ("não sei se da forma que está hoje as comissões na horizontal está legal") e pediu pra
virar **um cartão por comissão**, com o nome da comissão como título e a lista de função → pessoa
embaixo, em vez de colunas. Confirmado com um segundo mockup (dados aproximados do print real dele).

## Decisões

### 1. Comissão vira um cartão, não mais uma linha da grade

Cada valor de `linha` (ex.: "Comissão Sub20") passa a ser desenhado como **um cartão só**: título
grená com o nome da comissão, e por baixo uma lista vertical de `função: pessoa` — uma linha de
lista por caixa (`organograma_base`) que pertence àquela comissão. O conceito de "coluna por função"
(cabeçalho de grupo grená no topo de uma coluna) deixa de existir — `grupo` continua sendo o mesmo
campo já cadastrado (o nome da função), só que agora funciona como um **rótulo dentro do cartão**, não
mais como posição de coluna.

- **Só lista quem já tem alguém** — confirmado com o Mateus: sem gerar automaticamente um "???" pra
  toda função que ainda não foi preenchida naquela comissão (diferente do padrão de vaga em aberto
  usado no resto do organograma). Se ele quiser sinalizar uma vaga específica ("a contratar"), cria
  a caixa manualmente, do jeito que já faz hoje pra qualquer vaga em aberto.
- **Ordem das funções dentro do cartão** — fixa, não mais "primeira vez que apareceu": Treinador,
  Auxiliar Técnico, Prep. Físico, Treinador de Goleiro, Analista de Desempenho, Fisiologista,
  Fisioterapeuta, Psicólogo, Massagista, Roupeiro. Uma função fora dessa lista (alguma nova que ele
  crie depois) entra no fim, ordenada por `ordem` (mesmo critério de sempre) — a lista fixa nunca
  trava a criação de uma função nova, só decide a posição de quem já está nela.
- **Renomear os rótulos já cadastrados** — "Fisiologia" → "Fisiologista", "Fisioterapia" →
  "Fisioterapeuta", "Psicologia" → "Psicólogo" (mesmo campo `grupo`, só o texto), pra bater com a
  lista acima. Isso é uma migração de dados (`update`), incluída na migration desta spec.
- Card com altura variável (cresce conforme quantas funções aquela comissão tem preenchidas) — sem
  grade pra alinhar, não tem mais "vão vazio" entre comissões com números diferentes de gente.

### 2. Supervisor sai do cartão e vira um nível de liderança

Uma caixa de liderança (hoje só Presidente/Diretor/Coordenador...) passa a poder ser explicitamente
"quem lidera" um grupo de comissões. Isso já existe pra outras caixas de liderança via `reporta_para`
— o que falta é a MESMA ideia num nível abaixo: qual comissão reporta pra qual supervisor.

Nova tabela `organograma_base_linha` (uma linha por valor de `linha` que já existe em
`organograma_base`), guardando só isso:

```sql
create table if not exists public.organograma_base_linha (
  linha text primary key,
  reporta_para uuid references public.organograma_base(id) on delete set null,
  updated_at timestamptz not null default now()
);
```

Na tela, dentro do mesmo bloco onde já existe "Mover linha pra cima/baixo" (que já trata a comissão
como uma unidade), ganha um campo novo: **"Essa comissão reporta para"** — um `<select>` com as
caixas de liderança existentes. Escolhido uma vez, vale pra comissão inteira (todas as pessoas
daquele cartão), não por pessoa.

O campo genérico "Reporta para" que hoje aparece pra QUALQUER caixa (inclusive célula de grade) some
pra caixas dentro de uma comissão — não faz sentido cada pessoa escolher individualmente pra quem
"reporta", já que é a comissão inteira que reporta pro supervisor. Continua exatamente como está pra
caixas de liderança (Presidente, Diretor, Coordenador, Supervisor...).

Comissão sem supervisor definido (`reporta_para` nulo) continua aparecendo — só cai num grupo à
parte ("sem supervisor definido"), sem quebrar quem ainda não configurou isso.

O Mateus vai precisar reconfigurar as caixas do Gustavo e do Italo depois desta entrega, pela própria
tela: hoje elas são célula de grade (Grupo="Supervisor"); viram caixa de liderança (sem Grupo/Linha,
`reporta_para` = Coordenador Técnico), do jeito que Diretor/Coordenador já são hoje. Isso não muda
nada aqui — é o mesmo formulário de edição que já existe, só com um Grupo/Linha vazios.

**Múltiplos supervisores** — o Mateus avisou que vai adicionar pelo menos mais um supervisor depois.
Nada aqui assume "só 2" em lugar nenhum: qualquer caixa de liderança pode ser escolhida como
supervisor de qualquer conjunto de comissões, sem limite.

### 3. Conectores: coordenador ↔ supervisores ↔ comissões

A árvore de liderança já desenha isso sozinha, sem código novo: como o Gustavo e o Italo passam a
"reportar para" o Coordenador Técnico (igual a qualquer caixa de liderança), o conector
tronco→barramento→pé já existente liga o Coordenador aos dois — e como os dois são filhos do MESMO
pai, o barramento horizontal que já existe entre irmãos é visualmente a "linha ligando um supervisor
ao outro" que o Mateus pediu.

O que é novo: um conector do MESMO tipo (tronco/barramento/pé) descendo de cada supervisor até cada
cartão de comissão que reporta pra ele (usando `organograma_base_linha.reporta_para`) — mesmo
desenho, só que o "filho" agora é um cartão de comissão em vez de uma pessoa. A função compartilhada
`calcularConectores` (usada pela tela E pelo PDF, pra nunca divergir) ganha um parâmetro novo pra
essa lista extra de conexões; a lógica de tronco/barramento/pé em si não muda.

### 4. Tamanho: sem encolher, com rolagem

A tela para de encolher tudo pra sempre caber sem barra de rolagem — as caixas/cartões voltam ao
tamanho normal de leitura. Quando o desenho for mais largo ou mais alto que o cartão, aparece
rolagem (horizontal e vertical) em vez de diminuir a letra. Isso substitui o mecanismo de escala
automática (`calcularEscalaOrganograma`, `ResizeObserver`) por rolagem nativa — mais simples e sem
o histórico de bugs que aquele mecanismo teve (tela tremendo, arrasto errado sob escala etc.).

O PDF não muda nesse ponto — não tem como uma folha "rolar", então continua com o mecanismo já
existente de encolher pra caber numa página (com piso de escala, a folha cresce além de A4 quando
precisa) — só adaptado pro novo formato de cartão em vez de grade.

### 5. Pessoa em mais de uma comissão: cor de fonte diferente

Quando a mesma pessoa vinculada (`comissao_tecnica_base_id`) aparece em cartões de comissões
diferentes (ex.: um Treinador de Goleiro que atende Sub17 e Sub20), o nome dela aparece em
**dourado** em vez da cor normal de nome (grená escuro), em todos os cartões onde ela está — mesmo
princípio do aviso "(já em: ...)" que já existe no seletor de pessoa do painel de edição, só que
visível direto no desenho, sem precisar abrir nada. Só considera pessoas VINCULADAS a um cadastro da
Comissão Técnica (nome digitado à mão não entra nessa comparação, pra não gerar falso positivo por
coincidência de nome). Decidido junto com o Mateus: só cor, sem linha extra conectando as aparições
(evita mais linhas cruzando um desenho que já tem bastante conector de hierarquia).

**Variante: vaga "a contratar" em vermelho.** Já que o cartão só lista quem tem alguém preenchido
(sem "???" automático — item 1), quando o Mateus quiser sinalizar uma vaga em aberto dentro de um
cartão ele mesmo cadastra a caixa manualmente com um nome do tipo "A contratar" (mesma mecânica que
já usa hoje pra qualquer vaga em aberto no organograma). Pra essa vaga se destacar visualmente do
resto do cartão sem precisar de um campo/checkbox novo: quando o nome digitado à mão (sem vínculo)
contém a palavra "contratar" (comparação sem diferenciar maiúscula/minúscula — cobre "A contratar",
"Contratar - Fisioterapeuta" etc.), a fonte do nome fica **vermelha** (`#DC2626`, o mesmo vermelho de
erro/alerta já usado no resto do sistema) em vez da cor normal. Regra independente da do dourado
acima: dourado é só pra gente VINCULADA que aparece 2+ vezes; vermelho é só pra nome digitado à mão
contendo "contratar" — nunca as duas ao mesmo tempo, já que uma pessoa vinculada não vai se chamar
"a contratar".

### 6. Departamento (cargos que atendem todas as comissões)

O Mateus pediu uma forma de cadastrar cargos que não pertencem a uma comissão específica (ex.:
Médico do clube, Nutricionista) — gente que atende TODAS as comissões, não uma categoria. Isso não
precisa de mecanismo novo: é o mesmo cartão do item 1, só que o valor de `linha` descreve um
departamento em vez de uma comissão (ex.: "Departamento Médico"). O cartão aparece do lado dos
cartões de comissão, escolhendo pra quem reporta (Coordenador Técnico, Diretor, o que fizer sentido)
do mesmo jeito do item 2 — sem ficar preso a nenhum supervisor de comissão específico. Não há
distinção de tipo no banco entre "comissão" e "departamento": os dois são a mesma coisa (um grupo de
função→pessoa com um supervisor), só o nome da `linha` muda.

### 7. Formulário de incluir/editar em passos

O painel de criar/editar caixa (hoje todos os campos visíveis de uma vez: pessoa, nome/cargo, Grupo,
Linha, reporta para) passa a se revelar em etapas, mostrando só o que faz sentido a cada momento:

1. **O que está criando** — três opções: "Liderança" (Presidente, Diretor, Coordenador, Supervisor —
   sem Grupo/Linha), "Alguém de uma Comissão", ou "Alguém de um Departamento" (as duas últimas usam
   Grupo/Linha, ver item 6 — a diferença entre elas é só o rótulo mostrado ao escolher/criar a
   Linha: "Comissão" ou "Departamento" nas opções do `<select>` de Linha, não muda nada no banco).
2. **A pessoa** — vinculada da Comissão Técnica ou nome/cargo digitado, igual a hoje.
3. **Só se Comissão/Departamento**: escolhe a Comissão/Departamento (existente ou "+ Novo") e a
   Função dela ali.
4. **"Reporta para"** — sempre visível pra Liderança; pra Comissão/Departamento, só aparece na
   PRIMEIRA caixa criada daquela Linha (é quando se decide o supervisor dela — as próximas pessoas
   da mesma Comissão/Departamento não repetem essa pergunta, o campo "Essa comissão reporta para" do
   item 2 já cobre isso pra quem edita depois).

Elimina campos que hoje aparecem sempre, mesmo sem fazer sentido pro que está sendo criado (ex.: o
aviso de "falta Grupo" que existe hoje simplesmente não pode mais acontecer, já que a etapa 1 decide
isso antes de chegar em Grupo/Linha). Continua sendo o mesmo `<form>`/mesma action de salvar — é uma
mudança de como os campos são apresentados, não de dado gravado.

## Fora de escopo

- Ligar automaticamente uma comissão a um supervisor a partir de algum outro dado — é sempre escolha
  manual no `<select>` novo, mesmo espírito do resto do organograma.
- Editor de conexões livres, zoom manual, exportar como imagem (já fora de escopo desde a spec
  original de 23/08).
- Mudar `categorias_treinador`/`/treinador` ou qualquer coisa do Futebol Profissional — este
  organograma continua sendo só da Base.
- Limite de quantos supervisores ou quantas comissões por supervisor — sem limite algum, item 2 acima.
- Distinguir "comissão" de "departamento" como tipos diferentes no banco — são a mesma estrutura,
  ver item 6.

## Dados

```sql
-- Organograma da Base: qual comissão (linha) reporta pra qual caixa de liderança (supervisor) — ver
-- docs/superpowers/specs/2026-09-15-organograma-cartoes-por-comissao-design.md. Nula até o Mateus
-- escolher pela tela; comissão sem isso continua aparecendo, só cai num grupo "sem supervisor".
create table if not exists public.organograma_base_linha (
  linha text primary key,
  reporta_para uuid references public.organograma_base(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.organograma_base_linha enable row level security;
create policy authenticated_full_access on public.organograma_base_linha
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.organograma_base_linha to authenticated;

-- Renomeia os rótulos de função já cadastrados pra bater com a lista de ordem fixa da spec.
update public.organograma_base set grupo = 'Fisiologista' where grupo = 'Fisiologia';
update public.organograma_base set grupo = 'Fisioterapeuta' where grupo = 'Fisioterapia';
update public.organograma_base set grupo = 'Psicólogo' where grupo = 'Psicologia';

notify pgrst, 'reload schema';
```

Sem mudança em `organograma_base` — `grupo` continua existindo com o mesmo tipo/uso de campo, só
muda como é interpretado no desenho (rótulo dentro do cartão, não mais coluna).

## Telas e arquivos afetados

- `lib/futebol/organograma.ts` — `calcularLayoutAutomatico` reescrita: liderança igual a hoje; membros
  agrupados por `linha` (um cartão por linha, altura variável pela quantidade de itens), cartões
  agrupados sob o supervisor de cada um (via o mapa `linha → reportaPara`, novo parâmetro),
  comissões sem supervisor num grupo à parte. `calcularConectores` ganha o parâmetro de conexões
  supervisor→comissão. `calcularEscalaOrganograma` removida (item 4).
- `components/organograma-editor.tsx` — renderização de cartão em vez de grade de colunas; remove
  `ResizeObserver`/escala, container ganha rolagem; painel de edição reescrito em passos (item 7):
  "O que está criando" (Liderança/Comissão/Departamento) → pessoa → Função+Linha (só
  Comissão/Departamento) → "Reporta para" (Liderança sempre; Comissão/Departamento só na primeira
  caixa da Linha). Campo "Grupo (coluna)" vira só "Função"; "Essa comissão reporta para" (edição de
  uma Linha já existente) continua no bloco de mover linha.
- `lib/pdf/organograma-base-document.tsx` — mesmo formato de cartão, cor de nome por pessoa
  duplicada, conectores supervisor→comissão; mantém a lógica de encolher/crescer página.
- `app/base/comissao-tecnica/organograma/actions.ts` — `salvarNoOrganograma` grava também
  `organograma_base_linha` quando Grupo+Linha vêm preenchidos e o supervisor da linha for informado/
  alterado; `ajustarPosicoesAutomaticas` e o cálculo de layout passam a considerar cartões em vez de
  células.
- `app/base/comissao-tecnica/organograma/page.tsx` — busca `organograma_base_linha` junto e repassa
  pro editor.
- `lib/supabase/types.ts` — novo tipo de linha pra `organograma_base_linha`.
- `lib/futebol/organograma.test.ts` — reescreve os testes de layout pro modelo de cartão; novos
  testes pra agrupamento por supervisor e cor de duplicidade.

## Verificação

- Um organograma com 2 supervisores e 5 comissões distribuídas entre eles: cada comissão aparece
  como um cartão só, agrupada visualmente sob o supervisor certo, com conector supervisor→comissão e
  o barramento coordenador→supervisores.
- Comissão sem supervisor definido continua aparecendo (grupo à parte), sem quebrar nada.
- Cartão só lista função preenchida — nenhum "???" automático aparece dentro dele.
- Ordem das funções dentro de um cartão bate com a lista fixa; uma função nova (fora da lista) cai no
  fim.
- Pessoa vinculada em 2 comissões aparece em dourado nos dois cartões; nome digitado à mão (sem
  vínculo) nunca entra nessa comparação mesmo repetindo por coincidência.
- Uma caixa com nome digitado à mão contendo "contratar" (ex.: "A contratar") aparece em vermelho no
  cartão; qualquer outro nome digitado à mão continua na cor normal.
- Tela: sem encolher além do tamanho normal de leitura; rolagem aparece quando o desenho não cabe.
- PDF: continua cabendo numa página só (ou crescendo além de A4 quando necessário), sem sobrepor
  texto, no novo formato de cartão.
- Um cartão de Departamento (ex.: "Departamento Médico") aparece do lado dos cartões de comissão,
  reportando pra quem for escolhido, sem herdar nenhum supervisor de comissão.
- Criar uma caixa nova: a etapa 1 (Liderança/Comissão/Departamento) decide o resto do formulário —
  nunca aparece campo de Grupo/Linha pra uma caixa de Liderança, nem "Reporta para" repetido pra
  quem entra numa Comissão/Departamento já existente.
- `npx tsc --noEmit`, `npx vitest run`, `npx eslint` e `npx next build` limpos antes da entrega.
- Colar o SQL da migração completo no chat pro Mateus rodar no Supabase antes de qualquer teste
  manual; avisar que ele mesmo precisa reconfigurar as caixas do Gustavo/Italo (virar liderança) e
  escolher o supervisor de cada comissão pela tela nova, depois da migração.
