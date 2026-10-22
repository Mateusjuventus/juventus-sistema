# Competições: formato de partida por categoria + situação do Juventus

## Contexto

O Mateus trouxe dois Regulamentos Específicos da Competição (REC) da FPF: Campeonato Paulista
Sub-11 e Sub-12 - 2026, e Sub-13 e Sub-14 - 2026 (ambos já cadastrados no sistema em
`competicoes_base`, ver migration 0138). Os dois têm uma particularidade que o Profissional não
tem: a partida é dividida em **3 tempos** (não 2), com regra própria de escalação/substituição em
cada tempo, elenco mínimo obrigatório e minutos mínimos de participação por atleta.

Isso expôs um problema real e urgente: a Súmula (`sumulas_base`/`sumula_eventos_base`) está
travada em exatamente 2 tempos (`tempo in ('primeiro', 'segundo')`), então hoje **não dá pra
lançar um gol/cartão/substituição que aconteça no 3º tempo** de um jogo dessas categorias — é
isso que o Mateus quis dizer com "hoje não aparece".

Junto disso, surgiu uma segunda necessidade durante a conversa: um jeito de marcar que **o
Juventus foi eliminado** de uma competição, sem confundir com o status do campeonato inteiro
(que só termina quando sai o campeão, com ou sem o Juventus na disputa).

## Decisões confirmadas com o Mateus

1. As regras de formato de partida valem pras 4 categorias (Sub-11, Sub-12, Sub-13, Sub-14),
   cada uma com seus próprios números (17min/tempo no Sub-11/12, 20min/tempo no Sub-13/14) — não
   é uma regra fixa de uma categoria só.
2. O objetivo é **validar** essas informações, não só documentar — a Súmula deve avisar quando
   algo sair do combinado (elenco incompleto, atleta sem o mínimo de minutos, substituição fora
   da regra do tempo), mas **nunca bloquear o salvamento** (situações excepcionais como lesão ou
   expulsão fogem da regra, e quem preenche precisa conseguir registrar o que aconteceu de
   verdade).
3. Fica só no Futebol de Base (`competicoes_base`/`sumulas_base`) — o Profissional sempre joga no
   formato padrão (2 tempos de 45min), sem essas particularidades.
4. "Situação do Juventus" (Participando/Eliminado/Campeão/Vice) é um campo manual, independente
   do `status` geral do campeonato — não há automação a partir dos jogos por enquanto, porque as
   fases/grupos destas competições não foram cadastrados (decisão deliberada do Mateus, pra não
   ter que digitar o chaveamento completo dos ~80 clubes). Automatizar isso no futuro exigiria
   cadastrar ao menos o caminho do Juventus em cada fase e vincular os jogos — fica como
   possibilidade futura, não neste pacote.

## Mudanças de schema

### 1. `sumulas_base` / `sumula_eventos_base` — suportar 3º tempo (Base apenas)

- `sumulas_base`: nova coluna `duracao_terceiro_tempo integer` (nullable — só usada quando o jogo
  pertence a uma competição com `numero_tempos = 3`).
- `sumula_eventos_base.tempo`: o check constraint passa a aceitar `'primeiro'`, `'segundo'` ou
  `'terceiro'` (hoje só aceita os dois primeiros).
- A tela de Súmula do Futebol de Base passa a mostrar a seção do 3º tempo quando o jogo estiver
  vinculado (via `competicao_jogos_base`) a uma competição com `numero_tempos = 3`; caso
  contrário, continua mostrando só 2 tempos como hoje (nenhuma mudança pros jogos fora dessas
  competições).

### 2. `competicoes_base` — formato de partida (novas colunas, todas com default compatível com o
que já existe hoje, ou seja, nenhuma competição cadastrada antes desta mudança é afetada)

