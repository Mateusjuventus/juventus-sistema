# Captação separada de Atletas, Aprovações e Ficha de Cadastro — 19/08/2026 (ajuste)

## O ajuste

Depois de entregue a primeira versão da Captação/Avaliação (ver
`2026-08-19-captacao-base-design.md`), o Mateus corrigiu um mal-entendido meu: os dados extras do
cadastro (alojamento, ajuda de custo, empresário, pais, endereço com CEP, escola) e o link público
que os acompanha eram pra ficar em **Atletas** — os que já são do clube — não na Captação. As duas
coisas nunca deveriam ter sido misturadas: "não tem relação nenhuma com meu atletas já do clube",
nas palavras dele.

O pedido corrigido, junto com o desenho da fila de aprovação da Captação:

> O primeiro ajuste é na área de cadastros dos meus atletas (mantém o link para os pais fazerem o
> cadastro e incluir os dados solicitados). Na captação... não tem relação nenhuma com meu atletas já
> do clube. Fazer um link tipo de inscrição, e ficar numa aba de aprovações — conforme o atleta que
> fará avaliação faz o cadastro vem para esta aba, eu aprovo a avaliação dele e ele passa a ficar na
> parte de atletas em avaliação, aí colocarei a data de início dele.

## Como ficou agora

### Captação — banco totalmente isolado

Não cria mais nada em `atletas_base`. Ganhou um status novo, `inscricao`, que fica ANTES de "Em
avaliação": é onde caem as inscrições do link público `/inscricao-captacao-base`. A aba
`/base/captacao/aprovacoes` lista essa fila; aprovar pede a **Data de Início** (só faz sentido pedir
nesse momento — antes disso a pessoa só se inscreveu) e move pra `avaliacao`. Dali em diante segue
pros mesmos 4 status de sempre (Aprovado/Dispensado/Não compareceu inclusos) — "Aprovado" virou só
um status administrativo da Captação, sem efeito nenhum em Atletas. `atleta_gerado_id` (da versão
anterior) fica na tabela só como resquício histórico; nenhuma tela lê ou grava mais essa coluna.

### Ficha de Cadastro — a Atletas, não à Captação

O link público `/cadastro-atleta-base` (agora chamado "Ficha de Cadastro" na tela) passa a gravar
DIRETO em `atletas_base`, com `status: "liberado"` e sem passar pela Captação. Coleta o cadastro
"quase completo" pedido: dados pessoais, RG/CPF (opcionais — a família pode não ter em mãos),
dados esportivos essenciais (categoria, posição, categoria de posição), alojamento, escola,
responsáveis, empresário e endereço com CEP. Fica de fora o que é decisão administrativa do clube
(número de camisa/CBF/FPF, tipo de contrato, datas de contrato) — isso o Mateus completa depois pela
tela interna. O toggle (`configuracoes_cadastro_atleta_base`, já existia) mudou de tela: antes vivia
em Captação, agora vive em `/base/atletas`, onde faz sentido.

### Dois links públicos, dois toggles, sem relação um com o outro

| Link | Alvo | Toggle | Onde liga/desliga |
|---|---|---|---|
| `/inscricao-captacao-base` | `captacao_base` (status `inscricao`) | `configuracoes_inscricao_captacao_base` | `/base/captacao` |
| `/cadastro-atleta-base` (Ficha de Cadastro) | `atletas_base` direto | `configuracoes_cadastro_atleta_base` | `/base/atletas` |

## Migração

`0077_captacao_atletas_separacao.sql`: troca o `check` de status de `captacao_base` pra incluir
`inscricao`; `data_inicio` vira opcional (só é preenchida na aprovação da inscrição); cria
`configuracoes_inscricao_captacao_base` (singleton, mesmo formato dos outros toggles); e adiciona o
GRANT que faltava pro service_role em `atletas_base` (a Ficha de Cadastro pública precisa gravar lá
sem sessão) — nasce junto na mesma migração, não como correção depois (mesma lição de sempre:
service_role ignora RLS mas não ignora GRANT).

## Por que "Aprovações" é status, não uma tabela nova

Cogitei uma tabela separada só pra fila de aprovação, mas um status a mais em `captacao_base`
resolve com bem menos superfície: a mesma linha carrega o histórico completo (de "inscricao" até o
resultado final), a lista principal (`/base/captacao`) já mostra tudo sem precisar cruzar tabelas, e
o PDF/dashboard não precisam de nenhum tratamento especial — só ignoram quem ainda está em
"inscricao" nas contagens do funil (ver `contarPorStatus`/`contarInscricoesPendentes` em
`lib/futebol/captacao.ts`).
