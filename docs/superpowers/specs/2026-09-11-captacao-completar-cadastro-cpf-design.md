# Captação: completar cadastro existente pelo link público (verificação por CPF)

## Contexto

Desde a spec `2026-09-11-captacao-documentos-termo-auto-cadastro-design.md`, a inscrição pública
(`/inscricao-captacao-base`) exige foto, os 5 documentos obrigatórios e o aceite do Termo de
Responsabilidade — mas o formulário interno (`CaptacaoForm`, usado pelo Mateus/equipe pra criar um
candidato manualmente) não pede nada disso (decisão daquela spec, seção "Fora de escopo": "os novos
campos ficam disponíveis no formulário interno também, mas sem bloquear o salvamento por
documento/termo faltando").

Isso deixa uma lacuna: quando o Mateus cadastra um candidato pelo formulário interno antes da
avaliação (por exemplo, um indicado que ainda não tem documentos em mãos), não existe hoje um jeito
do próprio atleta/família completar o que falta — documentos, termo, e qualquer dado que não foi
preenchido — sem duplicar o cadastro. Pedido do Mateus, verbatim:

> "hoje já tem o link deles preencherem. Use esse mesmo link, para quando ele colocar um CPF o
> sistema intende que ele possui cadastro e ele só completa os campos faltantes"

## Decisões (perguntas feitas ao Mateus, uma de cada vez)

1. **Qual link**: o mesmo link público fixo que já existe (`/inscricao-captacao-base`), já
   compartilhado hoje — nada de gerar um link individual por candidato.
2. **Segurança do CPF**: o link não tem login. Pra evitar que alguém descubra/edite o cadastro de
   outra pessoa só sabendo o CPF, a verificação exige CPF **+ data de nascimento** batendo os dois
   antes de liberar a edição.
3. **Quais cadastros são elegíveis**: só os que **ainda não têm decisão** — status "Em avaliação".
   Um CPF de candidato já Aprovado, Dispensado ou Não compareceu não reabre esse cadastro; o
   sistema trata como se fosse uma inscrição nova (processo já encerrado não deve ser reaberto por
   esse caminho).
4. **Anti-enumeração**: pra ninguém conseguir usar o formulário pra "testar" se um CPF existe no
   sistema, os três casos abaixo devolvem exatamente a mesma resposta genérica pro navegador (sem
   diferenciar qual deles aconteceu):
   - CPF não está cadastrado;
   - CPF está cadastrado, mas a data de nascimento informada não bate;
   - CPF está cadastrado, mas o candidato já tem uma decisão (não é mais "Em avaliação").

## Fluxo

### 1. Nova etapa inicial no formulário público

Antes de qualquer campo — inclusive antes da seção "Foto do atleta", que hoje é a primeira —, o
formulário mostra uma tela curta: CPF (reaproveita `components/cpf-field.tsx`) + Data de nascimento
+ botão "Continuar". Só depois de confirmar essa etapa é que o resto do formulário aparece.

### 2. Verificação no servidor

Nova Server Action em `app/inscricao-captacao-base/actions.ts`, chamada por essa etapa inicial:

- Busca em `captacao_base` os registros com `status = 'avaliacao'` (não precisa filtrar por
  `origem`: mesmo um registro público que por algum motivo tenha ficado em "avaliação" sem passar
  pela fila de Aprovações — não deveria acontecer, mas não custa cobrir — é elegível do mesmo jeito).
- Compara CPF **normalizado** (`normalizeCPF`, já usado na validação de CPF do sistema) dos dois
  lados antes de decidir se bate — necessário porque o formulário interno hoje **não** normaliza o
  CPF ao salvar (ver "Também nesta mudança" abaixo), então pode haver registro antigo com pontuação.
- Se achar um (ou mais de um — caso raro, mas coberto: fica com o de maior `numero`, o mais
  recente) registro cujo CPF bate **e** a data de nascimento bate: devolve os dados desse candidato
  (todos os campos já preenchidos) mais o `id` dele, pra pré-popular o restante do formulário.
- Em qualquer outro caso (não achou, achou mas data de nascimento não bate, achou mas o status não é
  mais "avaliacao"): devolve a mesma resposta genérica de "não encontrado" (decisão 4).

### 3. Pré-preenchimento e edição

Encontrado um candidato:

- O restante do formulário (as mesmas seções de sempre — Dados do atleta, Dados esportivos,
  Escolaridade e saúde, Responsáveis, Endereço, Documentos, Termo) aparece com os campos já
  preenchidos com o que existe, todos **editáveis** — a família pode corrigir algo que o Mateus
  tenha digitado errado ao criar o candidato.
- Um campo oculto (`captacaoIdExistente`) carrega o `id` do candidato encontrado.
- **Foto**: se o candidato encontrado já tiver `foto_path` (o Mateus às vezes já anexa uma foto ao
  criar pelo formulário interno), o campo mostra essa foto como atual (`currentUrl`, mesmo padrão já
  usado no formulário interno) e deixa de ser obrigatório escolher uma nova — a família pode manter
  ou trocar. Sem correspondência (candidato novo), a foto continua obrigatória como hoje.
- **Documentos e Termo continuam sempre obrigatórios** — nenhum registro criado pelo formulário
  interno tem isso hoje, então não há cenário de "documento já enviado" a preservar.
- Não encontrado nenhum candidato: o restante do formulário aparece em branco, exceto CPF e Data de
  nascimento (o que a pessoa já digitou na etapa inicial vem preenchido, pra não digitar de novo) —
  segue como uma inscrição nova, sem indicar que a verificação "falhou".

### 4. Submissão

`inscreverCaptacao` passa a checar se veio um `captacaoIdExistente` no `FormData`:

- **Veio um id existente** → faz **UPDATE** no registro (mesmas colunas que o INSERT de hoje já
  grava), mas **preserva** `id`, `numero`, `status`, `origem`, `data_inicio` e `atleta_gerado_id` —
  o candidato já está "Em avaliação" e não deve voltar pra fila de Aprovações nem trocar de origem.
  Grava `termo_aceite_atleta`/`termo_aceite_responsavel`/`termo_aceito_em` normalmente (primeira vez
  que o termo é registrado pra esse candidato). Upload de foto (só se uma nova foi enviada) e dos 5
  documentos seguem exatamente o mesmo caminho de hoje, associados a esse `id` já existente.
- **Não veio** → comportamento de hoje, sem nenhuma mudança (INSERT com `status: "inscricao"`,
  `origem: "publico"`).
- O `insert` em `captacao_documentos` vira `upsert` (`onConflict: "captacao_id,tipo"` — a tabela já
  tem essa constraint única, ver `0103_captacao_documentos.sql`), pra suportar uma nova tentativa
  depois de uma falha parcial em qualquer um dos dois caminhos (novo ou completar existente).

### 5. Histórico de períodos anteriores

Pedido do Mateus, feito na revisão desta spec: um atleta pode voltar pro clube pra uma nova
avaliação depois de já ter passado por aqui antes (Aprovado, Dispensado ou Não compareceu). A
decisão 3 já cobre o registro em si — esse retorno cria um cadastro novo, não reabre o antigo (cada
período tem seu próprio Nº, Data de início e Data de término). O que faltava era dar visibilidade de
que os dois registros são da mesma pessoa:

- Na tela do candidato (`/base/captacao/[id]`), nova seção **"Histórico"** lista os outros registros
  de `captacao_base` com o mesmo CPF normalizado (qualquer status, exceto o próprio registro da
  tela) — Nº, período (Data de início – Data de término) e status de cada um. Fica oculta quando não
  existe nenhum outro registro com esse CPF.
- Aparece em **qualquer** candidato, não só nos que vieram pela etapa de completar cadastro — inclui
  também quem está com status "Inscrição enviada" (fila de Aprovações), o que ajuda a equipe a notar
  "essa pessoa já passou por aqui antes" na hora de decidir se aprova uma inscrição nova.
- Sem migration nova nem vínculo formal no banco — a busca compara CPF normalizado na hora de
  montar a tela, mesma lógica de comparação da verificação da etapa 2. Puramente informativo: não
  muda nenhum comportamento de aprovação, dispensa ou criação de atleta.

## Também nesta mudança (fora do pedido original, mas necessário)

`app/base/captacao/actions.ts` passa a normalizar o CPF (`normalizeCPF`) antes de salvar no
formulário interno — hoje ele grava o texto exatamente como digitado (com ou sem pontuação). Sem
essa normalização na gravação, a comparação da verificação (item 2) continuaria funcionando (ela já
normaliza os dois lados na hora de comparar), mas manter o dado salvo de forma inconsistente entre
os dois formulários não faz sentido daqui pra frente.

## Fora de escopo

- Completar um cadastro que já teve decisão (Aprovado, Dispensado ou Não compareceu) — trata como
  inscrição nova (decisão 3).
- Link individual por candidato — continua sendo o mesmo link fixo já compartilhado hoje.
- Notificar automaticamente a família de que o cadastro está pendente de completar — combinar isso
  continua manual (WhatsApp etc.), como já é hoje.
- Qualquer limite de tentativas/rate limiting na etapa de verificação de CPF (ex: bloquear depois de
  N tentativas erradas) — mitigar abuso além da dupla confirmação (CPF + data de nascimento) fica
  pra uma iteração futura, se necessário.