| Coluna | Tipo | Default | Observação |
|---|---|---|---|
| `numero_tempos` | integer | `2` | `check in (2, 3)` |
| `duracao_tempo_1_minutos` | integer | null | duração do 1º tempo |
| `duracao_tempo_2_minutos` | integer | null | duração do 2º tempo |
| `duracao_tempo_3_minutos` | integer | null | só preenchido quando `numero_tempos = 3` |
| `duracao_intervalo_minutos` | integer | null | duração de cada intervalo |
| `elenco_minimo_em_campo` | integer | null | quantidade mínima obrigatória de atletas na súmula (ex.: 18 no Sub-11/12, 22 no Sub-13/14) |
| `minutos_minimos_por_atleta` | integer | null | minutos mínimos que todo atleta inscrito na súmula deve jogar |
| `regra_tempo_1` | text | `'livre'` | `check in ('livre', 'somente_titulares', 'somente_reservas', 'livre_ilimitada')` |
| `regra_tempo_2` | text | `'livre'` | mesmo enum |
| `regra_tempo_3` | text | null | mesmo enum, só usado quando `numero_tempos = 3` |

Pro Sub-11/12: `numero_tempos=3`, tempos de 17min, intervalo de 5min, `elenco_minimo_em_campo=18`,
`minutos_minimos_por_atleta=17`, `regra_tempo_1='somente_titulares'`, `regra_tempo_2=
'somente_reservas'`, `regra_tempo_3='livre_ilimitada'` (Art. 19-20 do REC). Pro Sub-13/14: os
mesmos valores, trocando 17min por 20min e elenco mínimo 18 por 22 (Art. 19-20 do REC).

### 3. `competicoes` e `competicoes_base` — situação do Juventus na competição

| Coluna | Tipo | Default |
|---|---|---|
| `situacao_clube` | text | `'participando'` — `check in ('participando', 'eliminado', 'campeao', 'vice')` |
| `situacao_clube_fase` | text | null — texto livre (ex.: "Terceira Fase"), já que fases nem sempre estão cadastradas |
| `situacao_clube_data` | date | null |

Adicionado nos dois módulos (Profissional e Base) pra manter o padrão já usado em todo o resto do
módulo de Competições (toda mudança em `competicoes` tem a mesma em `competicoes_base`, e
vice-versa) — mesmo sem pedido explícito de Profissional aqui, a eliminação é algo que também
pode acontecer numa competição do Profissional (ex.: Copa Paulista). Se não for esse o caso, dá
pra remover essa parte antes de implementar.

## Validações na Súmula (aviso, nunca bloqueio)

Quando a súmula de um jogo (Base) estiver vinculada a uma competição com essas regras
preenchidas, a tela mostra avisos (não impede salvar) quando:

- Menos atletas na súmula do que `elenco_minimo_em_campo`.
- Um atleta inscrito na súmula tiver menos minutos em campo do que `minutos_minimos_por_atleta`
  (minutos calculados a partir dos eventos de substituição/tempo, igual ao que a tela já faz hoje
  pra mostrar quem jogou quanto).
- Uma substituição for lançada num tempo cuja regra (`regra_tempo_N`) não permite substituição
  livre (`somente_titulares`/`somente_reservas`), fora dos casos já tratados como exceção médica
  hoje na tela.

A escalação titular/reserva já existe (`convocacao_atletas_base.status`, vinculada à
convocação do jogo) — a validação de `somente_titulares`/`somente_reservas` usa esse campo, sem
precisar de dado novo.

## Fora de escopo deste pacote

- Cadastro de fases/grupos/adversários das 4 competições (decisão deliberada do Mateus).
- Cálculo automático de "situação do Juventus" a partir dos jogos/classificação — fica manual por
  enquanto.
- Qualquer mudança no Futebol Profissional (súmula, convocação, competições) — tudo deste pacote
  é Base, exceto as 3 colunas de "situação do Juventus" em `competicoes` (ver nota acima).

## Testes

- `lib/futebol/...` (função pura de validação, a definir no plano de implementação): testes
  unitários cobrindo elenco mínimo, minutos mínimos e regra de substituição por tempo, incluindo
  os casos de exceção médica.
- Súmula do Base: teste manual com um jogo cadastrado numa competição de 3 tempos, lançando evento
  no 3º tempo (hoje impossível) e conferindo que os avisos aparecem e não bloqueiam o salvamento.
