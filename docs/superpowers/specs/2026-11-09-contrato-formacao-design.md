# Contrato de Formação — geração automática a partir do modelo padrão

## Contexto

Pedido do Mateus em 09/11/2026, anexando um .docx real já assinado (atleta Hugo Valdez de Jesus
Guanez) como modelo: "quero agora colocar uma opção de contrato no sistema... Contrato de
Formação... quero o sistema pegue o contrato e deixe ele padronizado no sistema e que fique tipo
automatico ao gerar selecionando os atletas. Ele pega os dados, insere e gera. Não quero que altere
nada, melhore nada no contrato. e deixe somente editavel as informações que são dos atletas."

"Formação" já existe como um dos valores de `tipo_contrato` em `atleta_contratos` desde
`0097_atleta_contrato_formacao_tipo.sql` — é o vínculo usado pra atleta de Base ainda menor de 16
anos, sem contrato de trabalho formal (ver `contratoTemRemuneracaoFormal`/`atletaTemDadosPagamento`
em `lib/futebol/contrato.ts`). O que falta é o sistema produzir o documento formal (o "Contrato de
Formação Desportiva e Outras Avenças", nos termos da Lei 9.615/1998 art. 29 e Lei 14.597/2023 art.
99) já preenchido com os dados do atleta, a partir do modelo padrão do clube.

## Escopo

- **Um atleta por vez.** Confirmado com o Mateus: sem tela de seleção em lote por agora — o
  documento é gerado a partir da ficha do próprio atleta, dentro do fluxo de Contrato que já existe
  (`ContratoForm`/"Novo contrato"). "Selecionando os atletas" do pedido original virou, na prática,
  "selecionando o atleta" (singular) na tela onde você já lança o contrato dele.
- **Só Tipo de contrato = "Formação".** O botão de gerar o documento só aparece quando o contrato
  vigente do atleta é desse tipo — não depende da categoria (Base/Profissional), só do tipo de
  contrato escolhido, mesmo critério que `contratoTemRemuneracaoFormal`/`atletaTemDadosPagamento`
  já usam pra outras decisões de UI.
