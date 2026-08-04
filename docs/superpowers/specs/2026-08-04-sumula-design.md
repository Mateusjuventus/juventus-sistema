# Súmula (eventos do jogo)

Status: Aprovado

## Objetivo

Segunda etapa da sequência combinada com o usuário (Convocação → Súmula → Estatísticas do Atleta →
Integração FPF → Calendário → Layout dos módulos). Dá ao Jogo uma aba "Súmula" onde se registra o
placar, a duração de cada tempo e os eventos da partida (gol, cartão amarelo, cartão vermelho,
substituição) — tudo numa aba só. Esses eventos são a base de dados que o próximo projeto
(Estatísticas do Atleta) vai consumir pra montar o gráfico de participações, contadores de
gols/cartões e minutagem; este spec cobre só a captura e o armazenamento dos eventos, não o
cálculo de minutagem em si.

Espelhado em Futebol Profissional (`/jogos/[id]/sumula`) e Futebol de Base
(`/base/jogos/[id]/sumula`), como todo o resto do sistema.

## Navegação

Nova aba "Súmula" em `JogoTabs`/`JogoTabsBase`, entre "Convocação" e "Programação" (ordem
cronológica: primeiro convoca, depois registra o jogo em si).

## Dados do jogo (topo da aba)

Um mini-formulário com:

- Placar (Juventus × Adversário) — dois campos numéricos. Ao salvar, escreve direto em
  `jogos.gols_pro`/`gols_contra` (mesmos campos já usados na aba "Dados do jogo" — uma única fonte
  de verdade, editável nos dois lugares).
- Duração de cada tempo em minutos (1º Tempo, 2º Tempo), padrão 45 cada, editável pra refletir
  acréscimos (ex.: 47). Guardado em `sumulas.duracao_primeiro_tempo`/`duracao_segundo_tempo`.

Botão "Salvar" próprio, separado da lista de eventos abaixo (que salva por item, não em lote — ver
seção seguinte).

## Escalação (referência)

Mostra os titulares e reservas já definidos na Convocação (`convocacao_atletas`/
`convocacao_atletas_base`) — não redefine quem joga aqui, só serve de referência visual e de fonte
pros seletores de atleta ao lançar um evento (quem pode ter feito gol/recebido cartão/saído, quem
pode ter entrado numa substituição). Se o jogo ainda não tem convocação salva, a aba mostra um
aviso pedindo pra preencher a Convocação primeiro.

## Eventos

Divididos visualmente em "Primeiro Tempo" e "Segundo Tempo". Cada evento tem:

- Tipo: Gol, Cartão Amarelo, Cartão Vermelho, ou Substituição.
- Minuto (número, dentro do tempo escolhido — pode passar de 45 pra representar acréscimo).
- Atleta: pra Gol/Cartão Amarelo/Cartão Vermelho, um select com os atletas convocados (titulares e
  reservas). Pra Substituição, dois selects — "Saiu" (qualquer convocado) e "Entrou" (reserva
  convocado) — sem validação rígida de "quem está em campo agora" nesta etapa (fica mais simples;
  a Súmula registra o que aconteceu, não impõe uma máquina de estados de escalação ao vivo).

Sem campo de assistência no evento de Gol (decidido: fora de escopo).

Cada evento adicionado salva imediatamente (server action própria por evento, com `revalidatePath`)
e aparece na lista na hora, com um X pra remover — sem um botão "Salvar" geral pra lista de
eventos. Isso é intencional: a Súmula precisa funcionar tanto lançada ao vivo no celular durante o
jogo quanto preenchida com calma depois, e salvar por evento evita perder o que já foi lançado se a
aba fechar no meio do jogo (mesmo padrão já usado nos itens de Solicitação — cada item tem sua
própria ação de criar/excluir, sem lote).

## Banco de dados

Duas tabelas novas por departamento:

`sumulas` / `sumulas_base`: uma linha por jogo (`jogo_id` único).
```
id uuid pk
jogo_id uuid references jogos(id) unique
duracao_primeiro_tempo integer not null default 45
duracao_segundo_tempo integer not null default 45
created_by, created_at, updated_at
```

`sumula_eventos` / `sumula_eventos_base`: uma linha por evento, ligada à súmula do jogo.
```
id uuid pk
sumula_id uuid references sumulas(id) on delete cascade
tipo text check (tipo in ('gol', 'cartao_amarelo', 'cartao_vermelho', 'substituicao'))
tempo text check (tempo in ('primeiro', 'segundo'))
minuto integer not null
atleta_id uuid references atletas(id) — quem fez o gol / recebeu o cartão / saiu (substituição)
atleta_entrou_id uuid references atletas(id), nullable — só usado quando tipo = 'substituicao'
ordem integer not null — ordem de lançamento, pra desempate visual quando dois eventos têm o
  mesmo tempo/minuto
created_by, created_at
```

Reaproveita o padrão de colunas genéricas já usado em Solicitações (`atleta_id`/`atleta_entrou_id`
cobrem os 4 tipos de evento sem precisar de uma tabela por tipo).

## Fora de escopo

- Assistência no gol (decidido: não registrar).
- Dados de GPS (já descartado antes).
- Cálculo de minutagem, participações e outros agregados — fica pro spec de Estatísticas do
  Atleta, que consome `sumula_eventos`.
- Validação de "quem está em campo agora" ao lançar substituição/cartão (registra o que
  aconteceu, sem impor uma máquina de estados).
- Travar/finalizar a súmula depois do jogo — fica sempre editável, como o resto do sistema.
