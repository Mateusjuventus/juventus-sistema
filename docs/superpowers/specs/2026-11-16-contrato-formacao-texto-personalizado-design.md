# Texto personalizado do Contrato de Formação (por atleta)

Data: 16/11/2026
Status: Design aprovado pelo Mateus — pronto para virar plano de implementação

## Contexto

Hoje o texto de cláusulas do Contrato de Formação é fixo, gerado a partir de um
array `BLOCOS: Bloco[]` dentro de `lib/pdf/contrato-formacao-document.tsx`
(atleta menor de idade) e `lib/pdf/contrato-formacao-maior-document.tsx`
(atleta maior de idade). Qual template é usado é decidido dinamicamente no
momento da geração do PDF (`atletaMaiorIdade(atleta.data_nascimento, hoje)`),
não fixado na criação do contrato.

Cada um desses dois documentos contém, na prática, **dois instrumentos
jurídicos concatenados** (via `{tipo: "quebraPagina"}`):

1. O "Contrato de Formação Desportiva" principal — termina com parágrafo de
   fechamento + data + tabela de assinatura da JUVENTUS SAF + assinatura do
   ATLETA (+ testemunhas, só no contrato menor).
2. As "Cláusulas Adicionais" — termina com seu próprio parágrafo de fechamento
   + data + tabela de assinatura da JUVENTUS SAF + assinatura do ATLETA.

Mateus pediu uma forma de ajustar o texto das cláusulas **de um atleta
específico**, sem mexer no padrão usado por todos os outros, e deixou claro
que a parte de assinatura não deve ser tocada por essa mudança.

## Requisitos (confirmados com o Mateus)

- **Por atleta**: a personalização vale só para o contrato daquele atleta, não
  para o template geral.
- **Texto inteiro, editor livre**: o Mateus pode reescrever o corpo das
  cláusulas à vontade (perde a formatação em negrito de títulos de cláusula —
  ele já sabe disso e prefere assim).
- **Assinatura sempre fixa**: data, tabela de assinatura da JUVENTUS SAF,
  linha de assinatura do ATLETA e testemunhas continuam sendo geradas
  automaticamente, do jeito que são hoje — nunca fazem parte do texto editável.
- **Os dois contratos**: a personalização precisa funcionar tanto no contrato
  de menor quanto no de maior de idade.
- **Duas partes separadas**: para não mexer na lógica de assinatura, o
  contrato principal e as Cláusulas Adicionais têm cada um seu próprio campo
  de texto personalizado — exatamente como as duas partes já existem hoje,
  cada uma com seu fechamento + assinatura automática.

## Modelo de dados

Duas novas colunas, nuláveis, na tabela `atleta_contratos` (compartilhada
pelos dois templates):

```sql
alter table atleta_contratos
  add column texto_contrato_custom text,
  add column texto_clausulas_adicionais_custom text;
```

- `null` (padrão) → comportamento de hoje: corpo gerado a partir do `BLOCOS`.
- preenchido → o PDF usa esse texto no lugar do corpo gerado por `BLOCOS`
  para aquela parte, mas a data, a tabela de assinatura da JUVENTUS SAF, a
  assinatura do ATLETA e as testemunhas continuam sendo geradas pelo código
  atual, sem nenhuma mudança.

Migration: `supabase/migrations/0167_atleta_contrato_formacao_texto_customizado.sql`.

Ao criar um novo contrato de Formação (botão "Novo contrato", fluxo de
renovação via `criar_contrato_atleta`), a linha nova nasce sempre com as duas
colunas em `null` — a personalização não é copiada automaticamente de um
contrato encerrado para o novo. Isso é intencional: uma renovação é um
contrato novo, e o texto customizado antigo pode não fazer mais sentido.

## Como o texto padrão vira o ponto de partida do editor

Hoje os `BLOCOS` só existem para renderização direta em PDF (componentes
`@react-pdf/renderer`), nunca como texto puro. Para pré-preencher o editor com
o texto atual (já com os dados do atleta substituídos), cada arquivo de
documento ganha uma função nova, por exemplo:

