# Cadastro de Atleta — início de contrato, CPF padronizado, posição única e link público obrigatório

Data: 25/08/2026
Status: aprovado, pronto para implementação

## Contexto

Pedido original do Mateus:

> "no cadastro do atleta. Preciso incluir uma opção. Já tem término do contrato. e tem inicio do
> clube, quero o inicio do contrato. (porém essa parte de contrato) é restrito somente ao sistema e
> não publico. E fazer a mesma coisa que vc fez dos dados da comissão o link publico deve ser
> obrigatórios todos os dados, padronizar o preenchimento do cpf."

Durante o brainstorming, dois ajustes adicionais entraram no escopo (com telas de exemplo
anexadas do cadastro de Atleta da Base):

> "Incluir uma opção de: Lateralidade / Direita / Esquerda / Ambidestro / Colocar instrução do que
> é (para não confundirem) — aparece posição e categoria de Posição. Precisamos deixar somente uma:
> Goleiro / Zagueiro / Lateral Direito / Lateral Esquerdo / Volante / Meia / Atacante / Ponta
> Direita / Ponta Esquerda — isso para o profissional também."

Sobre Lateralidade, o próprio Mateus esclareceu que é o mesmo conceito do campo "Pé dominante" já
existente (destro/canhoto/ambidestro) — **decisão: nenhuma mudança nesse campo**, ele fica
exatamente como está hoje.

Este documento cobre as quatro frentes que restaram: campo de início de contrato, máscara de CPF,
posição única com lista fixa, e obrigatoriedade total no link público de Atleta da Base.

## Escopo

- **Futebol Profissional** (`/atletas`) e **Futebol de Base** (`/base/atletas`): ambos ganham o
  campo "Data de início do contrato" e máscara de CPF no cadastro interno (admin).
- **Link público de Atleta da Base** (`/cadastro-atleta-base`): não tem equivalente no
  Profissional. Ganha máscara de CPF e passa a exigir todos os campos — mesmo padrão já aplicado ao
  link público de Comissão Técnica (`docs/superpowers/specs/2026-08-25-comissao-tecnica-cadastro-publico-design.md`).
- A consolidação de posição (lista única de 9 valores) vale para Profissional e Base, cadastro
  interno **e** o link público.

## 1. Novo campo: "Data de início do contrato"

Hoje o cadastro de Atleta já tem "Data de início no clube" (`dataInicioClube`) e "Data de término
do contrato" (`dataFimContrato`). Falta o início do contrato em si — datas diferentes: um atleta
pode estar no clube desde uma data e só ter assinado/renovado contrato depois.

