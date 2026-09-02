# Campograma: edição rápida de classificação/status, ícone de DM e inclusão rápida de atleta

Data: 02/09/2026
Status: rascunho — aguardando revisão do Mateus

## Contexto

Pedido do Mateus, verbatim:

> "preciso ajustar algo aqui. preciso poder ajustar a classificação do atleta pelo campograma também.
> e tanto pro treinador e pra mim, poder incluir uma opção de dispensa. então se ele não é G1,G2 OU
> G3. Ele é dispensa.
>
> e quero poder fazer isso através do campodrama diretamente também.
> quero poder colocar se ele está no DM, e quero poder incluir jogadores por ali tbm. Exemplo.
> Estou no campograma discutindo os jogadores, e o treinador aponta alguém, quero poder incluir e
> depois se precisar ajusto os dados pessoais dele no cadastro, mas a principo so colocaria ali o
> nome dele e direcionasse a posição que ocuparia"

O Campograma (`/base/atletas/campograma`, ver `docs/superpowers/specs/
2026-08-26-campograma-foto-classificacao-design.md`) hoje só serve pra **ver** o elenco por posição e
**arrastar** um atleta pra outra posição. Esta spec adiciona três coisas novas, todas a partir de um
clique no token do atleta (interação nova, diferente do arrastar-e-soltar já existente):

1. Editar a Classificação (G1/G2/G3) direto no Campograma, com uma 4ª opção "Dispensa (pendente)".
2. Editar o Status (Liberado/Suspenso/Departamento Médico) direto no Campograma, com um ícone de
   cruz no token quando o atleta está no Departamento Médico — e corrigir um bug visual já existente
   do selo de contrato P/F, que hoje fica parcialmente escondido.
3. Incluir um atleta novo direto do Campograma, só com Nome e Posição, pra registrar na hora quem o
   treinador apontou durante a conversa.

Escopo confirmado com o Mateus ao longo da conversa: só **Futebol de Base** (mesmo escopo do
Campograma hoje). O treinador **não** ganha acesso ao Campograma — ele continua só com a tela "Meus
atletas" (`/treinador`, ver `docs/superpowers/specs/2026-08-25-classificacao-dispensa-atleta-base-design.md`),
que ganha a opção "Dispensa" no seletor de classificação que já existe lá.

## 1. Classificação pelo Campograma + "Dispensa (pendente)"

### O 4º valor de classificação