```ts
// lib/pdf/contrato-formacao-document.tsx
export function textoPadraoContratoPrincipal(campos: Campos): string { ... }
export function textoPadraoClausulasAdicionais(campos: Campos): string { ... }
```

Essas funções percorrem o mesmo `BLOCOS` já usado para gerar o PDF, mas param
antes dos blocos de fechamento/assinatura (`{tipo: "centro"}` de encerramento
em diante), concatenando título + parágrafos + itens como texto simples
(quebra de linha dupla entre blocos). O mesmo `preencher()` que já existe para
os placeholders é reaproveitado, então o texto que aparece no editor já vem
com nome do atleta, datas, valores etc. substituídos — exatamente o texto que
sairia no PDF hoje, só que como string editável.

## Onde o editor aparece na tela

Dentro do modal "Contrato de Formação" (`components/contrato-formacao-button.tsx`),
visível só quando já existe um contrato (`modoEdicao`, mesmo critério do link
"Baixar Contrato de Formação" hoje):

- Novo botão **"Personalizar texto do contrato"**, ao lado do "Baixar
  Contrato de Formação".
- Abre um modal/seção com dois `<textarea>` grandes:
  - **Texto do Contrato Principal** — pré-preenchido com
    `textoPadraoContratoPrincipal` (ou com o `texto_contrato_custom` salvo, se
    já houver um).
  - **Texto das Cláusulas Adicionais** — mesma lógica, com
    `textoPadraoClausulasAdicionais` / `texto_clausulas_adicionais_custom`.
- Nota fixa visível acima dos campos: "A data, a assinatura da JUVENTUS SAF, a
  assinatura do atleta e as testemunhas continuam automáticas e não fazem
  parte deste texto."
- Botão **"Salvar texto personalizado"**.
- Botão **"Restaurar padrão"** — limpa as duas colunas (volta pra `null`),
  com confirmação simples antes de aplicar (ação destrutiva da personalização,
  não do contrato em si).

## Actions

Em `app/atletas/[id]/contrato/formacao/actions.ts`:

- `atualizarTextoContratoFormacao(atletaId, { textoContrato, textoClausulasAdicionais })`
  — faz `update` direto na linha vigente de `atleta_contratos` (sem passar
  pelas RPCs `criar_contrato_atleta`/`atualizar_contrato_formacao_vigente`,
  já que não mexe em vigência/bolsa, só nesses dois campos de texto).
- `restaurarTextoPadraoContratoFormacao(atletaId)` — mesma coisa, setando os
  dois campos para `null`.

## Mudança no PDF (route.tsx + documentos)

Em `app/atletas/[id]/contrato/formacao/pdf/route.tsx`, ao montar `campos` para
cada template, passar também `contrato.texto_contrato_custom` e
`contrato.texto_clausulas_adicionais_custom`.

Dentro de `ContratoFormacaoDocument`/`ContratoFormacaoMaiorDocument`: quando o
texto customizado da respectiva parte existir, renderizar esse texto (dividido
em parágrafos pela quebra de linha dupla) no lugar do trecho de `BLOCOS` que
vai do título até o parágrafo de fechamento daquela parte — a partir do
fechamento em diante (data, tabela de assinatura, assinatura do atleta,
testemunhas) o código é o mesmo de hoje, sem nenhuma alteração.

## Escopo

Vale para os dois templates (menor e maior de idade), já que a coluna fica na
tabela compartilhada `atleta_contratos` e a lógica de branch é a mesma nos
dois arquivos de documento — implementada uma vez em cada um.

## Fora de escopo (não incluído nesta spec)

- Qualquer mudança na lógica ou no layout da assinatura, data, tabela da
  JUVENTUS SAF ou testemunhas — permanece 100% igual ao que existe hoje.
- Histórico de versões do texto personalizado (se o Mateus editar de novo,
  sobrescreve o texto salvo, sem guardar versões anteriores) — mesmo padrão
  de "sem histórico" já usado em `atualizar_contrato_formacao_vigente` para
  os outros campos do contrato de Formação.
- Qualquer validação automática do conteúdo do texto livre (ortografia,
  cláusulas obrigatórias etc.) — fica inteiramente sob responsabilidade de
  quem edita.
