# Parecer Final de Avaliação + acesso do Treinador — 19/08/2026

## O pedido

Três coisas na mesma mensagem, com um modelo de PDF do Corinthians anexado como referência visual:

> a parte de quem faz a inscrição, remover a parte de alojamento e deixar isso como opção para mim
> colocar. e quero que crie uma ficha sabe. vou te mandar tipo um modelo: a ficha é só um modelo. é
> do Juventus. assinaturas somente 3 e se precisar adiciono mais. ai quanto a questão das notas,
> quem irá preencher será o treinador. vou criar um acesso e ele fará o preenchimento. então na aba
> dele só aparecem os atletas dele. então ele vai ter um cadastro e vou demilitar a categoria dele.

Três pedaços, dois deles ligados um ao outro (o parecer só existe porque alguém — o Treinador —
precisa preenchê-lo) e um totalmente independente:

1. Tirar "Precisa de alojamento" do link público de inscrição — vira campo só do staff.
2. Um documento novo, "Parecer Final de Avaliação" (PDF), no molde do modelo do Corinthians, com a
   marca do Juventus.
3. Um papel de usuário novo, **Treinador**, restrito a uma ou mais categorias, que é quem preenche
   as notas do parecer — não o Mateus.

Confirmado por perguntas de esclarecimento ao longo da conversa (ver `2026-08-19-captacao-atletas-
separacao-design.md` e `2026-08-19-captacao-base-design.md` pro histórico da Captação em si):

- O Treinador só preenche as 4 notas + Comentários finais + veredito. Não vê nem edita mais nada do
  candidato (telefone, endereço, indicação etc.), e não tem acesso a nenhuma outra parte do sistema.
- O veredito do parecer usa a MESMA nomenclatura do status da Captação — "Aprovado" ou "Dispensado"
  (não "Reprovado", pra não ter duas palavras pra mesma coisa). Ao salvar o parecer, o status do
  candidato muda sozinho pro valor escolhido. "Não compareceu" continua sendo só o Mateus quem marca,
  fora do fluxo do Treinador (não é uma nota de avaliação).
- Foto do candidato: upload feito pelo staff na tela interna de Captação, não pelo candidato no link
  público (controle de qualidade da imagem que vai no documento oficial).
- "Clube anterior": campo novo, não existia.
- Assinaturas do parecer: configuração fixa (uma tela só, parecida com a que já existe pro
  Financeiro), reaproveitada em todo parecer gerado — mas com uma lista que cresce (não um número
  fixo de campos), já que o Mateus pediu "3 e se precisar adiciono mais".

## Abordagem escolhida pro Treinador

Três formas de encaixar isso foram discutidas com o Mateus; a escolhida foi a mais isolada:

- **Escolhida — papel novo, tela própria.** `perfis.role` ganha o valor `"treinador"`, e
  `perfis` ganha `categorias_treinador` (uma lista — ver "Por que uma lista de categorias" abaixo).
  O Treinador loga e cai direto em `/treinador` — uma tela fora do `AppShell`/menu de departamentos,
  sem nenhum link pro resto do sistema. Qualquer outra URL redireciona ele de volta pra lá (ver
  seção de Middleware). É a que dá a garantia mais forte de que ele não vê nada além do que devia,
  porque a tela em si nunca teve os outros campos/ações — não é uma questão de "esconder" coisa de
  uma tela que already tem tudo.
- **Rejeitada — usuário "regular" comum, só com Captação liberado.** Esconder pedaço por pedaço da
  tela `/base/captacao` que já existe (busca, categoria/UF, botão de novo candidato, PDF, editar
  telefone/endereço/mãe-pai etc.) pra esse tipo de usuário. Funciona, mas é frágil: a tela atual foi
  desenhada pro Mateus, com bem mais campos e ações do que o Treinador deveria ver, e cada campo
  novo que a Captação ganhar no futuro precisaria lembrar de checar "isso aparece pro Treinador?".
- **Rejeitada — link público por categoria, sem login.** Mais rápido de construir (mesmo padrão do
  link de inscrição), mas o Mateus foi explícito que quer *criar um acesso* pro treinador — um
  cadastro de verdade, não um link solto — e um link sem login também não registra qual treinador
  preencheu o quê.

### Por que uma lista de categorias, não uma só

Ajuste feito depois da primeira versão deste spec: o Mateus deu um exemplo concreto — "o Fabinho
selecionou Sub 11 e Sub 12 e pode fazer dos dois" — um treinador pode acumular mais de uma
categoria. `categorias_treinador` é um array (`text[]`), mesmo formato que `departamentos_permitidos`/
`modulos_base_permitidos` já usam em `perfis` hoje — não é um conceito novo pro banco, só mais uma
coluna do mesmo tipo. A tela `/treinador` passa a listar candidatos de TODAS as categorias do
treinador logado (`categoria in (...)`, não `=`), e o cabeçalho da tela mostra as categorias dele
como uma lista/tags em vez de um nome só.

