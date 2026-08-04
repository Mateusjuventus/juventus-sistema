# Estatísticas do Atleta (Documentação + Dados de Jogo)

Status: Aprovado

## Objetivo

Terceiro item da sequência combinada com o usuário (Convocação → Súmula → Estatísticas do Atleta
→ Integração FPF → Calendário → Layout dos módulos). O perfil do atleta ganha abas: além dos dados
já cadastrados (renomeado internamente pra "Dados Pessoais"), duas novas — "Documentação" (upload
de arquivos) e "Dados de Jogo" (participação, gols, cartões e minutagem, calculados a partir da
Súmula e da Convocação). "Condição Física" e GPS ficam fora de escopo (já descartados pelo usuário
em turno anterior).

Espelhado em Futebol Profissional (`/atletas/[id]/ver`) e Futebol de Base
(`/base/atletas/[categoria]/[id]/ver`), como todo o resto do sistema.

## Navegação

A tela de perfil (hoje uma página só, com as seções "Dados pessoais", "Dados esportivos" e
"Naturalidade e endereço" uma embaixo da outra) ganha três abas:

- **Dados Pessoais** — o conteúdo que já existe hoje, sem mudança nenhuma, só movido pra dentro de
  uma aba.
- **Documentação** — nova.
- **Dados de Jogo** — nova.

## Aba Documentação

Lista de documentos anexados ao atleta. Cada documento tem só um nome (texto livre, ex: "RG
frente", "Atestado médico junho/2026") e o arquivo em si (qualquer tipo — PDF, imagem etc., sem
categoria fixa nem data de validade, por decisão do usuário: "só nome do arquivo"). Ações
disponíveis: adicionar (nome + arquivo) e excluir. Sem edição de nome depois de enviado — pra
corrigir, exclui e reenvia.

Arquivos guardados num bucket novo e privado no Storage (`atleta-documentos`), separado do bucket
`entity-photos` já existente (que é só pra fotos de perfil/logo, com upsert por nome fixo — aqui
cada documento é um arquivo novo e independente, não substitui o anterior). Acessados sempre via
signed URL temporária (1h), igual ao padrão já usado pra fotos.

## Aba Dados de Jogo

### Filtro de período

Dois campos no topo, combináveis e opcionais, aplicados via query string (mesmo padrão de filtro
já usado em `/jogos`): intervalo de datas (de/até, comparado com `jogos.data_jogo`) e um dropdown
de competição (lista as competições distintas já usadas nos jogos do departamento — campo livre em
`jogos.competicao`, sem uma lista fixa cadastrada). Sem filtro nenhum, mostra o histórico inteiro.

### Universo considerado

Só entram na conta os jogos do período filtrado que **já têm uma Convocação salva** (existe uma
linha em `convocacoes`/`convocacoes_base` pra aquele `jogo_id`). Um jogo futuro, ainda sem
convocação definida, não conta como "não convocado" pro atleta — a convocação daquele jogo
simplesmente ainda não aconteceu, então ele fica de fora da conta inteira (gráfico, contadores e
minutagem).

### Gráfico de participação

Gráfico de rosca (SVG simples, sem biblioteca nova) com 3 fatias, contando jogos do universo acima:

- **Titular** — o atleta está em `convocacao_atletas` com `status = 'titular'` naquele jogo.
- **Banco** — está com `status = 'reserva'`. Inclui tanto quem ficou no banco o jogo inteiro quanto
  quem entrou como substituto — a entrada em campo não muda essa categoria (decisão do usuário: o
  status vem direto da Convocação; quantos minutos o atleta efetivamente jogou aparece separado, no
  bloco de minutagem).
- **Não Convocado** — o jogo tem convocação salva, mas o atleta não aparece em
  `convocacao_atletas` pra ele.

Cada fatia mostra a contagem de jogos ao lado (ex.: "Titular — 8 jogos").

### Contadores e minutagem

Abaixo do gráfico, quatro contadores simples somando os jogos do universo acima:

