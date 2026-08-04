# Integração com a FPF (Federação Paulista de Futebol)

Item 4 da sequência combinada (Convocação → Súmula → Estatísticas do Atleta → **Integração FPF** →
Calendário → Layout dos módulos).

## Objetivo

Trazer dados oficiais da FPF sobre a participação do Juventus SAF na Copa Paulista Rivalo
(jogos, classificação, artilharia, elenco e súmulas) para dentro da aba **Jogos** do Futebol
Profissional já existente — sem criar um módulo novo — com atualização diária automática e um
botão de atualização manual, e com vínculo de jogos e de atletas sempre revisado por uma pessoa
antes de ser confirmado.

## Contexto técnico (o que foi descoberto)

O site `futebolpaulista.com.br` é uma página ASP.NET WebForms com uma camada AngularJS por cima,
mas **por trás dela existe uma API JSON real**, não documentada publicamente, que o próprio site
usa pra se popular. Ela foi mapeada por inspeção de rede (DevTools) e responde de forma consistente
em todos os endpoints testados:

```
GET https://futebolpaulista.com.br/Handlers/Competicoes/<Endpoint>.ashx?<params>
→ { Codigo: number, Sucesso: boolean, Mensagem: string, Retorno: <dados ou null>, Total: number }
```

IDs já confirmados pra Copa Paulista Rivalo / Juventus:

- `IdClube` do Juventus SAF: **287**
- `IdCampeonato` da Copa Paulista Rivalo (nome interno na API é só "Copa Paulista"): **100**
- `IdCategoria` "Profissional": **70**

Endpoints confirmados e o que cada um devolve:

| Endpoint | Parâmetros vistos | Retorno |
|---|---|---|
| `ListarTodosCampeonatosExercicio.ashx` | — | Lista de todos os campeonatos da FPF (`IdCampeonato`, `IdCategoria`, `Categoria`, `Campeonato`, `Ordem`) |
| `ListarRodadas.ashx` | `IdCampeonato` | Lista de rodadas da competição |
| `ListarCompeticoesClube.ashx` | `idCampeonato, Ano, Rodada, IdCategoria` | Clubes participantes (`IdClube`, `NomePopular`) |
| `ListarTabela.ashx` | `IdCampeonato, Ano, Rodada, IdClube, IdCategoria` | Jogos da rodada (ver campos abaixo) — `IdClube=0` traz todos os clubes, um `IdClube` específico filtra só os jogos dele |
| `ListarAtletas.ashx` | `IdClube` | Elenco do clube |
| `ReadAtleta.ashx` | `IdAtleta` | Ficha do atleta: nome completo, apelido, nascimento, nacionalidade, nº de registro de contrato, início/término de contrato, foto |
| `ListarCampExercicioAtleta.ashx` | `IdAtleta` | Competições/temporadas em que o atleta tem registro (popula o filtro da ficha dele) |
| `ListarJogosDisputados.ashx` | `IdAtleta, IdCampeonato, Ano` | Jogos disputados pelo atleta naquela competição/temporada, com contadores de gols/amarelos/vermelhos/substituições |

Cada jogo retornado por `ListarTabela.ashx` (dentro de `Retorno.listTabela[]`) traz, entre outros
campos: `IdJogo`, `Data`, `Horario`, `Rodada`, `Fase`, `Grupo`, `NomePopularMandante`,
`NomePopularVisitante`, `ResultadoMandante`, `ResultadoVisitante`, `Estadio`, `Municipio`,
`CanaisTransmissao`, `LinkSumula` (URL do PDF oficial da súmula), `LinkBoletimFinanceiro`,
`UltimaSincronizacaoData/Hora`.

O PDF de `LinkSumula` tem **texto real, selecionável** (não é imagem escaneada) — contém escalação
completa (titular/reserva, número da camisa, nome, número de registro), gols (autor + minuto +
tempo), cartões e substituições (com horário). Isso torna viável extrair esses dados
automaticamente, com revisão humana antes de salvar (igual ao vínculo de atleta).