Hoje `classificacao` é `"g1" | "g2" | "g3"` (opcional). Passa a admitir um 4º valor: **`"dispensa"`**
— rótulo "Dispensa (pendente)". É a resposta à regra do Mateus ("se ele não é G1, G2 ou G3, ele é
dispensa"): em vez de forçar toda classificação a virar uma dessas quatro, "Dispensa (pendente)" é
uma 4ª opção no mesmo seletor, ao lado de G1/G2/G3/Não classificado — continua opcional.

**O que "Dispensa (pendente)" significa** (definido pelo Mateus: "fica marcado que aquele atleta
seria dispensa, mas só efetiva após o parecer"): é um **sinalizador**, não uma decisão final.
Marcar um atleta como "Dispensa (pendente)":
- **NÃO** muda `status` — o atleta continua com o status que tinha (Liberado/Suspenso/Departamento
  Médico), continua aparecendo normalmente nas listagens, convocações, súmulas etc.
- Só muda a cor do anel no Campograma e o rótulo no cadastro/listagem, como sinal visual de que
  aquele atleta está sob avaliação de saída.
- A dispensa só **efetiva de verdade** (isto é, `status` vira `'dispensado'`) quando alguém gera o
  Relatório de Dispensa de verdade — o fluxo que já existe desde a spec de 25/08, sem nenhuma
  mudança de comportamento. "Dispensa (pendente)" é anterior a esse relatório, não um substituto dele.

**Cor do anel** — G1 verde, G2 amarelo, G3 laranja já existem; "Dispensa (pendente)" usa **roxo
escuro** (`border-purple-700` / `#7e22ce`). A primeira tentativa foi vermelho, mas na prática ficou
parecido demais com o laranja do G3 lado a lado no Campograma (confundia à primeira vista) — o roxo
mantém o mesmo peso de "sinal de alerta/atenção" sem colidir visualmente com nenhuma das outras 3
cores. Anel neutro claro (`border-neutral-300`) continua sendo "sem classificação".

```
Legenda do Campograma (linha nova):
🟩 G1   🟨 G2   🟧 G3   🟪 Dispensa (pendente)   ⬜ Não classificado
```

### Onde é editável

- **Cadastro interno** (`atleta-base-form.tsx`): o `SelectField` de Classificação já existe — ganha
  só a nova opção "Dispensa (pendente)" na lista (`ATLETA_CLASSIFICACAO_OPTIONS`), sem mudança de
  layout.
- **Treinador** (`components/classificacao-select-treinador.tsx`, dentro de "Meus atletas"): mesmo
  seletor de hoje, ganha a 4ª opção automaticamente ao estender `ATLETA_CLASSIFICACAO_OPTIONS` — só
  precisa estender a lista de valores aceitos em `salvarClassificacaoTreinador`
  (`["g1", "g2", "g3", "dispensa"]`). Nenhuma tela nova pro treinador; ele **não** ganha acesso ao
  Campograma.
- **Campograma** (novo, esta spec): clicar num token abre o painel de edição rápida (seção 3) com o
  mesmo seletor.

## 2. Status pelo Campograma, ícone de DM e correção do selo clipado

### Status editável pelo Campograma

O painel de edição rápida (seção 3) também traz um seletor de Status, com as mesmas três opções já
disponíveis hoje no cadastro pra edição manual: **Liberado / Suspenso / Departamento Médico**.
"Dispensado" **não** entra nesse seletor — esse valor continua exclusivo do fluxo formal do Relatório
de Dispensa (mesma regra já confirmada na spec de 25/08: só a tela de dispensa grava esse status,
o `<select>` do cadastro interno só o exibe pra permitir corrigir um caso já dispensado). Confirmado
com o Mateus: "esse mesmo Status" que já existe no sistema, sem valor novo.

### Ícone de Departamento Médico no token

Pedido do Mateus, com uma imagem de referência (cruz vermelha e branca, estilo suíço/hospitalar): em
vez de um badge de texto "DM", o token do atleta no Campograma ganha um **ícone de cruz médica**
(SVG inline, quadrado branco com cruz vermelha, mesmo estilo da imagem de referência) quando
`status === 'departamento_medico'`. Sem badge nenhum pros outros dois status (Liberado é o estado
"padrão", sem marcação; Suspenso não ganha ícone no token nesta rodada — o pedido do Mateus foi
especificamente sobre o DM. Se ele quiser o mesmo tratamento pra Suspenso depois, é uma extensão
pontual do mesmo componente).

**Posição no token:** o selo de contrato P/F (já existente, canto superior direito) e o ícone de DM
(novo) ficam em **cantos opostos** do token, sobrepostos à foto — contrato mantém
`-right-1.5 -top-1.5`, ícone de DM vai em `-left-1.5 -top-1.5`.

### Correção do bug do selo de contrato clipado

Confirmado com print do próprio sistema: o selo P/F já vazava um pouco pra fora da caixa da foto
(posicionado com `-right-1.5 -top-1.5`, ou seja, fora dos limites do container), e o container tinha
`overflow-hidden` — resultado: metade do selo ficava cortado, invisível. Isso é um bug hoje, antes
mesmo desta spec, e afeta os dois badges novos/existentes igualmente. Correção: `overflow-hidden`
passa a ficar só na camada interna que efetivamente precisa cortar algo (a foto, pra manter os cantos
arredondados quando a imagem é maior que a caixa) — os dois selos (contrato e DM), por serem
elementos irmãos posicionados fora dessa camada interna, ficam **totalmente visíveis**, sobrepostos
aos cantos da foto, sem serem cortados por ela.

## 3. Painel de edição rápida (interação nova no Campograma)

Clicar num token de atleta (sem arrastar) abre um modal — reaproveita o `ModalShell` já usado na
Programação Semanal (`components/programacao/modal.tsx`), primeiro componente de modal do sistema, em
vez de criar um padrão visual novo. Conteúdo do modal "Editar — <nome do atleta>":

- **Classificação**: `<select>` com Não classificado / G1 / G2 / G3 / Dispensa (pendente) — mesmas
  opções de `ATLETA_CLASSIFICACAO_OPTIONS`.
- **Status**: `<select>` com Liberado / Suspenso / Departamento Médico.
- Se a classificação atual (ao abrir) for "Dispensa (pendente)": uma linha de aviso "Dispensa
  pendente — a saída só é efetivada ao gerar o Relatório de Dispensa" com um link "Gerar relatório de
  dispensa", que leva pra `/base/atletas/[categoria]/[id]/dispensa` (a tela do fluxo formal, já
  prevista na spec de 25/08 — nesta spec ela só ganha esse novo ponto de entrada, sem mudança de
  comportamento).
- Botão "Salvar" e "Cancelar" no rodapé do modal.

Salvar chama uma Server Action nova, `salvarClassificacaoStatusCampograma(atletaId, classificacao,
status)` — mesmo padrão de `moverAtletaCampograma` (grava direto os dois campos em `atletas_base`,
sem passar pelo `atletaBaseSchema` inteiro, valida só os dois valores contra as listas fixas
permitidas), chamada via `useTransition` a partir do componente cliente, com `router.refresh()` ao
final (mesmo padrão já usado pro arrastar-e-soltar). Fecha o modal e revalida `/base/atletas/campograma`
(e `/base/atletas` e a listagem da categoria, pra refletir mudança de status/classificação lá também).

**Convivência com o arrastar-e-soltar:** o `onClick` do token abre o modal; o `onDragStart` continua
disparando o arrastar. Como um gesto de arrastar de verdade nunca dispara `click` no HTML5 drag-and-
drop nativo, os dois convivem no mesmo elemento sem conflito — arrastar move de posição, clicar (sem
mover o mouse) abre o painel.

## 4. Inclusão rápida de atleta pelo Campograma

Cada linha de posição do Campograma ganha um botão pequeno **"+ Adicionar"**: nas linhas que já têm
atletas, ao lado dos tokens existentes; nas linhas vazias ("Ninguém cadastrado"), no lugar do texto
cinza atual. Clicar abre o modal "Novo atleta rápido" com dois campos:

- **Nome completo** (obrigatório).
- **Posição** (obrigatório) — pré-preenchida com a posição da linha onde "+ Adicionar" foi clicado,
  mas editável (`<select>` com as 9 posições, igual ao cadastro completo), caso o Mateus perceba que
  errou a linha.

Categoria é implícita — a mesma categoria que está sendo visualizada no Campograma no momento (vem
da própria URL/estado da página, não é um campo do formulário).

Salvar chama uma Server Action nova, `criarAtletaRapidoCampograma(nomeCompleto, posicao, categoria)`,
que **cria de verdade** uma linha em `atletas_base` na hora (não passa pela Captação/Avaliação — esse
é um atleta que já está ocupando uma posição no elenco ativo, não um candidato em teste, então é
semanticamente diferente do que a Captação representa e não deve ser misturado com ela):

- `nome_completo`: o texto digitado (normalizado, mesma função `normalizarNomeProprio` já usada nos
  outros formulários de atleta).
- `posicao`, `categoria`: os dois valores do formulário, validados contra `ATLETA_POSICAO_OPTIONS` e
  `CATEGORIAS_BASE` no servidor.
- `status`: `'liberado'` (padrão).
- `rg`, `cpf`, `data_nascimento`: **ficam em branco** (`null`) — não fazem parte deste formulário
  rápido.
- Todo o resto dos campos (telefone, foto, contrato, responsáveis, endereço etc.): `null`/padrão,
  igual a um cadastro vazio.

Depois de salvar, o modal fecha e `router.refresh()` atualiza o Campograma — o atleta novo aparece
imediatamente na linha da posição escolhida, com o token padrão (sem foto, iniciais como placeholder,
sem anel de classificação, sem selo de contrato) — o mesmo visual que qualquer atleta sem esses dados
já tem hoje.

### "Cadastro incompleto"

RG e CPF já são opcionais em `atletas_base` desde a migração 0076 (herança do fluxo de Captação
aprovada). Data de nascimento, porém, hoje é obrigatória (`not null`) — precisa de uma migração nova
pra aceitar `null` também, só pra permitir esse cadastro mínimo.

Um atleta criado com qualquer um dos três (`rg`, `cpf`, `data_nascimento`) em branco é considerado
**"Cadastro incompleto"**. Essa condição é calculada na hora da leitura (não é uma coluna nova no
banco — evita qualquer risco de ficar dessincronizada): `!rg || !cpf || !data_nascimento`.

**Onde aparece o sinalizador:**
- Na listagem por categoria (`/base/atletas/[categoria]`): um badge "Cadastro incompleto" (mesmo
  estilo dos outros badges de status da lista, cor neutra de alerta — `bg-amber-100 text-amber-800`,
  mesma cor já usada pra Departamento Médico) ao lado dos badges de Status/Contrato do card.
- Na página "ver" do atleta (`[categoria]/[id]/ver`): mesmo badge, em destaque no topo.

**Onde NÃO aparece:** no token do Campograma (decisão confirmada com o Mateus — o token já concentra
bastante informação visual; o sinalizador some assim que o cadastro for completado pelo formulário
normal de edição, preenchendo RG, CPF e data de nascimento).

## Banco de dados

Migration nova, só em `atletas_base`:

```sql
-- Data de nascimento passa a ser opcional só pra permitir o cadastro rápido pelo Campograma (Nome +
-- Posição) — RG e CPF já eram opcionais desde a migração 0076_captacao_alojamento_base.sql.
alter table public.atletas_base alter column data_nascimento drop not null;

-- Classificação ganha um 4º valor, "dispensa" ("Dispensa (pendente)" — sinalizador de saída em
-- avaliação, não muda o status; só o Relatório de Dispensa formal muda o status pra 'dispensado').
alter table public.atletas_base drop constraint atletas_base_classificacao_check;
alter table public.atletas_base add constraint atletas_base_classificacao_check
  check (classificacao in ('g1', 'g2', 'g3', 'dispensa'));
```

Nenhuma mudança de RLS/grant — `atletas_base` já tem a política `authenticated_full_access`.

## Tipos TypeScript

- `AtletaClassificacao = "g1" | "g2" | "g3" | "dispensa"` (`lib/supabase/types.ts`).
- `AtletaBaseRow.data_nascimento: string | null` (era `string`).
- `AtletaBaseStatus` não muda (continua `AtletaStatus | "dispensado"` — o seletor do painel rápido só
  expõe os três valores de `AtletaStatus`, "dispensado" continua exclusivo do relatório).

## Arquivos afetados

- `supabase/migrations/0095_atleta_base_dispensa_pendente_data_nascimento_opcional.sql` (novo).
- `lib/supabase/types.ts` — `AtletaClassificacao` com o 4º valor, `AtletaBaseRow.data_nascimento`
  opcional.
- `lib/futebol/classificacao-atleta.ts` — nova entrada "dispensa" em `ATLETA_CLASSIFICACAO_OPTIONS`,
  `CLASSIFICACAO_LABEL`, `CLASSIFICACAO_BORDA`, `CLASSIFICACAO_BADGE`, `CLASSIFICACAO_ANEL` (e hex
  correspondente), com a cor roxo escuro (`purple-700` / `#7e22ce`).
- `app/treinador/atletas/actions.ts` — lista de valores aceitos em `salvarClassificacaoTreinador`
  passa a `["g1", "g2", "g3", "dispensa"]`.
- `components/campograma-elenco.tsx` — `TokenAtleta` ganha `onClick` (abre o painel), ícone de cruz
  médica (novo `MedicalCrossIcon` inline SVG) no canto oposto ao selo de contrato, correção do
  `overflow-hidden` (mover pra um wrapper interno só da foto), botão "+ Adicionar" em cada linha
  (ocupada ou vazia); novos componentes `PainelEdicaoAtleta` (modal de classificação/status) e
  `PainelNovoAtleta` (modal de nome/posição), ambos usando `ModalShell`; `Legenda` ganha a entrada
  "Dispensa (pendente)".
- `app/base/atletas/campograma/page.tsx` — inclui `status` no `select` da query (necessário pro ícone
  de DM no token; `rg`/`cpf` não entram aqui, já que "Cadastro incompleto" não aparece no Campograma).
- `lib/futebol/campograma.ts` — `AtletaCampograma` ganha o campo `status: AtletaBaseStatus | null`.
- `app/base/atletas/campograma/actions.ts` — duas ações novas:
  `salvarClassificacaoStatusCampograma` (mirroring `moverAtletaCampograma`) e
  `criarAtletaRapidoCampograma`.
- `lib/validation/schemas.ts` — schema novo e enxuto `atletaRapidoCampogramaSchema` (nomeCompleto,
  posicao, categoria — só os três campos do formulário rápido, sem RG/CPF/data de nascimento).
- `app/base/atletas/[categoria]/page.tsx` e `app/base/atletas/[categoria]/[id]/ver/page.tsx` — badge
  "Cadastro incompleto" calculado na leitura (`!rg || !cpf || !data_nascimento`).

## Fora de escopo (deliberado)

- Futebol Profissional continua fora — nenhuma das três partes desta spec toca nele.
- O treinador não ganha acesso ao Campograma nem à edição de Status — só a opção "Dispensa" no
  seletor de classificação que ele já tem em "Meus atletas".
- "Dispensa (pendente)" não muda `status` nem remove o atleta de nenhuma listagem/convocação — só o
  Relatório de Dispensa formal (fluxo já existente, sem mudança) efetiva a saída de verdade.
- Nenhum ícone novo pro status "Suspenso" no token do Campograma nesta rodada — só o Departamento
  Médico, conforme pedido.
- O cadastro rápido pelo Campograma não passa pela Captação/Avaliação — cria direto em `atletas_base`.
- "Cadastro incompleto" não aparece no token do Campograma, só na listagem da categoria e na página
  "ver" do atleta.
