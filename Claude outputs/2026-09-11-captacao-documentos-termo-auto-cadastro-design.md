# Captação: campos da ficha física, documentos obrigatórios, termo de responsabilidade e auto-cadastro ao aprovar

## Contexto

A inscrição pública de Captação (`/inscricao-captacao-base`) foi criada em 19/08 pra substituir o
processo manual em papel — mas até hoje ela só reproduz parte da "Ficha de Avaliação" física que o
clube usa (documento de 2 páginas: a ficha de dados + o Termo de Responsabilidade, ambos anexados a
este spec). Pedido do Mateus, verbatim:

> "Preciso que coloque no cadastro dos atletas [da Captação]... veja quais dados dessa ficha aí
> falta no cadastro e inclui. Preciso que a pessoa quando for fazer a inscrição, anexe alguns
> documentos obrigatórios em PDF. E quando um atleta for aprovado, como já tem alguns dados dele
> faça uma migração que crie o cadastro dele dentro do meu sistema também, mas sem excluir ele dos
> aprovados das avaliações."

Isso puxou três frentes, decididas em conjunto com o Mateus (ver Q&A abaixo): completar os campos
que faltam na inscrição, exigir os documentos da ficha física como upload obrigatório, resolver como
capturar o aceite do Termo de Responsabilidade sem assinatura física, e criar o atleta automaticamente
no momento em que o treinador aprova o parecer.

**Importante — isto reverte uma decisão anterior.** Em 19/08
(`2026-08-19-captacao-atletas-separacao-design.md`), o próprio Mateus decidiu que "Captação e
Atletas não tem relação nenhuma", justamente pra evitar cadastro incompleto — e removeu a
auto-criação que existia na primeira versão do design. A diferença agora é que a Captação vai
coletar dados suficientes (RG, CPF, endereço completo, pé dominante, foto etc.) pra que o cadastro
gerado já saia bem mais completo do que na tentativa original.

## Decisões (perguntas feitas ao Mateus, uma de cada vez)

1. **Auto-criação ao aprovar**: automática, no momento em que o treinador salva o Parecer Final com
   veredito "Aprovado" — não precisa de um botão separado nem confirmação extra.
2. **Foto do candidato**: não precisa ser rigidamente 3x4. O candidato inclui uma foto no formulário
   de inscrição (com uma orientação de fundo neutro na tela), e essa foto passa a ser a foto do
   candidato e, se aprovado, do atleta — a equipe continua podendo trocar por outra a qualquer
   momento depois, como qualquer campo do cadastro.
3. **Documentos obrigatórios**: bloqueiam o envio da inscrição se faltar algum; aceitam tanto PDF
   quanto foto/imagem (a maioria das famílias vai fotografar com o celular, não escanear).
4. **Ficha de Avaliação como documento**: não entra na lista de anexos — o formulário digital
   substitui o papel.