Classificação e artilharia não foram capturadas endpoint-a-endpoint durante essa investigação, mas
seguem visualmente o mesmo padrão de telas (abas "CLASSIFICAÇÃO" e "ARTILHARIA" dentro de
Competições) — a expectativa razoável é que sigam o mesmo padrão de endpoint
`ListarClassificacao.ashx` / `ListarArtilharia.ashx` com o mesmo envelope de resposta. Isso será
confirmado durante a implementação, seguindo o mesmo processo de inspeção de rede.

**Risco assumido:** essa é uma API não-oficial, de terceiros, fora do nosso controle. Se a FPF
mudar o formato de resposta ou a estrutura de algum endpoint, a sincronização daquela parte
específica passa a falhar até ser ajustada — por isso todo o design abaixo trata falha de
sincronização como algo esperado (nunca perde dado já salvo, sempre mostra quando foi a última
atualização bem-sucedida, nunca derruba a aba Jogos como um todo).

## Escopo

Só **Futebol Profissional** por enquanto — a Copa Paulista Rivalo é a competição "Profissional"
(categoria 70) do Juventus. O Futebol de Base tem competições próprias na FPF (SUB-15, SUB-17,
SUB-20 etc., com outros `IdCampeonato`), fora de escopo por agora — pode ser feito depois seguindo
exatamente o mesmo padrão, é só configurar os IDs certos.

## Configuração

Em vez de fixar `IdCampeonato`/`IdCategoria`/`Ano` no código, uma tela simples de configuração
("Configurar integração FPF", acessível pela lista de Jogos) guarda:

- Campeonato (`IdCampeonato`, com nome de exibição — ex: "Copa Paulista Rivalo")
- Categoria (`IdCategoria`)
- Ano/temporada
- Clube (`IdClube`) — fixo em 287 (Juventus SAF), mas guardado como configuração e não código,
  pra não precisar mexer em nada se a FPF trocar o ID um dia

Isso deixa o time do clube livre pra trocar de temporada ou (futuramente) apontar pra outra
competição sozinho, sem precisar pedir alteração de código.

## Modelo de dados

Em vez de espelhar os dados da FPF numa tabela paralela, a ideia é **estender as tabelas que já
existem** com as referências mínimas necessárias — o dado "oficial" continua sendo o nosso próprio
registro (`jogos`, `atletas`), a FPF só alimenta e atualiza esses registros.

```sql
-- em jogos (só Futebol Profissional)
alter table public.jogos add column fpf_id_jogo integer unique;
alter table public.jogos add column fpf_link_sumula text;
alter table public.jogos add column fpf_sincronizado_em timestamptz;

-- em atletas (só Futebol Profissional)
alter table public.atletas add column fpf_id_atleta integer unique;

-- atletas da FPF explicitamente marcados como "não é ninguém daqui" na tela de vínculo,
-- pra não ficar sugerindo a mesma pessoa de novo
create table public.fpf_atletas_ignorados (
  fpf_id_atleta integer primary key,
  nome text not null,
  ignorado_por uuid references auth.users(id),
  ignorado_em timestamptz not null default now()
);

-- mesma ideia, só que pro lado de jogos: um jogo da FPF marcado como "ignorar" na revisão de
-- pendentes nunca mais aparece nessa lista
create table public.fpf_jogos_ignorados (
  fpf_id_jogo integer primary key,
  descricao text not null,
  ignorado_por uuid references auth.users(id),
  ignorado_em timestamptz not null default now()
);

-- configuração (linha única)
create table public.fpf_config (
  id boolean primary key default true check (id), -- garante uma linha só
  id_campeonato integer not null,
  id_categoria integer not null,
  id_clube integer not null,
  nome_exibicao text not null,
  ano integer not null,
  updated_at timestamptz not null default now()
);

-- histórico de execuções da sincronização (manual ou automática)
create table public.fpf_sync_log (
  id uuid primary key default gen_random_uuid(),
  executado_em timestamptz not null default now(),
  origem text not null check (origem in ('manual', 'automatica')),
  sucesso boolean not null,
  jogos_novos integer not null default 0,
  jogos_atualizados integer not null default 0,
  mensagem_erro text
);
```