### Middleware e redirecionamento

`lib/supabase/middleware.ts` ganha uma checagem cedo, antes da checagem de departamento/módulo que
já existe: se `role === "treinador"`, qualquer pathname que não comece com `/treinador` (e não seja
`/login` ou rota de logout) redireciona pra `/treinador`. Isso cobre inclusive `/` (a Home que hoje
mostra os cartões de departamento) e `/profissional`/`/base` — o Treinador nunca vê essas telas. O
redirecionamento pós-login (`app/login`) também passa a checar o papel e mandar treinador direto pra
`/treinador` em vez de `/`.

### Criação do acesso

Continua tudo em `/usuarios` (só quem é master acessa hoje, sem mudança nisso). O formulário de
criar usuário (`UsuarioForm`) ganha "Treinador" como opção de papel; quando selecionado, troca os
checkboxes de módulos/departamentos pelos checkboxes de Categoria (mesma lista de
`CATEGORIAS_BASE`, um por linha, mais de uma marcável) — reaproveita o mesmo
`PermissaoCheckboxesForm` genérico que já existe pra módulos/departamentos/categorias de
tarefa/estoque, só apontado pra `CATEGORIAS_BASE` em vez de outra lista. Treinador não tem
departamentos nem módulos, só as categorias.

## Modelo de dados

### `captacao_base` ganha colunas novas

| Coluna | Tipo | Observação |
|---|---|---|
| `foto_path` | `text`, nullable | Mesmo padrão de `atletas_base.foto_path` — caminho no Storage. |
| `clube_anterior` | `text`, nullable | Novo campo, não existia. |
| `nota_tecnica` | `smallint`, nullable | Preenchida pelo Treinador. Check `between 3 and 9`. |
| `nota_fisica` | `smallint`, nullable | Idem. |
| `nota_tatica` | `smallint`, nullable | Idem. |
| `nota_comportamental` | `smallint`, nullable | Idem. |
| `parecer_comentarios` | `text`, nullable | "Comentários finais" do modelo. |
| `parecer_preenchido_em` | `timestamptz`, nullable | Quando o Treinador salvou o parecer. |
| `parecer_preenchido_por` | `uuid`, nullable, `references perfis(id)` | Qual treinador preencheu — accountability, já que mais de um treinador pode ter acesso à mesma categoria (ex.: Fabinho cobre Sub-11 e Sub-12, mas outro treinador pode também estar em Sub-12). |

Ficam como colunas diretas em `captacao_base` (não uma tabela separada de "pareceres"): não existe
hoje a necessidade de mais de uma avaliação por candidato ao longo do tempo — o parecer é 1:1 com o
ciclo de avaliação atual dele, do mesmo jeito que `data_termino` (adicionada nesta mesma sprint) já
é. Uma tabela separada só valeria a pena se um candidato pudesse ser reavaliado do zero mantendo
histórico de pareceres antigos, o que ninguém pediu.

### `perfis` ganha coluna nova

| Coluna | Tipo | Observação |
|---|---|---|
| `categorias_treinador` | `text[]`, not null, default `'{}'` | Só usada quando `role = 'treinador'`. Cada item é uma `CategoriaBase`. Mesmo padrão de `departamentos_permitidos`/`modulos_base_permitidos`. |

`role` (`perfis_role_check` ou equivalente) passa a aceitar `'master' \| 'regular' \| 'treinador'`.

### Configuração das assinaturas — tabela nova

Diferente do padrão `assinatura1Nome/assinatura1Cargo` do Financeiro (fixo em 2), aqui o Mateus
pediu algo que cresce. Em vez de colunas fixas, uma tabela singleton com um array:

```sql
create table public.configuracoes_parecer_captacao_base (
  id uuid primary key default gen_random_uuid(),
  assinaturas jsonb not null default '[
    {"nome": "", "cargo": ""},
    {"nome": "", "cargo": ""},
    {"nome": "", "cargo": ""}
  ]'::jsonb,
  updated_at timestamptz not null default now()
);
```

A tela de configuração (dentro de `/base/captacao`, só visível pro Mateus/staff — não pro Treinador)
lista as assinaturas com um botão "+ Adicionar assinatura" e um "Remover" por linha, mesmo espírito
das listas de itens já usadas em Solicitações (`solicitacao_itens` e afins) — só que aqui é um JSON
simples dentro de uma linha só, não uma tabela relacional, porque não precisa de histórico nem de
vínculo com outra entidade.

## O documento — Parecer Final de Avaliação (PDF)

Mesma estrutura do modelo do Corinthians enviado, com a marca do Juventus. Reaproveita
`lib/pdf/logistica-shared.tsx` (cabeçalho com o escudo, cores `CORES.grenaEscuro`/`CORES.dourado`,
rodapé) do mesmo jeito que `captacao-document.tsx` já faz — não recria estilo do zero.

Conteúdo (campos do candidato + os novos):