- **Nenhuma mudança no texto do contrato.** Confirmado com o Mateus, inclusive a frase que parece
  uma anotação pessoal no final da Cláusula 14.1 (g.2) ("...-verificar se esses termos se aplicam ao
  atleta, se há alguma alteração.") — fica exatamente como está no arquivo original, sem remover.
- **Saída em PDF.** Decisão revista em 09/11/2026 — o Mateus pediu PDF em vez de Word. Como o
  ambiente roda em Next.js/Vercel (serverless), sem LibreOffice/Word disponível pra converter um
  `.docx` em PDF com fidelidade, a abordagem escolhida (confirmada com o Mateus, opção "A" entre as
  duas propostas) é escrever o contrato como um documento `@react-pdf/renderer` — a mesma técnica já
  usada pra Ficha do Atleta, Relatório de Dispensa e Parecer Final neste sistema, sem precisar de
  nenhuma ferramenta nova. O texto de cada cláusula é transcrito literalmente do `.docx` original
  (nenhuma palavra alterada, incluindo a frase da Cláusula 14.1 g.2 — ver seção "Escopo" acima), só
  os ~12 pontos variáveis entram como campos preenchidos automaticamente. Fica entendido que o
  resultado não é pixel-a-pixel idêntico ao arquivo Word (mesmo texto, mas layout gerado pelo
  react-pdf) — ver "Cabeçalho e rodapé" abaixo sobre como o layout visual é preservado.

## Dados novos

Dois dados que o modelo pede e não existem hoje no cadastro:

1. **CPF da mãe e CPF do pai do atleta** — hoje só existe nome e telefone (`mae_nome`,
   `mae_telefone`, `pai_nome`, `pai_telefone`). Vão dois campos novos, `mae_cpf` e `pai_cpf`, na
   tabela `atletas`, ao lado dos campos que já existem na seção Dados Pessoais > Responsáveis do
   cadastro do atleta. Preenchimento manual, sem máscara/validação adicional (mesmo padrão dos
   campos de CPF já existentes no formulário do atleta).
2. **Valor da bolsa de aprendizagem (R$/mês)** — não existe nenhum campo equivalente hoje (as 5
   rubricas de `atleta_contratos` — salário CTPS, direito de imagem, bonificação, auxílio moradia,
   outros — são tratadas como não aplicáveis a "Formação", ver `contratoTemRemuneracaoFormal`). Vai
   uma coluna nova, `bolsa_aprendizagem numeric(12,2) not null default 0`, em `atleta_contratos`.
   Aparece como campo novo em `ContratoForm` **só quando o Tipo de contrato selecionado for
   "Formação"** (mesmo padrão de exibição condicional que as rubricas já têm pra
   Definitivo/Empréstimo). Confirmado com o Mateus: ele mesmo preenche esse valor manualmente ao
   lançar o contrato, e a partir daí fica salvo no registro do contrato.

## Vigência

- **Início**: continua sendo digitado manualmente no formulário, sem mudança — confirmado com o
  Mateus ("vigência eu escolho na hora").
- **Fim**: calculado automaticamente — a data imediatamente anterior àquela em que o atleta
  completa 20 anos, a partir da `data_nascimento` já cadastrada (mesma regra que já está escrita no
  próprio texto do contrato padrão). Na prática: quando "Formação" é selecionado como Tipo de
  contrato em `ContratoForm`, o campo de vigência fim já vem pré-preenchido com esse cálculo (feito
  client-side, a partir da data de nascimento do atleta passada à página), mas continua sendo um
  campo de data editável normal — se algum caso precisar de uma data diferente, dá pra ajustar à
  mão, do mesmo jeito que os outros campos de data do formulário.
- Nova função pura `dataFimFormacao(dataNascimento: string): string` em `lib/futebol/contrato.ts`
  (ou módulo próprio), coberta por teste — `dataNascimento + 20 anos - 1 dia`. É só o valor sugerido
  no formulário; não é recalculada/imposta de volta no banco depois de salva.

## Fluxo de geração do documento

1. Mateus abre a ficha do atleta → "Novo contrato" (ou "Aditivo", se já existir um vigente) →
   escolhe "Formação" como Tipo de contrato → aparecem os campos de Bolsa de aprendizagem e a
   vigência fim pré-preenchida → preenche/ajusta e salva, exatamente como já funciona hoje pros
   outros tipos de contrato (mesma action `criarContrato`, só com a coluna nova gravada junto).
2. Depois de salvo, no card de Contrato da ficha do atleta (`components/contrato-secao.tsx`), um
   botão novo **"Baixar Contrato de Formação"** aparece sempre que o contrato vigente do atleta for
   do tipo "Formação" (ao lado do que já existe hoje — status, rubricas quando aplicável, etc.).
3. O botão aponta pra uma rota nova, `GET /atletas/[id]/contrato/formacao/pdf`, que: busca o
   contrato vigente do atleta (confirma que é tipo "Formação" — 404/aviso se não for ou não
   existir), busca os dados do atleta, monta os valores de mesclagem (seção abaixo), renderiza o
   documento `@react-pdf/renderer` (com o cabeçalho/rodapé em imagem, ver seção acima) e retorna o
   PDF pronto pra download/visualização (mesmo padrão das outras rotas de PDF do sistema, ex.
   `app/atletas/[id]/ficha/pdf/route.tsx`), nome de arquivo
   `contrato-formacao-{nome-do-atleta}.pdf`.

Nenhuma tela nova de seleção, nenhuma mudança na navegação — só esse botão novo e o campo extra
dentro do formulário que já existe.

## O modelo e a mesclagem de dados

### Abordagem técnica

Hoje todo documento do sistema (Ficha do Atleta, Relatório de Dispensa, Parecer Final) é um
componente React escrito à mão com `@react-pdf/renderer` — texto e formatação são reescritos em
JSX. A primeira versão desta spec evitava esse caminho pro Contrato de Formação (~150 parágrafos +
tabelas de assinatura de texto jurídico, risco de transcrição) e propunha preencher o próprio
`.docx` como modelo-mestre. Com a saída confirmada em PDF (09/11/2026) e sem LibreOffice/Word
disponível no ambiente serverless da Vercel pra converter `.docx` em PDF com fidelidade, foram
apresentadas duas opções ao Mateus — (A) escrever o contrato como documento `@react-pdf/renderer`,
igual aos outros documentos do sistema, sem ferramenta nova; (B) preencher o `.docx` e converter pra
PDF via conversão automática (ferramenta nova e pesada, com seu próprio risco de fidelidade de
layout). **Decisão: opção A.**

Abordagem adotada: o texto de cada cláusula do `.docx` original é transcrito literalmente pro
componente `@react-pdf/renderer` (nenhuma palavra alterada — nem a frase da Cláusula 14.1 g.2, que
fica exatamente como está no arquivo original), com os ~12 pontos variáveis (ver tabela abaixo) como
campos preenchidos automaticamente a partir dos dados do atleta/contrato. Nenhuma biblioteca nova —
mesma ferramenta (`@react-pdf/renderer`) já usada no projeto.

### Cabeçalho e rodapé

Pedido do Mateus em 09/11/2026: preservar o layout do documento original, "cabeçalho e rodapé". O
`.docx` enviado já tem essas duas faixas como imagens de cabeçalho/rodapé de página (extraídas do
arquivo): uma faixa no topo com o escudo do Juventus, e uma faixa no rodapé com o endereço do clube
("CA JUVENTUS SAF — Rua Javari, 101, Bairro Mooca, CEP: 03164-010 — São Paulo, SP"). Essas duas
imagens são reaproveitadas tal como estão (mesmos arquivos, sem redesenhar) em todas as páginas do
PDF gerado — cabeçalho no topo, rodapé no rodapé de cada página — reproduzindo o mesmo visual do
Word original. Os arquivos ficam salvos em `public/brand/contrato-formacao-cabecalho.png` e
`public/brand/contrato-formacao-rodape.png`; o conteúdo do contrato (texto das cláusulas, dados do
atleta) ocupa a área entre as duas faixas, com margens internas normais — igual ao `DocumentoFooter`
padrão do sistema, só que com esta faixa de imagem no lugar do rodapé de texto simples que os outros
documentos usam.

### Campos de mesclagem

| Marcador no modelo | Fonte | Observação |
|---|---|---|
| `nome_completo` | `atletas.nome_completo` | — |
| `data_nascimento` | `atletas.data_nascimento` | formatada `DD/MM/AAAA` |
| `naturalidade` | `atletas.cidade_natal` + `atletas.uf_natal` | `"Cidade/UF"`, mesma função `naturalidade()` já usada na Ficha |
| `rg` | `atletas.rg` | — |
| `cpf` | `atletas.cpf` | formatado, mesma função `formatCPF` já usada no resto do sistema |
| `mae_nome` | `atletas.mae_nome` | — |
| `mae_cpf` | `atletas.mae_cpf` (campo novo) | formatado com `formatCPF` |
| `pai_nome` | `atletas.pai_nome` | — |
| `pai_cpf` | `atletas.pai_cpf` (campo novo) | formatado com `formatCPF` |
| `endereco` | endereço estruturado do atleta (`logradouro`/`numero`/`complemento`/`bairro`/`cidade`/`uf`/`cep`) | mesma composição de `enderecoFichaAtleta` |
| `vigencia_inicio` | `atleta_contratos.vigencia_inicio` (do contrato vigente) | `DD/MM/AAAA` |
| `vigencia_fim` | `atleta_contratos.vigencia_fim` (do contrato vigente) | `DD/MM/AAAA` |
| `bolsa_valor` | `atleta_contratos.bolsa_aprendizagem` (campo novo) | formatado em `R$ X,XX` + valor por extenso entre parênteses, igual ao modelo original ("R$ 200,00 (Duzentos reais)") |
| `data_assinatura_extenso` | `atleta_contratos.vigencia_inicio` | por extenso, ex. "03 de Novembro de 2026" — mesma data da vigência início, igual ao exemplo enviado; nova função de formatação (`formatDataExtenso`), já que não existe nenhuma no sistema hoje |

Campo que fica sem dado (ex. responsável não cadastrado, CPF vazio): mesclagem grava string vazia —
o marcador simplesmente desaparece, sem "—" nem aviso, já que o documento final é pra impressão/
assinatura física e pode ser completado à mão se faltar algo (mesmo espírito de deixar as linhas de
testemunhas em branco, que já é assim no modelo original).

Confirmado com o Mateus: se o contrato vigente não for "Formação" ou não existir, o botão
simplesmente não aparece — nenhuma mensagem de erro em tela, não é um fluxo que deveria acontecer na
prática.

### Valor por extenso da bolsa

Precisa de uma função que escreva um valor em reais por extenso (ex. 200 → "Duzentos reais"), já que
o modelo original tem esse formato. Vou escrever uma função nova e simples
(`valorPorExtenso(valor: number): string`), coberta por testes com os casos mais comuns (dezenas,
centenas, plural "reais"/"real" quando valor = 1,00) — não existe nada parecido no sistema hoje.

## Resumo das mudanças

- **Migração nova** (`0161_atleta_contrato_formacao_campos.sql`): `atletas.mae_cpf`,
  `atletas.pai_cpf` (text, nullable); `atleta_contratos.bolsa_aprendizagem` (numeric(12,2), not null
  default 0).
- **Formulário de cadastro do atleta** (Dados Pessoais > Responsáveis): dois campos novos de CPF.
- **`ContratoForm`**: campo novo "Bolsa de aprendizagem", visível só quando Tipo de contrato =
  "Formação"; vigência fim pré-preenchida (calculada) quando esse tipo é escolhido.
- **`criarContrato`/action de salvar contrato**: passa a gravar `bolsa_aprendizagem`.
- **Novo componente** `lib/pdf/contrato-formacao-document.tsx` (`@react-pdf/renderer`, mesmo padrão
  de `ficha-atleta-document.tsx`): todas as cláusulas transcritas literalmente do `.docx` original,
  com os ~12 campos variáveis, e cabeçalho/rodapé em imagem (ver seção "Cabeçalho e rodapé").
- **Duas imagens novas** em `public/brand/`: `contrato-formacao-cabecalho.png`,
  `contrato-formacao-rodape.png` (extraídas do `.docx` original, sem nenhuma edição).
- **Nova rota** `GET /atletas/[id]/contrato/formacao/pdf`.
- **`components/contrato-secao.tsx`**: botão novo "Baixar Contrato de Formação", condicional ao
  tipo do contrato vigente.
- **Nenhuma dependência nova** no `package.json` — reaproveita `@react-pdf/renderer`, já usado no
  projeto.

## Fora de escopo (por agora)

- Seleção/geração em lote de vários atletas de uma vez.
- Qualquer edição ou "melhoria" do texto jurídico do contrato.
- Geração em formato Word (.docx) — decidido gerar só em PDF (ver "Escopo" acima).
- Validação/máscara de CPF dos responsáveis além do que já existe pros CPFs do próprio atleta.
- **Vigência do registro no BID.** O Mateus mencionou, em 09/11/2026, que o módulo de Contrato
  (de forma geral, não só "Formação") vai precisar de uma segunda vigência própria — a do registro
  no BID (Boletim Informativo Diário da CBF), independente da vigência do contrato em si, com início
  auto-preenchido pela data em que o contrato foi gerado/salvo e atualizada sempre que o contrato for
  corrigido depois. Confirmado explicitamente pelo próprio Mateus que **isso não tem nada a ver com o
  Contrato de Formação** — é só um aviso de que essas duas datas vão existir em "Contratos" no futuro.
  Registrado aqui só pra não se perder; não faz parte desta spec nem será implementado agora.