5. **Lista de documentos, fonte da verdade**: a "Ficha de Avaliação 2026" oficial que o Mateus
   enviou (2 páginas, anexada a este spec) tem 6 itens: 02 Fotos 3x4, Cópia do RG do atleta, Cópia
   do RG do(s) responsável(is), Declaração escolar, Atestado médico e Eletrocardiograma com laudo —
   sem "Certidão de Nascimento" nem "Comprovante de Residência", que apareciam num print anterior.
   Esse print, na verdade, é de um terceiro documento diferente (o "Protocolo para Atletas em
   Avaliação", ver seção 5) — um cartaz com orientações pro dia da avaliação, não a lista que
   condiciona o envio da inscrição online. Ficamos com os 6 da ficha oficial pra decidir o que
   bloqueia o envio (a foto vira campo próprio, não "documento" — ver decisão 2), totalizando 5
   documentos + 1 foto.
6. **Termo de Responsabilidade**: em vez de assinatura física (baixar/imprimir/assinar/reenviar) ou
   de um mecanismo de assinatura desenhada, vira **consentimento digital**: nome completo + CPF do
   Responsável Legal (campo novo) e duas confirmações separadas obrigatórias ("Li e concordo", uma
   do Atleta e uma do Responsável), com data/hora registrada como comprovante.
   - Investigado e descartado: o sistema já tem uma "assinatura digital" (`assinaturas_documento`,
     usada no próprio Parecer Final), mas ela exige login (`usuario_id` obrigatório, RLS só pra
     `authenticated`) — não serve pra alguém que nunca tem conta no sistema (o candidato/família).
     Por isso este é um mecanismo novo e mais simples, não uma extensão daquele.

## 1. Campos novos na ficha de inscrição pública

Comparando a "Ficha de Avaliação" física com `captacaoInscricaoSchema` (`lib/validation/
schemas.ts`), faltam:

| Campo novo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| `rg` | texto | sim | Documento do atleta |
| `cpf` | texto (validado, mesmo `cpfField` já usado em Atletas) | sim | |
| `segundaPosicao` | texto | não | "2ª Posição" na ficha — nem todo atleta tem uma |
| `peDominante` | enum `destro`/`canhoto`/`ambidestro` | sim | Mesmo enum já usado em Atletas/Atletas Base |
| `altura` | numérico (metros, ex. 1.75) | sim | Novo em todo o sistema — nem Atletas nem Atletas Base têm esse campo hoje |
| `peso` | numérico (kg, ex. 68.5) | sim | Idem |
| `email` | texto (validação básica de formato) | sim | |
| `possuiPlanoSaude` | boolean | sim | + `planoSaudeQual` (texto), obrigatório só quando `possuiPlanoSaude = true` |
| `escolaridade` | texto (ex. "6º ano") | sim | |
| `periodoEscolar` | enum `manha`/`tarde`/`noite` | sim | "Período" na ficha |
| `federado` | boolean | sim | + `federadoClube` (texto), obrigatório só quando `federado = true` |

Todos os demais campos da ficha física já existem no schema atual (nome, nascimento, posição
principal, endereço estruturado, celular, nome/contato dos pais, indicado por, clube anterior,
escola). Seguem o mesmo padrão de obrigatoriedade "tudo preenchido" já decidido em 19/08 pra este
formulário, exceto os dois campos condicionais acima.

Novo bloco, específico do Termo de Responsabilidade (não está na ficha de dados, é a segunda
página do documento físico):

| Campo novo | Tipo | Obrigatório |
|---|---|---|
| `responsavelLegalNome` | texto | sim |
| `responsavelLegalCpf` | texto (validado) | sim |
| `concordoAtleta` | checkbox | sim (deve estar marcado pra enviar) |
| `concordoResponsavel` | checkbox | sim (deve estar marcado pra enviar) |

## 2. Documentos obrigatórios

Cinco documentos (PDF ou imagem) + a foto (tratada à parte, ver abaixo), cada um seu próprio slot
de upload na tela de inscrição — nenhum é anexo "genérico" com nome livre, é uma lista fixa e
conhecida, então a tela mostra os 6 itens como um checklist e não deixa enviar enquanto algum
faltar:

1. Foto do atleta (fundo neutro — orientação em texto na tela, não é validação técnica de imagem)
2. Cópia do RG do atleta
3. Cópia do RG do(s) responsável(is)
4. Declaração escolar
5. Atestado médico
6. Eletrocardiograma com laudo

**Modelo de dados**: tabela nova `captacao_documentos` (mesmo espírito de `atleta_documentos`, mas
com `tipo` fixo em vez de nome livre, porque aqui a lista é conhecida e fechada — permite validar
"todos os 5 presentes" no servidor antes de aceitar o envio):

```sql
create table public.captacao_documentos (
  id uuid primary key default gen_random_uuid(),
  captacao_id uuid not null references public.captacao_base(id) on delete cascade,
  tipo text not null check (tipo in (
    'rg_atleta', 'rg_responsavel', 'declaracao_escolar', 'atestado_medico', 'eletrocardiograma'
  )),
  arquivo_path text not null,
  created_at timestamptz not null default now(),
  unique (captacao_id, tipo)
);
```

Bucket novo e privado `captacao-documentos` (mesmo padrão de `atleta-documentos`), caminho
`<captacao_id>/<tipo>.<ext>` — como `unique(captacao_id, tipo)` já impede duplicar, um reenvio do
mesmo tipo substitui o arquivo (upsert), útil se a família mandar o arquivo errado e quiser corrigir
antes de enviar. RLS igual à de `atleta-documentos` (só `authenticated` lê/escreve pela API do
Supabase) — a inscrição pública grava por baixo do `createAdminClient()` (service_role, que já é o
padrão usado por toda a `inscreverCaptacao`), então não precisa de política pra anônimo.

A foto (item 1) **não** entra nessa tabela — usa o mecanismo que já existe
(`uploadFotoRedimensionada`, bucket `entity-photos`, path `captacao-base/<id>/foto.jpg`), só que
agora acionado também pelo formulário público (hoje só o staff faz upload dessa foto pelo formulário
interno).

## 3. Termo de Responsabilidade — consentimento digital

Na tela de inscrição, depois dos documentos, aparece o texto integral do Termo de Responsabilidade
(mesmo conteúdo do PDF físico, sem as linhas de assinatura/data que não fazem sentido numa tela),
seguido de:

- Campo "Nome completo do responsável legal"
- Campo "CPF do responsável legal"
- Checkbox "O Atleta declara ter lido e concorda com os termos acima"
- Checkbox "O Responsável Legal declara ter lido e concorda com os termos acima"

As duas caixas precisam estar marcadas pra habilitar o envio (mesma validação client+server que já
existe pros outros campos obrigatórios). Novas colunas em `captacao_base`:

```sql
alter table public.captacao_base add column responsavel_legal_nome text;
alter table public.captacao_base add column responsavel_legal_cpf text;
alter table public.captacao_base add column termo_aceite_atleta boolean not null default false;
alter table public.captacao_base add column termo_aceite_responsavel boolean not null default false;
alter table public.captacao_base add column termo_aceito_em timestamptz;
```

Isso não é uma assinatura digital com validade jurídica equivalente a uma assinatura manuscrita ou
certificado ICP-Brasil — é um registro de aceite (nome + CPF + confirmação + data/hora), no mesmo
espírito de "aceitar termos" que qualquer cadastro online usa. Vale conversar com um advogado se
quiser reforçar a validade jurídica formal disso; foge do escopo técnico deste spec.

## 4. Criação automática do cadastro em Atletas da Base

**Gatilho**: `salvarParecerCaptacao` (`app/treinador/actions.ts`), logo depois que o `update` do
parecer/status é confirmado com sucesso e `data.veredito === "aprovado"` — mesmo lugar e mesmo
espírito "best-effort" de `assinarComoTreinadorEAvisarDemais` (nunca derruba o salvamento do
parecer em si, mesmo se a criação do atleta falhar).

**Nova função** `criarAtletaBaseAPartirDeCaptacao(supabase, candidatoId)` em
`lib/futebol/captacao-para-atleta.ts` (nome sugerido):

1. Busca a linha completa de `captacao_base`.
2. Se `atleta_gerado_id` já estiver preenchido, não faz nada (evita duplicar caso o parecer seja
   reaberto/resalvo — improvável hoje, mas seguro).
3. Monta o payload de `atletas_base` copiando os campos que a Captação já tem: nome, RG, CPF
   (normalizado), nascimento, posição, categoria, pé dominante, telefone, endereço completo (cep/
   logradouro/número/complemento/bairro/cidade/uf), nome/telefone da mãe e do pai, escola. `status`
   sempre começa `"liberado"` (é o status esportivo do atleta, não tem relação com o status da
   Captação). `ativo: true`.
4. Copia o arquivo da foto de `entity-photos/captacao-base/<candidatoId>/foto.jpg` pra
   `entity-photos/atletas-base/<novoId>/foto.jpg` (`supabase.storage.copy`), e grava
   `foto_path` no novo registro.
5. Insere em `atletas_base`. Em caso de conflito de RG/CPF duplicado (já existe um atleta com esse
   documento — o mesmo tipo de erro que `createAtletaBase` já trata), não derruba o parecer: grava
   uma nota em `captacao_base.observacoes` avisando que a criação automática falhou por duplicidade,
   pra alguém da equipe resolver manualmente.
6. Em caso de sucesso, grava o novo id em **`captacao_base.atleta_gerado_id`** — coluna que já
   existe na tabela desde a primeira versão do design (19/08) e ficou sem uso depois da separação;
   reaproveitamos em vez de criar uma coluna nova, porque o nome e o propósito já são exatamente
   este.

**Campos que a Captação não coleta** e ficam em aberto no atleta recém-criado, pra completar depois
como qualquer cadastro manual: apelido, número de camisa/CBF/FPF, data de início no clube/contrato,
tipo de contrato, agência, empresário, alojamento, classificação G1/G2/G3.

**Na tela**: candidato aprovado continua aparecendo normalmente em `/base/captacao` e no funil do
dashboard — nada é escondido ou removido. Quando `atleta_gerado_id` estiver preenchido, a tela do
candidato (`/base/captacao/[id]`) mostra um aviso "Cadastro de atleta criado" com link direto pra
`/base/atletas/<categoria>/<atleta_gerado_id>/ver`.

## 5. Orientações depois de enviar a inscrição

Pedido do Mateus, com base num terceiro documento que ele usa hoje (o "Protocolo para Atletas em
Avaliação", cartaz anexado a este spec): depois que a família envia a inscrição com sucesso, a tela
de confirmação (`app/inscricao-captacao-base/inscricao-form.tsx`, bloco `state.success`, hoje só um
"Inscrição enviada com sucesso!" genérico) passa a mostrar também as orientações desse protocolo:

- **Uniformização necessária pro dia da avaliação**: camiseta branca, short preto, meiões pretos,
  chuteira apropriada para treino.
- **Aviso**: os documentos precisam ser apresentados (os originais físicos) no dia da avaliação
  pra liberar a participação do atleta — mesmo já tendo enviado cópia digital na inscrição.
- **Observação**: o processo de avaliação só começa depois que o clube enviar o agendamento com a
  data de apresentação; a programação semanal com os horários vem depois disso.

É conteúdo estático (mesmo texto do cartaz, sem campo novo nem tabela nova) — só uma seção a mais
nessa tela de confirmação que já existe.

## Fora de escopo

- Validade jurídica formal do consentimento digital do Termo (ver nota na seção 3).
- Qualquer mudança no fluxo interno (`origem: "interno"`) de cadastro de candidato pela equipe — os
  novos campos ficam disponíveis no formulário interno também (mesmo `CaptacaoForm`), mas sem
  bloquear o salvamento por documento/termo faltando; a obrigatoriedade dos documentos e do termo
  vale só pra inscrição pública.
- OCR ou qualquer validação de conteúdo dos documentos enviados (RG de verdade, foto de verdade
  etc.) — só verifica que um arquivo foi anexado em cada slot.
- Notificação automática pra equipe quando uma nova inscrição chega (já existe hoje, sem mudança).