- Foto (se tiver `foto_path`; sem foto, um retângulo com as iniciais, mesmo tratamento visual que
  outros documentos do sistema já dão a "sem foto").
- Nome do candidato, Apelido (`captacao_base` não tem "apelido" hoje — fica de fora; o modelo do
  Corinthians tem, mas não foi pedido e o resto do sistema de Captação também não usa apelido).
- Data de nascimento, Categoria, Posição.
- Cidade atual (cidade/UF já existentes), Clube anterior (novo), Indicação.
- As 4 notas com a legenda (3-4 Regular, 5-6 Bom, 7-8 Muito Bom, 9 Excelente) — mesmo texto do
  modelo.
- Parecer final: Aprovado/Dispensado (reflete o campo `status` no momento em que o PDF é gerado —
  não duas fontes de verdade).
- Comentários finais.
- Início da avaliação / Final da avaliação (`data_inicio`/`data_termino`, já existentes).
- As assinaturas da configuração (nome + cargo cada, quantas estiverem cadastradas).

Rota nova: `app/base/captacao/[id]/parecer/pdf/route.tsx`, no mesmo molde de
`app/base/captacao/pdf/route.tsx` (busca o candidato, monta o buffer, devolve `application/pdf`).
Um botão "Gerar Parecer" aparece na tela do candidato (`/base/captacao/[id]`) sempre que ele não
estiver mais em "inscricao" — mesmo que as notas ainda não tenham sido preenchidas (saem em branco/
"—" no PDF), porque o Mateus pode querer conferir o layout antes do Treinador preencher.

## Tela do Treinador (`/treinador`)

Página única, fora do `AppShell` comum (sem menu de departamento/módulo — só um cabeçalho simples
com as categorias dele, ex. "Sub-11 · Sub-12", e um botão de sair). Lista os candidatos de
`captacao_base` onde `categoria = any(perfil.categorias_treinador)` e `status = 'avaliacao'` — é só
isso que ele precisa agir, de todas as categorias dele juntas (a categoria de cada candidato aparece
no card, já que agora podem ser mais de uma). Abaixo, uma seção secundária, só leitura, com os
candidatos dessas categorias já decididos (Aprovado/Dispensado/Não compareceu) — pra ele conseguir
conferir o que já preencheu, sem poder editar depois de salvo (evita divergência entre o que foi
impresso/assinado e o que está no banco).

Abrir um candidato pendente leva a um formulário simples: as 4 notas (`<select>` de 3 a 9, não
texto livre — evita nota fora da escala), Comentários finais, e o veredito (Aprovado/Dispensado).
Uma Server Action nova, `salvarParecerCaptacao`, faz tudo isto numa chamada só:

1. Confirma que quem está logado é `treinador` e que a categoria do candidato está entre as
   `categorias_treinador` dele (dupla checagem — a query já filtra por categoria, mas a Server
   Action confirma de novo, já que Server Actions são endpoints públicos e não devem confiar só no
   que a tela mostrou).
2. Grava as 4 notas, os comentários, `parecer_preenchido_em` (agora) e `parecer_preenchido_por`
   (o id do treinador).
3. Atualiza `status` pro veredito escolhido, reaproveitando a mesma regra de carimbar
   `data_termino` automaticamente que `mudarStatusCaptacao` já usa hoje (mesmo comportamento, então
   a lógica de "carimbar `data_termino` se ainda não tiver uma" sai de `mudarStatusCaptacao` pra uma
   função pequena compartilhada, chamada pelas duas Server Actions).

### O que o Mateus vê na tela interna do candidato

`/base/captacao/[id]` passa a mostrar as 4 notas, os comentários e quem/quando preencheu (se já
preenchido) como texto simples, só leitura — não um formulário editável ali. Corrigir uma nota
errada é responsabilidade do Treinador (reabrir e salvar de novo, o que sobrescreve
`parecer_preenchido_em`/`_por`), não do Mateus pela tela interna; isso mantém uma fonte só de
verdade pra "quem decidiu a nota" e evita o card de notas virar mais um formulário genérico dentro
do `CaptacaoForm` (que já está com bastante campo). Se no futuro o Mateus precisar de um jeito de
substituir a nota do Treinador direto, isso é um pedido novo, não coberto aqui.

## O ajuste simples e independente: alojamento

`captacaoInscricaoSchema` perde o campo `desejaAlojamento`; `inscricao-form.tsx` perde o checkbox
"Precisa de alojamento"; `app/inscricao-captacao-base/actions.ts` para de ler esse campo do
FormData e sempre grava `deseja_alojamento: false` na inscrição (o Mateus ajusta manualmente depois,
pela tela interna, que já tem esse campo). Não precisa de migração — a coluna já existe e já é
opcional.

## Fora de escopo (por agora)

- Reavaliação com histórico de pareceres antigos (um candidato só tem um parecer ativo por vez).
- Upload de foto pelo próprio candidato no link público.
- Apelido do candidato na Captação (o modelo do Corinthians tem; a Captação do Juventus não usa esse
  conceito hoje).
