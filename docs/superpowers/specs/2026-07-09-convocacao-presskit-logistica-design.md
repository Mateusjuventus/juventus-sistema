# Convocação, Presskit e Logística de Jogo — Design

**Data:** 2026-07-09
**Autor:** Mateus Santos (Supervisor de Futebol Profissional — Juventus)
**Status:** Aprovado

## Contexto

Com a Fundação de Cadastros + Controle de Elenco em produção (Atletas, Comissão Técnica/Diretoria,
Staff Operacional, Jogos/Competições), este documento cobre o segundo módulo do roadmap definido em
`2026-07-08-fundacao-cadastros-elenco-design.md`: a convocação de cada jogo e tudo que depende dela
— presskit, rooming list, lista de passageiros de ônibus e credenciamento por zona no estádio.

O ponto central deste módulo é que **tudo parte da convocação de um jogo específico**: ao convocar
quem vai (atletas, comissão técnica/diretoria e staff operacional), essa mesma seleção alimenta a
geração dos PDFs de presskit, rooming list e lista de ônibus, evitando redigitar informação.

## Objetivo

Permitir que, a partir de um jogo já cadastrado, Mateus monte a convocação (atletas titular/reserva,
comissão técnica/diretoria e staff operacional que vão), e gere a partir dela: o presskit em PDF
para divulgação, a rooming list do hotel (jogo fora), a lista de passageiros do ônibus (jogo em casa
e fora) e o credenciamento por zona do staff/comissão técnica para acesso ao estádio.

## Fora de escopo (fica para módulos futuros)

- **Função no jogo** (o papel que cada pessoa do staff/comissão técnica vai efetivamente exercer
  durante a partida, ex: segurança do portão X) e a geração de recibos individuais/consolidados a
  partir dela — isso é do módulo futuro de **Operação de Jogo**. Neste módulo, a escalação registra
  apenas a Zona + Função de **credenciamento** (acesso ao estádio), que é conceitualmente diferente.
- Checklist de jogo.
- Cotação e dados de fornecedor (nome da empresa de ônibus, por exemplo — não entra nos PDFs deste
  módulo).
- Particularidades de jogo fora além de rooming list e ônibus (van, escolta, uniformização,
  vestiário) — módulo futuro de Operação de Jogo.
- Prestação de contas / dashboard financeiro.
- Catálogo de credenciamento de **jogo fora**: Mateus vai enviar um documento com as zonas/funções/
  vagas específicas de jogo fora; até lá, o catálogo de credenciamento cadastrado é o de jogo em
  casa. Ver "Pendências" abaixo.

## Modelo de dados

### Alterações em tabelas existentes

- `atletas`: novo campo `status` (enum: `liberado` | `suspenso` | `departamento_medico`, padrão
  `liberado`).
- `comissao_tecnica`: novo campo `tipo_quarto_preferido` (enum: `single` | `duplo`, opcional) — usado
  como sugestão ao montar a rooming list, editável a cada jogo.
- `staff_operacional`: o campo `funcao_setor` deixa de ser texto livre com sugestões e passa a
  referenciar `staff_funcoes_catalogo` (chave estrangeira).

### Novas tabelas

