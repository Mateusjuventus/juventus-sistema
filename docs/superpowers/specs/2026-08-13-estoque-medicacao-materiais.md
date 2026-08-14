# Estoque: "Médico" vira "Medicação" e entra a lista de Materiais — 13/08/2026

## 1. Renomear "Médico" para "Medicação"

Trocado o rótulo em toda a interface e nos documentos: tela de escolha do Estoque, permissões de
usuário, ficha de Saída, comprovante de Entrada e relatório do catálogo.

**O valor gravado no banco continua sendo `medico`.** Renomeá-lo obrigaria a reescrever de uma vez
`estoque_itens`, `estoque_entradas`, `estoque_saidas` e a permissão de cada perfil, mexendo em dado
que já existe, para ganhar só uma URL mais bonita (`/estoque/medico` continua sendo o endereço). Não
paga o risco. O único lugar onde isso aparece para o usuário é a barra de endereço.

Uma coisa que **não** mudou de propósito: "Departamento Médico" segue escrito assim onde é o nome do
departamento — o subtítulo dos documentos, a opção de departamento na ficha de Saída e o texto da
declaração de medicamentos. O departamento é médico; o que se estoca é medicação.

## 2. Nova ramificação: Materiais (migração 0072)

Terceira lista dentro do módulo Estoque, com o mesmo funcionamento das outras duas — catálogo,
Entradas, Saídas (com ficha numerada em sequência própria), histórico e relatório, sem se misturar
com Esportivo nem com Medicação. Entra também na permissão por ramificação (0026), liberada para
quem já usa o sistema.

A migração troca o CHECK de `categoria` nas **três** tabelas que guardam esse campo
(`estoque_itens`, `estoque_entradas`, `estoque_saidas`) — esquecer uma delas só apareceria na hora
de registrar a primeira entrada de material.

### O que muda de texto em Materiais

Cada lista pensa a mesma informação de um jeito, e isso estava resolvido com `categoria === "medico"
? ... : ...` espalhado pelo código. Com três ramificações esse ternário passa a ser uma armadilha:
tudo que não é Medicação herda silenciosamente o comportamento do Esportivo — e o sistema começaria
a perguntar o "tamanho" de um cone de treino. Por isso `lib/estoque/labels.ts` virou um `Record` por
categoria, que o TypeScript obriga a preencher inteiro:

- **Esportivo**: TAMANHO (P/M/G/Único), porque é uniforme.
- **Medicação**: UNIDADE (Caixa/Unidade/Pacote), nome do item chamado de "Descrição" — é como a nota
  fiscal se refere ao medicamento — e o campo "Mg" (dosagem).
- **Materiais**: UNIDADE (Unidade/Caixa/Par/Jogo), com nome próprio em vez de descrição, e sem "Mg".

Os documentos seguiram o mesmo caminho: os `Record<EstoqueCategoria, ...>` de título, subtítulo e
texto de declaração passaram a exigir a entrada de Materiais, e foi o próprio TypeScript que apontou
cada arquivo que faltava preencher.

A declaração da ficha de Saída de Materiais segue a linha do Esportivo — material é patrimônio do
Clube e volta —, mas sem falar em uniforme: fala em zelar pela conservação e devolver ao fim da
atividade ou quando o Clube pedir. Medicação continua com o texto próprio (medicamento não retorna).

No relatório em PDF, a coluna de variação passa a se chamar "Tamanhos / Qtd." ou "Unidades / Qtd."
conforme a lista, em vez de sempre "Tamanhos".

## Fora de escopo

- Renomear o valor `medico` no banco (ver acima).
- Materiais no Futebol de Base: lá o Estoque é uma lista só, sem coluna `categoria` — mudaria a
  estrutura da Base inteira, e não foi pedido.