Classificação e artilharia **não são persistidas** — são buscadas ao vivo na FPF toda vez que a
aba correspondente é aberta (dado de leitura simples, sem estado de vínculo pra guardar, sem
necessidade de cache).

## Fluxo: jogos

Na lista de Jogos, um botão **"Atualizar da FPF"** dispara a sincronização (mesma função usada
pelo agendamento diário, ver abaixo). Ela busca todos os jogos da competição configurada (por
rodada, usando `IdClube` do Juventus pra já vir filtrado) e:

1. Pra jogo da FPF cujo `IdJogo` já está vinculado a um jogo nosso (`jogos.fpf_id_jogo`): atualiza
   direto placar, data/horário e link da súmula, sem pedir confirmação — já é um vínculo
   estabelecido.
2. Pra jogo da FPF ainda sem vínculo: entra numa lista de revisão **"Jogos da FPF pendentes"**
   (acessível pela lista de Jogos), cada um com as opções:
   - **Criar jogo** — cria um jogo nosso já preenchido (adversário, data, horário, estádio,
     mandante/visitante, competição) e vincula o `fpf_id_jogo`
   - **Vincular a um jogo existente** — pra quando o jogo já foi cadastrado manualmente antes da
     sincronização existir
   - **Ignorar** — nunca aparece na lista de novo

Dentro da tela de um jogo (ao lado de Convocação/Súmula/Programação), uma nova aba **"FPF"**
mostra, quando o jogo está vinculado: os dados oficiais (placar, transmissão, estádio), o link
pro PDF oficial da súmula, e a data/hora da última sincronização. Se o jogo não está vinculado,
a aba mostra uma mensagem simples com atalho pra tela de vínculo.

## Fluxo: elenco (vínculo de atletas)

Tela **"Elenco na FPF"**, acessível pela lista de Jogos, lista o elenco do Juventus segundo a FPF
(`ListarAtletas`, com detalhe de `ReadAtleta` pra pegar o "número de registro"). Já existe no
cadastro de atleta um campo `numero_fpf` (visível hoje na ficha do atleta, em "Número FPF") — é
exatamente esse tipo de número de registro que a FPF expõe. Por isso a sugestão de vínculo usa
duas estratégias, nessa ordem:

- Se o `numero_fpf` de algum atleta nosso bate exatamente com o número de registro retornado pela
  FPF pra aquele atleta: sugestão automática de alta confiança (mesmo assim ainda passa pela
  confirmação manual de um clique — nenhum vínculo é gravado sem confirmação).
- Senão, sugere o atleta nosso com nome mais parecido (comparação de texto simples, sem exigir
  acerto perfeito) — um clique em **"Confirmar"** grava o vínculo.
- Se já vinculado (`atletas.fpf_id_atleta`): mostra o nome do nosso atleta correspondente, sem
  sugestão nenhuma.
- Se a sugestão não bate, dá pra buscar manualmente entre os atletas cadastrados.
- Um atleta da FPF que não corresponde a ninguém (ex: já saiu do clube) pode ser marcado como
  **"Ignorar"** (grava em `fpf_atletas_ignorados`) pra não ficar aparecendo.

Esse vínculo (`atletas.fpf_id_atleta`) é o que permite casar nomes extraídos da súmula em PDF com
atletas cadastrados no passo seguinte.

## Fluxo: importar súmula da FPF

Dentro da nossa aba Súmula (já existente) de um jogo vinculado à FPF com PDF de súmula disponível,
aparece um botão **"Importar da FPF"**. Ao clicar:

1. O servidor busca o PDF (`jogos.fpf_link_sumula`) e extrai o texto.
2. Identifica escalação (titular/reserva), gols (autor, minuto, tempo), cartões e substituições
   (com horário), casando cada jogador citado com o `atletas.fpf_id_atleta` correspondente.
