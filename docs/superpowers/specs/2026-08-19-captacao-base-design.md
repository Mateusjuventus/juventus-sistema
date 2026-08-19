# Captação/Avaliação, cadastro enriquecido de Atleta, Alojamento e Campograma — 19/08/2026

## O pedido

Três frentes pedidas juntas no Futebol de Base:

1. **Captação/Avaliação**: um banco de dados dos candidatos em teste — "Nº, Data de início, Atleta,
   Nascimento, Posição, Categoria, Cidade, Indicação, Alojamento, Status (Avaliação, Aprovado,
   Dispensado, Não compareceu)" —, com PDF em paisagem (a quantidade de colunas não cabe em
   retrato) e dashboards de aprovados/liberados, incluindo um mapa mostrando de onde vêm os
   candidatos por região.
2. **Mais informação no cadastro de Atleta da Base**: se é alojado ou não, valor de ajuda de custo,
   agência, empresário (com telefone), nome/telefone da mãe e do pai, endereço com
   autopreenchimento por CEP, escola — e um link público pra pais/atletas preencherem.
3. **Campograma**: os atletas de uma categoria, separados por posição, num campo.

Perguntado o que fazer quando um candidato é aprovado, definido: **o sistema cria sozinho o
cadastro completo em Atletas** (por isso RG/CPF viram opcionais em `atletas_base` — quem vem da
Captação raramente tem esses documentos à mão nessa fase). Perguntado que tipo de mapa, definido:
**mapa do Brasil por estado** (mais simples e confiável que geocodificar cidade por cidade).
Perguntado como calcular vagas do alojamento, definido: **capacidade total cadastrada** numa tela
de configuração. Perguntado pra que serve o link público, definido: **cria um candidato novo**
(fica em avaliação até o Mateus decidir) — não completa cadastro de atleta já existente.

## Como ficou

### Captação/Avaliação

`/base/captacao`: lista com os cartões de contagem por status, busca por nome, filtro por status,
botão de PDF (paisagem) e o toggle do link público. `/base/captacao/novo` e `/base/captacao/[id]`
usam o mesmo formulário (`CaptacaoForm`) — só o nome é obrigatório de verdade; o resto entra
conforme a avaliação anda. `/base/captacao/dashboard` traz o funil completo (em avaliação/
aprovados/dispensados/não compareceu), a taxa de aprovação, o mapa por estado e um retrato do
elenco oficial (liberados/suspensos/departamento médico por categoria) — os "aprovados" e
"liberados" pedidos juntos.

Aprovar (`aprovarCaptacao`) exige categoria, posição e data de nascimento preenchidas — sem isso o
Atleta não teria como nascer com um cadastro esportivo mínimo — e cria a linha em `atletas_base`
copiando todos os dados já coletados (família, empresário, endereço, escola, ajuda de custo,
alojamento). `atleta_gerado_id` marca que já foi aprovado, pra o botão não duplicar o cadastro.

`/cadastro-atleta-base` (público, sem login) cria um candidato novo direto em `captacao_base`, com
`status: "avaliacao"` e `origem: "publico"` fixados no servidor — nunca decididos pelo formulário.
Controlado por `configuracoes_cadastro_atleta_base` (mesmo formato do toggle de Staff/Comissão da
Base).

### Cadastro de Atleta enriquecido

`atletas_base` ganhou: `alojado`, `valor_ajuda_custo`, `agencia`, `empresario_telefone`,
`mae_nome`/`mae_telefone`, `pai_nome`/`pai_telefone`, `escola`, e o endereço estruturado
(`cep`/`logradouro`/`numero`/`complemento`/`bairro`/`cidade`/`uf`) que alimenta o
autopreenchimento por CEP via `EnderecoFields` (o mesmo componente já usado no Staff Operacional).
`endereco_atual` (texto livre) continua na tabela por compatibilidade, mas o formulário passa a
usar os campos estruturados daqui pra frente.

### Alojamento

`/base/alojamento`: cartões de vagas totais/alojados/disponíveis, aviso quando a ocupação passa da
capacidade, formulário pra editar a capacidade total (`alojamento_base_config`, singleton) e a
relação de quem está alojado — lida direto de `atletas_base.alojado = true`, sem tabela própria pra
isso (ver `lib/futebol/alojamento.ts`).

### Campograma

`/base/atletas/campograma?categoria=<cat>`: o elenco de uma categoria posicionado num campo,
agrupado por `categoria_posicao` (o mesmo campo que já colore a tag GOL/ZAG/LAT/MEI/ATA na
Convocação). Não é a escalação de um jogo específico — é "quantos zagueiros o Sub-17 tem, e quem
são" (ver `lib/futebol/campograma.ts`).

## O mapa do Brasil sem depender de fronteiras de estado

Desenhar as fronteiras reais de 27 estados é um SVG grande e frágil de manter. Em vez disso, cada
estado vira um PONTO posicionado pela latitude/longitude aproximada da sua capital, projetada
linearmente num retângulo (`lib/futebol/mapa-brasil.ts`) — a nuvem de 27 pontos já desenha um
contorno reconhecível do país. Tamanho e cor de cada bolha crescem com a quantidade de candidatos
daquele estado (`components/mapa-brasil-uf.tsx`). Não é uma carta náutica — é o suficiente pra ver
de onde vem a maior parte da captação.

## Por que RG/CPF viram opcionais em `atletas_base`

Único ponto que toca uma constraint de banco já existente: `alter column rg/cpf drop not null`,
só na tabela do Futebol de Base (a do Profissional não foi tocada). Motivo: aprovar um candidato da
Captação cria o Atleta na hora, e nessa fase RG/CPF quase nunca estão à mão. O formulário manual de
cadastro (`atleta-base-form.tsx`) continua pedindo os dois como obrigatórios — a diferença só vale
pro caminho automático da aprovação.

## Erro conhecido do projeto, evitado desta vez

Toda tabela nova lida por uma tela SEM LOGIN precisa de GRANT pro `service_role`, não só pro
`authenticated` — regra registrada depois de três ocorrências reais (`0027`, `0060`, `0074`). A
migração desta feature (`0076_captacao_alojamento_base.sql`) já nasceu com esses grants
(`captacao_base` e `configuracoes_cadastro_atleta_base`), evitando a correção posterior.

## Fora de escopo por ora

- Geocodificação de verdade da cidade do candidato (o mapa usa só a UF).
- Notificar o Mateus quando um candidato novo chega pelo link público.
- Reservar uma vaga específica do alojamento (quarto/cama) — hoje é só capacidade total x contagem.