- Campo novo `dataInicioContrato`, opcional, tipo data.
- **Restrito ao cadastro interno** — nunca aparece na Ficha de Cadastro pública
  (`/cadastro-atleta-base`), mesmo raciocínio já documentado no schema público hoje ("campos
  administrativos do clube... ficam de fora — isso o Mateus completa depois").
- Posição no formulário: logo após "Data de início no clube" e antes de "Data de término do
  contrato" — ordem cronológica (entrou no clube → assinou contrato → contrato termina).
- Vale para Profissional (`atletaSchema`) e Base (`atletaBaseSchema`, que herda de `atletaSchema`
  — não precisa de nada adicional lá).
- Banco: nova coluna `data_inicio_contrato` (date, nullable) em `atletas` e `atletas_base`.

## 2. CPF padronizado (máscara)

Mesmo padrão já construído para a Comissão Técnica (`components/cpf-field.tsx`, `CpfField`/
`CpfInput`): campo visível com máscara progressiva (`000.000.000-00`) + input escondido com o
valor normalizado, sem precisar mexer nos schemas Zod existentes de CPF.

Aplica em todo campo de CPF do fluxo de Atleta:
- Cadastro interno Profissional (`app/atletas/atleta-form.tsx`) — CPF já obrigatório, só ganha
  máscara.
- Cadastro interno Base (`app/base/atletas/atleta-base-form.tsx`) — idem.
- Ficha pública de Atleta da Base (`app/cadastro-atleta-base/atleta-publico-form.tsx`) — ganha
  máscara **e** passa a ser obrigatório (ver seção 4).

## 3. Posição única (lista fixa de 9 valores)

### Problema atual

O cadastro tem dois campos hoje: "Posição" (texto livre, ex.: "Zagueiro", "Lateral direito") e
"Categoria de posição" (`categoriaPosicao`, select fixo com 5 valores: Goleiro/Zagueiro/Lateral/
Meia/Atacante) — esse segundo campo é o que colore a tag GOL/ZAG/LAT/MEI/ATA na grade de
Convocação e agrupa o Campograma. Pedido do Mateus: virar **um campo só**, com uma lista fixa de 9
posições:

Goleiro, Zagueiro, Lateral Direito, Lateral Esquerdo, Volante, Meia, Atacante, Ponta Direita,
Ponta Esquerda.

### Solução

- Um único campo `posicao`, agora um `<select>` (não mais texto livre) com essas 9 opções fixas —
  substituindo tanto o "Posição" quanto o "Categoria de posição" atuais, em Profissional e Base
  (interno e público).
- O valor gravado no banco continua sendo o texto legível ("Lateral Direito", não um código) — é
  assim que o campo `posicao` já funciona hoje, e ele é lido diretamente (sem tradução) em ~50
  lugares do sistema (listagens, PDFs de Relatório/Presskit/Súmula, exportações Excel etc.).
  Manter o texto como valor evita tocar em todos esses lugares — só passa a vir de uma lista fixa
  em vez de digitação livre.
- **"Categoria de posição" deixa de ser um campo cadastrado.** Onde ela é usada hoje — a tag
  colorida GOL/ZAG/LAT/MEI/ATA da Convocação (`lib/futebol/categoria-posicao.ts`) e o agrupamento
  do Campograma (`lib/futebol/campograma.ts`) — passa a ser **calculada** a partir da posição, com
  este mapeamento (decidido com o Mateus):

  | Posição              | Grupo/tag  |
  |-----------------------|------------|
  | Goleiro               | GOL        |
  | Zagueiro               | ZAG        |
  | Lateral Direito        | LAT        |
  | Lateral Esquerdo       | LAT        |
  | Volante                | MEI        |
  | Meia                   | MEI        |
  | Atacante                | ATA        |
  | Ponta Direita           | ATA        |
  | Ponta Esquerda          | ATA        |

  Resultado: a Convocação e o Campograma continuam exatamente como estão hoje (mesmas 5 cores,
  mesmos 5 grupos) — só passam a receber a categoria calculada em vez de lida direto do banco.
- A coluna `categoria_posicao` (Postgres) é **removida** das tabelas `atletas` e `atletas_base` —
  vira dado derivado, não precisa mais ser armazenado nem preenchido à mão.
- `lib/futebol/ordem-posicao.ts` (ordenação tática por palavra-chave, usada no Presskit) **não
  precisa de nenhuma mudança** — já reconhece "lateral", "volante", "meia", "ponta" e "atacante"
  como palavras-chave separadas, então os 9 valores novos já caem nos grupos certos.

### Migração dos cadastros existentes

Cada atleta já cadastrado tem hoje um `posicao` (texto livre) e um `categoria_posicao` (um dos 5
grupos). A migração tenta reclassificar automaticamente pra um dos 9 valores novos, seguindo o
mesmo padrão já usado nas migrações 0051/0052 (que fizeram o backfill original de
`categoria_posicao` por palavra-chave):

- `categoria_posicao = 'goleiro'` → **Goleiro** (sem ambiguidade)
- `categoria_posicao = 'zagueiro'` → **Zagueiro** (sem ambiguidade)
- `categoria_posicao = 'lateral'` → olha o texto livre de `posicao`: se tiver "direit" vira
  **Lateral Direito**, se tiver "esquerd" vira **Lateral Esquerdo**; sem nenhuma das duas palavras,
  cai no padrão **Lateral Direito** (e fica marcado pra revisão, ver abaixo).
- `categoria_posicao = 'meia'` → se o texto livre tiver "volante" vira **Volante**, senão **Meia**.
- `categoria_posicao = 'atacante'` → se o texto livre tiver "ponta" ou "extremo"/"ala" junto com
  "direit"/"esquerd" vira **Ponta Direita**/**Ponta Esquerda**; senão cai no padrão **Atacante**
  (e fica marcado pra revisão se o texto sugeria "ponta" mas sem lado identificável).

Toda linha que caiu num valor padrão por falta de informação suficiente (não por classificação
direta) fica marcada numa coluna temporária `posicao_revisar` (boolean). A migração entrega uma
consulta SQL pronta pra listar esses casos depois — o Mateus revisa e corrige pela tela normal de
edição de Atleta quando quiser; a coluna de marcação pode ser removida depois, sem pressa.

## 4. Link público de Atleta da Base — tudo obrigatório

Mesmo padrão já aplicado ao link de Comissão Técnica: hoje a Ficha de Cadastro pública
(`/cadastro-atleta-base`) tem a maioria dos campos opcionais (pensado pra família preencher aos
poucos). Passa a exigir tudo, exceto o que continua fazendo sentido ficar de fora (dados
administrativos do clube — número de camisa, tipo de contrato, datas de contrato — que já são
excluídos do formulário público hoje e continuam assim).

Campos que **passam a ser obrigatórios** (hoje opcionais):
- Apelido
- RG
- CPF (com máscara — ver seção 2; deixa de ser "a família pode não ter em mãos ainda")
- Posição (agora o select único de 9 valores — ver seção 3)
- Telefone de contato
- Cidade natal / UF natal
- Escola
- Nome da mãe / Telefone da mãe
- Nome do pai / Telefone do pai
- Endereço completo (CEP, logradouro, número, complemento, bairro, cidade, UF)

Já obrigatórios hoje, sem mudança: Nome completo, Data de nascimento, Categoria.

Sem mudança: "Mora no alojamento do clube" (checkbox, não se aplica o conceito de obrigatório).

### Empresário/representante — vira obrigatório com instrução

A seção "Empresário/representante (se houver)" tem hoje Nome, Telefone e Agência, todos
opcionais. Passa a exigir os três, mas com uma instrução visível na seção orientando quem não tem
empresário a preencher "Não possui" em vez de travar o envio:

> "Se o atleta não tem empresário/representante, preencha os campos abaixo com 'Não possui'."

Por isso os três campos (Nome do empresário, Telefone do empresário, Agência) validam como texto
não vazio — não como telefone/nome de verdade — pra "Não possui" ser um valor aceito. Mesmo
raciocínio já usado hoje em Telefone da mãe/pai na inscrição pública de Captação
(`captacaoInscricaoSchema`), que valida como texto obrigatório em vez de formato de telefone.

## Arquivos afetados

**Validação:**
- `lib/validation/schemas.ts` — `atletaSchema` (novo `dataInicioContrato`; `posicao` vira enum de
  9 valores; `categoriaPosicao` é removido do schema); nova constante `ATLETA_POSICAO_OPTIONS`;
  `fichaCadastroAtletaBaseSchema` reescrito com todos os campos obrigatórios (helper próprio, nos
  moldes de `comissaoPublicoRequiredField`/`inscricaoRequiredField`), CPF/RG passam a usar os
  campos estritos (`cpfField`/`rgField`) em vez dos opcionais.

**Classificação de posição:**
- `lib/futebol/categoria-posicao.ts` — remove `CATEGORIA_POSICAO_OPTIONS` (não é mais campo de
  formulário); adiciona `categoriaDaPosicao(posicao): CategoriaPosicao` (mapeamento da tabela da
  seção 3); mantém `CATEGORIA_POSICAO_SIGLA`/`CATEGORIA_POSICAO_COR`/`siglaCategoriaPosicao`/
  `corCategoriaPosicao` como estão.
- `lib/futebol/campograma.ts` — sem mudança de lógica (continua agrupando por `CategoriaPosicao`);
  quem chama passa a mandar o valor calculado.

**Componentes/formulários:**
- `app/atletas/atleta-form.tsx` — CPF com `CpfField`; campo único de Posição (select, 9 valores);
  remove "Categoria de posição"; novo campo "Data de início do contrato".
- `app/base/atletas/atleta-base-form.tsx` — mesmas mudanças.
- `app/cadastro-atleta-base/atleta-publico-form.tsx` — CPF com `CpfField`; campo único de Posição;
  todos os campos passam a `required`; instrução nova na seção Empresário.

**Server actions:**
- `app/atletas/actions.ts`, `app/base/atletas/actions.ts` — parseForm ganha `data_inicio_contrato`
  no insert/update; perde `categoriaPosicao` do form (o campo deixa de existir) e para de gravar
  `categoria_posicao` (coluna removida do banco); `normalizeCPF` continua igual.
- `app/cadastro-atleta-base/actions.ts` — mesma remoção de `categoriaPosicao`/`categoria_posicao`,
  sem o campo de contrato (fora do público).

**Telas que hoje leem `categoria_posicao` do banco (passam a calcular com
`categoriaDaPosicao(posicao)`):**
- `app/jogos/[id]/convocacao/convocacao-form.tsx`
- `app/base/jogos/[id]/convocacao/convocacao-form-base.tsx`
- `app/jogos/[id]/sumula/page.tsx`
- `app/base/jogos/[id]/sumula/page.tsx`
- `app/base/atletas/campograma/page.tsx`

**Tipos:**
- `lib/supabase/types.ts` — `AtletaRow`/`AtletaBaseRow` perdem `categoria_posicao`, ganham
  `data_inicio_contrato: string | null`; `CategoriaPosicao` continua existindo (tipo derivado); tipo
  novo pra `posicao` (união literal dos 9 valores) opcional, ou mantido como `string` mesmo — a
  validação forte já é feita no Zod na entrada.

**Exportações/relatórios:** nenhuma mudança de código — todos leem `posicao` como texto direto e
continuam funcionando (o valor só passa a vir de uma lista fixa).

**Migração SQL (Supabase, colada no chat quando a implementação começar):**
- Adiciona `data_inicio_contrato` em `atletas` e `atletas_base`.
- Adiciona CHECK constraint nos 9 valores em `posicao` de ambas as tabelas.
- Backfill de `posicao` a partir do texto livre + `categoria_posicao` atual (seção 3).
- Coluna temporária `posicao_revisar` marcando os casos resolvidos por padrão/fallback.
- Remove a coluna `categoria_posicao` de `atletas` e `atletas_base`.

## Fora de escopo (confirmado com o Mateus)

- Campo "Lateralidade": **não é criado**. É o mesmo conceito de "Pé dominante", que fica como está,
  sem instrução nova nem mudança de nome.
- Nenhuma mudança em RG/CPF/demais campos do cadastro interno de Profissional (já são obrigatórios
  hoje, só ganham máscara de CPF).
- Nenhuma mudança nos limites/cores/tags da Convocação nem no layout do Campograma — só a origem do
  dado muda (calculado em vez de armazenado).