3. Em vez de salvar direto, **pré-preenche os formulários de evento da nossa Súmula** (os mesmos
   que já existem) como uma revisão — jogador da FPF sem vínculo confirmado aparece destacado
   como "não vinculado ainda", pulado da pré-importação até ser resolvido na tela de Elenco.
4. A pessoa revisa, ajusta o que precisar e salva pelos mesmos formulários e ações que já existem
   hoje — nada é gravado sem essa revisão.

A extração de texto do PDF usa uma biblioteca de leitura de PDF (ex.: `pdf-parse`) mais lógica de
interpretação própria pro formato específico da FPF — o formato exato (espaçamento, ordem das
linhas) será conferido com uma súmula real durante a implementação, já que a investigação feita
aqui só confirmou que o conteúdo existe e é extraível, não o layout exato linha a linha.

## Classificação e artilharia

Numa página separada, **"Copa Paulista Rivalo" (dados da competição)**, acessível por um link na
lista de Jogos — diferente da aba "FPF" que existe dentro de cada jogo individual, essa é uma
página só, a nível de competição inteira, com duas sub-seções somente leitura:

- **Classificação**: tabela de posição, pontos, jogos, vitórias/empates/derrotas, saldo de gols
  etc., como aparece no próprio site da FPF, buscada ao vivo a cada acesso.
- **Artilharia**: lista de artilheiros da competição, buscada ao vivo a cada acesso.

Sem vínculo com atleta nem qualquer ação de edição — é só um espelho de leitura do que a FPF
publica.

## Atualização automática diária + botão manual

A sincronização (passo "Fluxo: jogos" acima) é uma função só, reaproveitada em dois gatilhos:

- **Manual**: botão "Atualizar da FPF" na lista de Jogos, chama a função direto via Server Action.
- **Automática diária**: uma rota própria da aplicação (`/api/fpf/sincronizar`), protegida por um
  token secreto (variável de ambiente), chama a mesma função. Como a hospedagem final do sistema
  ainda não está decidida, essa rota é feita de forma que funciona com qualquer agendador externo
  — o padrão pronto pra usar, se o sistema for hospedado na Vercel (o mais comum pra esse tipo de
  projeto Next.js), é um Vercel Cron Job configurado pra chamar essa rota uma vez por dia. Se a
  hospedagem for outra, só o agendamento muda — a lógica de sincronização em si não.

Cada execução grava uma linha em `fpf_sync_log` (sucesso/erro, quantos jogos novos/atualizados,
mensagem de erro se houver). A lista de Jogos mostra a data/hora da última sincronização
bem-sucedida perto do botão "Atualizar da FPF", e um aviso visível se a última tentativa falhou
(sem nunca apagar ou travar os dados já salvos).

## Tratamento de erro e confiabilidade

- Toda chamada à FPF tem timeout curto e tratamento de erro — se a FPF estiver fora do ar ou
  responder algo inesperado, a sincronização daquele trecho falha isoladamente (ex: classificação
  falha mas jogos continuam funcionando), fica registrado em `fpf_sync_log` quando for a
  sincronização geral, e a interface mostra uma mensagem clara em vez de quebrar a tela.
- Nenhum dado já salvo (jogo, súmula, vínculo de atleta) é apagado ou sobrescrito por uma
  sincronização com erro — só é atualizado quando a FPF responde com sucesso.
- Requisições à FPF são feitas de forma sequencial e espaçada (não em paralelo agressivo), por
  respeito ao servidor de terceiros e pra reduzir risco de bloqueio.

## Fora de escopo

- Futebol de Base (fica pra quando/se for pedido, mesma arquitetura, outros IDs de competição).
- Qualquer escrita na FPF — a integração é só leitura.
- Retificação de súmula (`LinkRetificacaoSumula`) — tratado como informação futura, não faz parte
  dessa entrega.
- Boletim financeiro (`LinkBoletimFinanceiro`) — não é o foco pedido, não entra nessa entrega.
- Vídeo/transmissão (`UrlVideo`, `CanaisTransmissao`) — os campos vêm junto no jogo sincronizado
  mas não há nenhuma tela dedicada pra eles nessa entrega.