- **Gols** — nº de eventos `sumula_eventos` com `tipo = 'gol'` e `atleta_id` = este atleta.
- **Assistências** — nº de eventos `tipo = 'gol'` com `atleta_assistencia_id` = este atleta.
- **Cartões Amarelos** — nº de eventos `tipo = 'cartao_amarelo'` com `atleta_id` = este atleta.
- **Cartões Vermelhos** — nº de eventos `tipo = 'cartao_vermelho'` com `atleta_id` = este atleta.

E a minutagem, calculada jogo a jogo (ver algoritmo abaixo) e depois somada:

- **Minutos totais** no período.
- **Jogos com mais de 60 minutos** jogados.
- **Jogos com mais de 90 minutos** jogados.

### Algoritmo de minutagem (por jogo)

Convertendo sempre pro "relógio" do jogo inteiro (1º tempo vai de 0 até
`sumulas.duracao_primeiro_tempo`; 2º tempo continua a partir daí, até
`duracao_primeiro_tempo + duracao_segundo_tempo`):

1. **Não convocado**: 0 minutos, jogo não entra nem no total nem nos contadores de >60/>90min.
2. **Titular**: começa em 0. Se houver um evento `substituicao` com `atleta_id` = este atleta
   (saiu) ou um evento `cartao_vermelho` com `atleta_id` = este atleta, termina no minuto desse
   evento (o que ocorrer primeiro, pela ordem cronológica tempo+minuto+ordem). Sem nenhum desses
   dois eventos, termina no fim do jogo (`duracao_primeiro_tempo + duracao_segundo_tempo`).
3. **Reserva (banco)**: se não houver evento `substituicao` com `atleta_entrou_id` = este atleta,
   são 0 minutos (ficou no banco). Se houver, começa no minuto desse evento; termina igual ao
   titular (por substituição saindo depois, cartão vermelho, ou fim de jogo).
4. Se o jogo não tem súmula salva ainda (só convocação), a minutagem desse jogo é tratada como 0 e
   não entra nos contadores de >60/>90min — mas o jogo continua contando normalmente no gráfico de
   participação (que só depende da Convocação, não da Súmula).

### Exportar em PDF

Botão "Gerar PDF" dentro da aba Dados de Jogo, ao lado do filtro de período, com um checkbox
"Incluir dados pessoais" do lado:

- O PDF sempre traz o cabeçalho (foto, nome, posição, número da camisa) e o conteúdo da aba Dados
  de Jogo — gráfico/contagem de participação, contadores de gols/assistências/cartões e minutagem
  — usando exatamente o período (datas/competição) que estiver selecionado no filtro da tela no
  momento do clique.
- Com o checkbox marcado, o PDF inclui também um bloco com os Dados Pessoais (o mesmo conteúdo da
  aba "Dados Pessoais": RG, CPF, contrato, naturalidade etc.). Desmarcado, o PDF sai só com o
  desempenho.
- Não inclui a lista de documentos da aba Documentação (são arquivos à parte, não dados pra
  imprimir num relatório).
- Segue o mesmo padrão visual dos outros PDFs do sistema (cabeçalho do clube, rodapé com "Gerado
  em", ver `lib/pdf/`).

## Banco de dados

Uma tabela nova por departamento, só pra Documentação (estatísticas não precisam de tabela — são
sempre calculadas na hora a partir de `convocacao_atletas` e `sumula_eventos`, sem cache, porque
Convocação e Súmula continuam sempre editáveis depois do jogo):

```
atleta_documentos / atleta_documentos_base
id uuid pk
atleta_id uuid references atletas(id) on delete cascade
nome text not null
arquivo_path text not null
created_by, created_at
```

Bucket novo no Storage: `atleta-documentos`, privado, mesmo padrão de policies do `entity-photos`
(select/insert/update/delete só pra `authenticated`).

## Fora de escopo

- Categoria fixa e data de validade do documento — só nome + arquivo.
- Edição do nome de um documento já enviado (exclui e reenvia).
- Condição Física e dados de GPS (já descartados).
- Qualquer tabela de cache/estatística pré-calculada — tudo é computado sob demanda.
- Comparação entre atletas ou rankings do elenco — este spec é só a visão individual no perfil do
  atleta.