- **`staff_funcoes_catalogo`** — catálogo editável das funções de Staff Operacional: `id`, `nome`.
  Semente inicial: Segurança, Vigilante, Controlador de Acesso, Orientador, Limpeza, Bombeiro Civil,
  Gandula, Maqueiro, Gerente de Segurança, Administrativo, Responsável pelo Credenciamento. Mateus
  pode cadastrar novas funções direto pela tela de cadastro de Staff Operacional (opção "+ adicionar
  função"), sem depender de alteração no código. Esta lista é **independente** do
  `credenciamento_catalogo` (zona/vagas) descrito abaixo — são dois catálogos com propósitos
  diferentes.
- **`convocacoes`** — uma por jogo (`jogo_id`, único), com `capitao_atleta_id` (nullable).
- **`convocacao_atletas`** — `convocacao_id`, `atleta_id`, `status` (`titular` | `reserva`).
- **`convocacao_comissao`** — `convocacao_id`, `comissao_id` (quem vai).
- **`convocacao_staff`** — `convocacao_id`, `staff_id` (quem vai). Em jogo em casa, todo o Staff
  Operacional cadastrado é uma opção. Em jogo fora, a tela mostra por padrão apenas quem tem função
  "Segurança", com uma seção recolhida ("+ mostrar mais funções") para incluir qualquer outro staff
  quando aquele jogo específico precisar.
- **`rooming_list`** — `jogo_id`, `hotel_nome`, `hotel_endereco`, `checkin`, `checkout`.
- **`rooming_list_quartos`** — `rooming_list_id`, `tipo` (`single` | `duplo`), e uma tabela de
  ocupantes (`rooming_list_ocupantes`: `quarto_id`, `pessoa_tipo` [`comissao` | `staff`],
  `pessoa_id`).
- **`onibus_lista`** — `jogo_id`, `onibus_numero`, `horario_saida`.
- **`onibus_passageiros`** — `onibus_lista_id`, `pessoa_tipo` (`atleta` | `comissao` | `staff`),
  `pessoa_id`.
- **`credenciamento_catalogo`** — catálogo reutilizável de zonas/funções: `zona` (ex: Zona Plena,
  Zona Roxa, Zona Azul, Zona Vermelha, Zona Amarela — com cor associada), `funcao`, `vagas_totais`.
  Semente inicial a partir do relatório de jogo em casa enviado por Mateus.
- **`credenciamento_jogo`** — vínculo por jogo: `jogo_id`, `credenciamento_catalogo_id`,
  `pessoa_tipo` (`comissao` | `staff`), `pessoa_id`, `vaga_extra` (boolean — marca quando a pessoa
  foi credenciada além do limite padrão, por solicitação manual).

## Telas e funcionalidades

### Convocação (aba dentro da tela de um Jogo)

Três blocos de seleção:
- **Atletas** — lista todos os cadastrados; marcar cada um como Titular, Reserva, ou deixar sem
  marcar (não convocado). Um dos convocados é marcado como Capitão daquele jogo (campo
  `capitao_atleta_id`).
- **Comissão Técnica/Diretoria** — lista todos os cadastrados; marcar quem vai.
- **Staff Operacional** — em jogo em casa, lista todos os cadastrados (o staff inteiro normalmente
  trabalha no jogo). Em jogo fora, mostra por padrão só quem tem função "Segurança" (perfil que
  costuma viajar), com a opção "+ mostrar mais funções" para revelar e incluir qualquer outro staff
  quando for necessário para aquele jogo.

A convocação fica vinculada ao jogo e pode ser editada livremente até a data do jogo.

### Presskit (PDF)

Gerado a partir da convocação. Conteúdo:
- Escudo do Juventus e escudo do adversário (ver regra de posicionamento abaixo).
- Dados do jogo: competição, rodada/fase, data, horário, local/estádio.
- Lista de atletas relacionados (titulares e reservas), cada um com: nome, número da camisa, data de
  nascimento, posição, naturalidade (cidade/UF).
- Faixa/indicação de "Capitão" junto ao atleta marcado como capitão daquele jogo.
- Rodapé: nomes da comissão técnica/diretoria relacionados (somente nome).

### Regra de posicionamento dos escudos (todos os documentos oficiais)

Vale para Presskit, Rooming List, Lista de Ônibus, Credenciamento e qualquer documento futuro (ex:
recibos do módulo de Operação de Jogo) que exiba os dois escudos: **jogo em casa** — escudo do
Juventus primeiro (à esquerda); **jogo fora** — escudo do Juventus depois do escudo do time mandante
(à direita). Ou seja, a ordem sempre segue "mandante primeiro, visitante depois", e o Juventus ocupa
o lado correspondente ao seu papel naquele jogo (`jogos.mandante`). O escudo do adversário já é
cadastrado por jogo (`adversario_logo_path`); o escudo do Juventus é um arquivo único usado em todo o
sistema (cabeçalho, login, tela de departamentos e nos documentos).

### Rooming List (PDF) — jogos fora

Mateus informa nome do hotel, endereço e datas de check-in/check-out. O sistema monta quartos duplos
por padrão, sugerindo repetir a última dupla registrada para cada pessoa (histórico das rooming
lists anteriores); quando não há histórico para alguém, o quarto fica sem sugestão para preenchimento
manual. Pessoas da Comissão Técnica/Diretoria usam o `tipo_quarto_preferido` salvo no cadastro como
sugestão de single/duplo, editável a cada jogo. Mateus ajusta as duplas/quartos antes de gerar o PDF
final, que traz hotel, endereço, check-in/check-out e a organização dos quartos.

### Lista de Passageiros do Ônibus (PDF) — jogos em casa e fora

Mateus pode dividir as pessoas convocadas em múltiplos ônibus (Ônibus 1, Ônibus 2, ...) e informa o
horário de saída de cada um. O PDF traz o horário de saída e a lista de nomes por ônibus — sem dados
de empresa ou assento fixo.

### Credenciamento por Zona (seção separada, não aparece na convocação nem no presskit)

Na tela de escalar quem vai (Staff Operacional e Comissão Técnica/Diretoria — Atletas não passam por
credenciamento), cada pessoa recebe um campo de Zona + Função de credenciamento, escolhido a partir
do `credenciamento_catalogo`. O sistema mostra vagas usadas/livres por função e **trava** novas
atribuições quando uma função atinge o limite (`vagas_totais`) — a menos que Mateus use a opção
"solicitar vaga extra", que permite credenciar além do limite, marcando `vaga_extra = true` para
aquele caso.

Este é um dado exclusivamente de controle de acesso ao estádio: não aparece na convocação nem no
presskit. Tem opção de impressão/exportação em PDF com caixas de seleção para escolher quais colunas
(nome, zona, função, etc.) entram no impresso.

### Painel de Atletas (dentro do módulo Atletas já existente)

Nova visão que lista todos os atletas com foto e status (Liberado / Suspenso / Departamento Médico),
com totais gerais no topo: total de atletas cadastrados, quantos Liberados, quantos Suspensos,
quantos em Departamento Médico. O status é editável no cadastro do atleta.

## Regras de negócio / validação

- Um atleta só pode ser Titular ou Reserva em um jogo, não os dois.
- O capitão de um jogo precisa estar entre os convocados (titular ou reserva) daquele jogo.
- Convocação de Staff Operacional: em jogo em casa mostra todos por padrão; em jogo fora mostra só
  função "Segurança" por padrão, com opção de expandir para os demais.
- Credenciamento (Zona + Função) continua disponível para qualquer Staff Operacional ou Comissão
  Técnica/Diretoria convocado, independentemente da função cadastrada dele.
- Credenciamento: ao atingir `vagas_totais` de uma função, novas atribuições ficam bloqueadas até o
  uso da opção de vaga extra.
- Rooming list: um mesmo quarto respeita o tipo (single = 1 pessoa, duplo = até 2 pessoas).

### Home — Departamentos (Futebol Profissional / Futebol de Base)

A tela inicial passa a mostrar dois cartões de departamento: **Futebol Profissional** e **Futebol de
Base**. Clicar em "Futebol Profissional" leva para a central de módulos que já existe hoje (Atletas,
Comissão Técnica/Diretoria, Staff Operacional, Jogos, e agora Convocação). "Futebol de Base" fica
marcado como "em breve" — os cadastros dessa categoria (mesma estrutura do Profissional, mas com
dados próprios) ficam para um módulo futuro, com sua própria spec.

Aproveitando essa mudança, o layout geral da Home e da central de módulos é revisado: hierarquia
visual mais clara entre os cartões, espaçamento e ícones consistentes com a identidade visual do
Juventus (grená/dourado/prata) já usada no resto do sistema, e responsividade em celular.

## Pendências

- Mateus vai enviar o relatório de zonas/funções/vagas de **jogo fora**, para completar o catálogo de
  credenciamento (hoje semeado apenas com os dados de jogo em casa). Ajuste incremental, sem impacto
  no restante do desenho.

## Testes / verificação

- Convocar atletas, comissão técnica e staff operacional para um jogo em casa (staff completo
  disponível) e para um jogo fora (staff filtrado por padrão para função "Segurança", com expansão
  para os demais), marcar capitão, e gerar o presskit em PDF, conferindo todos os dados (incluindo
  número da camisa e faixa de capitão).
- Cadastrar uma nova função de Staff Operacional pelo próprio sistema (catálogo `staff_funcoes_catalogo`)
  e confirmar que ela aparece imediatamente como opção ao cadastrar/editar uma pessoa do staff.
- Gerar rooming list para um jogo fora, validando a sugestão automática de duplas a partir do
  histórico e a preferência single/duplo da comissão técnica.
- Gerar lista de passageiros de ônibus para um jogo em casa e para um jogo fora, com mais de um
  ônibus.
- Credenciar staff e comissão técnica por zona/função até esgotar as vagas de uma função, confirmar
  que trava, e testar a opção de vaga extra.
- Marcar status de um atleta como Suspenso e conferir que o painel de Atletas atualiza os totais.
- Testar responsividade de todas as novas telas em celular.
- Conferir que a Home mostra os dois cartões de departamento, que "Futebol Profissional" leva à
  central de módulos existente e que "Futebol de Base" aparece como "em breve".
