# Módulo de Competições — design (10/08/2026)

Spec ditada pelo Mateus (mensagem "AJUSTES NA ESTRUTURA DO MÓDULO DE COMPETIÇÕES"), visual
aprovado em mockup HTML antes da implementação. Pontos inegociáveis, na ordem da mensagem:

1. **Cadastro**: a competição tem UM campo de nome só (sem "nome oficial" e sem "tipo de
   competição" — nada de Liga/Copa/Torneio). Campos: nome, temporada, federação/organização,
   categoria, data de início, data de término, status, regulamento (PDF), observações.
2. **Temporada** é entidade própria: TEMPORADA → COMPETIÇÃO → FASES → GRUPOS → JOGOS. Uma
   temporada tem N competições; uma competição pertence a UMA temporada.
3. **Fases e grupos**: estrutura relacionada (`competicao_fases` → `competicao_grupos` →
   `competicao_grupo_equipes`) — nunca um campo "grupo" solto, porque a mesma competição tem
   grupos diferentes em fases diferentes (Copa Paulista: Grupos 1–4 na Primeira Fase, 5–8 no
   Play In, chaves nas finais).
4. **Jogos JÁ EXISTEM**: `competicao_jogos` só VINCULA um jogo de `public.jogos` a
   competição/fase/grupo (`jogo_id` unique — um jogo pertence a no máximo uma competição).
   Nenhuma tela de Competições cadastra jogo.
5. **Cartões** existem SÓ como evento de súmula (`sumula_eventos`). A cadeia é:
   SÚMULA → EVENTO → CARTÕES → MOTOR DE REGRAS → SUSPENSÃO → CONDIÇÃO DE JOGO → ALERTA.
   Nada disso tem cadastro manual nem cache: tudo é derivado na leitura
   (`lib/futebol/competicao-disciplina.ts`, puro e testado), mesmo padrão "sem cache" das
   estatísticas do atleta.
6. **Motor de suspensões**: 3º amarelo (configurável por competição: `regra_*` em `competicoes`)
   → suspensão automática de 1 jogo, cumprida no(s) próximo(s) jogo(s) vinculado(s). Vermelho
   direto e expulsão por 2 amarelos idem (2 amarelos no mesmo jogo não acumulam pro ciclo).
   Suspensões do mesmo atleta cumprem em SEQUÊNCIA. Só a suspensão MANUAL (decisão disciplinar
   externa) tem tabela (`competicao_suspensoes_manuais`).
7. **Condição de jogo** derivada por jogo: inscrição (`competicao_inscricoes`, lista A/B),
   suspensões que pegam o jogo, pendurado. Convocado sem inscrição aparece como IRREGULAR.
8. **Alertas** são consequência dos dados (suspensão gerada, pendurado, suspensos no próximo
   jogo, prazos) — `lib/futebol/competicao-avisos.ts` devolve `ItemMural`, e os itens entram no
   Mural da Home (`/profissional`) e na tela `/avisos`, além da aba Alertas da competição.
   Pedido literal do Mateus: "quero que os avisos apareçam no mural também na tela principal".
9. **Tela de Cartões**: só consulta (sem "+ Registrar Cartão"), filtros por fase/grupo/atleta/
   tipo — filtro de fase/grupo recalcula o motor no subconjunto de jogos.
10. **Tela de Suspensões**: controle (atleta, tipo, motivo, origem, jogos, cumpridos, restantes,
    próximo jogo, status) + registro manual só pra decisão externa.
11. **Arquitetura**: nada duplicado — atletas/jogos/súmulas/eventos são os que já existem; a
    competição é a camada de regras aplicada sobre eles.

## Adições combinadas depois da spec

- **PDF em todas as telas de consulta** (pedido na revisão do mockup): resumo, classificação,
  cartões (com filtros), suspensões, condição de jogo, inscritos — `lib/pdf/competicao-documents.tsx`
  + rotas `pdf/route.tsx`, mesmo visual dos demais PDFs do sistema.
- **Classificação e possíveis confrontos** (pedido durante a implementação): tabela por grupo em
  `lib/futebol/competicao-classificacao.ts` (pura, testada). Jogos do Juventus entram sozinhos
  (placar de `jogos.gols_pro/contra`); confrontos entre os outros clubes são lançados em
  `competicao_grupo_resultados` (registro leve). Equipe de grupo de fase futura pode ser uma
  "vaga projetada" (`origem_grupo_id` + `origem_posicao`, ex.: "1º do Grupo 3"), resolvida pela
  classificação atual pra mostrar o possível confronto de hoje.

## Decisões de implementação

- Módulo novo `competicoes` em `lib/auth/modulos.ts` (rota `/competicoes`), liberado pra todos os
  usuários existentes na migração (mesmo espírito de 0024). O módulo "jogos" voltou a se chamar
  só "Jogos".
- Só Futebol Profissional neste primeiro passo (as tabelas de Base ficam pra uma iteração
  futura, se o Mateus pedir).
- `carregarCompeticao` (`lib/futebol/competicao-query.ts`) é a única porta de entrada de dados —
  todas as abas e PDFs derivam das mesmas fontes.
- Documentos/regulamento num bucket privado novo `competicao-documentos` (padrão de 0054).

## Atualização (10/08, regulamento da Copa Paulista — Art. 60)

O Mateus colou o Art. 60 do Regulamento Específico da Copa Paulista e pediu três coisas:

1. **Regra registrada na competição**: campo `competicoes.regra_observacoes` (texto livre) pro
   artigo do regulamento ficar junto da configuração — aparece na Visão geral e é editável no
   formulário. O motor continua usando as colunas numéricas `regra_*`.
2. **Zerar amarelos por fase** (caput: "Finalizada a primeira fase [...] os cartões amarelos serão
   zerados, desde que não seja o terceiro da série"): flag `competicao_fases.zerar_cartoes_ao_encerrar`,
   marcada fase a fase na aba Fases e Grupos. No motor, a linha do tempo dos jogos vinculados é
   dividida em "épocas": cruzou do último jogo de uma fase com a flag pro primeiro de outra fase,
   o ACÚMULO de amarelos zera pra todo mundo — suspensão já gerada dentro da fase (3º amarelo no
   último jogo, p.ex.) continua valendo e cumpre nos jogos seguintes. Testado em
   competicao-disciplina.test.ts.
   As combinações do §1º o motor já cumpria e agora têm teste com o nome do artigo:
   (a) amarelo + vermelho direto na mesma partida → o amarelo permanece na série;
   (b) 3º amarelo + vermelho direto na mesma partida → 2 impedimentos, cumpridos em sequência;
   (c) 2º amarelo com vermelho consequente → os amarelos não contam pra série.
   §§ 2º–4º (partida suspensa/adiada/W.O.) não são modelados — casos raros, ajustáveis com
   suspensão manual ou desvinculando o jogo.
3. **Área de súmulas dos jogos dos grupos**: aba nova "Súmulas dos Grupos"
   (`/competicoes/[id]/resultados`) — por grupo, lista os jogos do Juventus (referência, entram
   sozinhos) e os resultados entre os outros clubes, com rodada, data e o PDF da súmula anexado
   (`competicao_grupo_resultados.rodada`/`.sumula_path`, bucket competicao-documentos). O
   lançamento saiu da aba Classificação (que agora só mostra tabelas/confrontos e linka pra cá).
   Mandante/visitante viram selects com as equipes cadastradas no grupo (menos o Juventus), pra
   evitar erro de grafia que quebraria a contagem de pontos.

Migração: 0064_competicao_regras_fase_sumulas.sql.
