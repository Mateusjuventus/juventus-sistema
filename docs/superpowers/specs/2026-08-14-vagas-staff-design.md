# Vagas de Staff por jogo — 14/08/2026

## O pedido

O Mateus queria que o staff confirmasse presença por um link, como já acontece no autocadastro.
Depois de ver o primeiro desenho (convocar pessoa a pessoa e cada uma confirmar), corrigiu o modelo:
**ele não quer selecionar ninguém**. Quer abrir vagas — "tipo 10 vagas" — mandar o link, e o sistema
fechar sozinho quando lotar.

E completou o desenho num ponto que muda tudo: **a função vem do cadastro da pessoa**, cruzada com a
demanda que ele abriu. Ninguém escolhe função no celular.

## Como ficou

`/jogos/[id]/vagas` (aba nova): ele define as funções e quantas vagas cada uma tem — 4 seguranças,
4 gandulas, 2 maqueiros —, mais horário e local de apresentação. Ao salvar, o banco gera um token e
a tela mostra o link com botões de copiar e mandar no WhatsApp.

`/vagas/[token]` (público, sem login): mostra o jogo, **só o total** de vagas abertas e um seletor
de nome. Escolhido o nome, a tela mostra **a vaga dela** — porque a função sai do cadastro — e
quantas restam naquela função. A pessoa digita os 4 últimos dígitos do CPF e pega.

Cada um vê só a própria categoria (ajuste pedido depois da primeira versão, que listava todas as
funções abertas). Dois motivos: o gandula não precisa saber quantos seguranças faltam, e a lista
cheia empurrava a identificação para baixo da dobra no celular.

Quem não está cadastrado tem link direto para `/cadastro-staff`, que já existia, e volta ao link
para pegar a vaga — sem o Mateus no meio (decisão dele).

## A parte que decide se isso funciona no dia do jogo

Em véspera de jogo o grupo inteiro responde junto, e três pessoas podem tocar em "confirmar" na
mesma última vaga no mesmo segundo. **Conferir a lotação no servidor e depois inserir não resolve**:
entre a conferência e a inserção outra transação já entrou, e o clube termina com 12 pessoas em 10
vagas sem ninguém entender por quê — justamente o problema que o recurso existe para evitar.

Por isso a decisão vive dentro de `pegar_vaga_staff`, uma função no Postgres que:

1. trava a linha daquela função com `select ... for update` — o que serializa só as tentativas
   daquela função, deixando quem é de outra entrar em paralelo;
2. só então conta os confirmados e insere;
3. quem passar do limite entra como `espera` em vez de receber erro.

O `app/vagas/[token]/actions.ts` apenas chama essa função e traduz a resposta. Nenhuma regra de
lotação é duplicada no TypeScript, de propósito.

## Identificação: os 4 últimos dígitos do CPF

Não é senha e não pretende ser. O link já é secreto (token de 12 caracteres hex) e circula no grupo
fechado do clube; os dígitos existem para ninguém pegar vaga no lugar de outro por engano ou
brincadeira. Detalhes que importam:

- **Nenhum dado do cadastro aparece antes de acertar** — a lista pública tem só nomes.
- A mensagem de erro é **idêntica** para nome inexistente e dígito errado. Dizer "esse não é o CPF
  do Fulano" contaria a quem tentou que o Fulano está cadastrado.
- `confereFinalCpf` compara só dígitos, então funciona com o CPF salvo com ou sem máscara.

## O horário aparece na confirmação, não antes

O horário de apresentação **muda por função** — segurança chega 12h30, gandula 13h30. Mostrar o
horário geral do jogo no topo da página faria metade do grupo chegar na hora errada, então ele saiu
de lá.

Agora o horário aparece **depois de confirmar**, junto de função e local, no mesmo cartão que quem
volta ao link mais tarde vê — porque reconferir o horário é justamente o motivo de a pessoa abrir o
link de novo. `horarioDaFuncao` resolve qual mostrar: o da função, caindo no geral do jogo quando
aquela função não tem um próprio.

Antes de confirmar, o horário **não** é exibido de propósito: é informação de quem vai trabalhar, e
mostrá-la antes convidaria alguém a anotar o horário sem pegar a vaga.

## Lista de espera

Quem chega depois de lotar entra em `espera`. Desistência libera a vaga na hora — é o que faz a
lista valer alguma coisa na véspera.

A promoção da espera é **manual** (botão "Chamar"). Promover o primeiro da fila automaticamente
tiraria do Mateus uma decisão que costuma depender de quem mora mais perto ou já trabalhou naquela
função.

## Encaixe com o que já existe

- **Recibo de Pagamento**: quem pegou vaga já vem marcado quando a tela é aberta pela primeira vez.
  Depois do primeiro salvamento a escolha do usuário manda — senão quem ele tirou na mão voltaria
  marcado a cada visita. Antes disso, a mesma informação era digitada duas vezes: uma para chamar,
  outra para pagar.
- **Catálogo de funções**: é o mesmo `staff_funcoes_catalogo` do cadastro de Staff. Sem isso o
  cruzamento função-da-pessoa × vaga-aberta não existiria.
- **Rota pública**: `/vagas` entra em `PUBLIC_PATHS`, ao lado dos autocadastros.

## Proteções contra o operador se enganar

- Remover uma função que **já tem gente inscrita** é recusado com explicação. O `on delete cascade`
  levaria as inscrições junto, e quem já se organizou para o jogo sumiria sem aviso.
- Reduzir a quantidade abaixo do que já foi preenchido não gera número negativo nem "3 de 2" na
  tela (`vagasRestantes` e `totalOcupadas` tratam isso).
- Fechar as vagas não apaga nada: o link passa a mostrar "encerrado" e o histórico continua.
- Índice único `(vagas_id, staff_id)`: ninguém aparece duas vezes no mesmo jogo, nem contando espera.

## Testado

`lib/futebol/vagas-staff.ts` é puro e testado (10 testes): contagem que ignora a espera, não
confundir inscrição de outra função, função apagada do catálogo, "última!", quantidade reduzida
depois de gente inscrita, e o final de CPF com e sem máscara. Total do projeto: 226.

A tela pública foi renderizada no Chromium com perfil de iPhone 13 (390px, sem rolagem horizontal).

## Erro cometido na primeira versão (14/08)

A 0073 concedeu GRANT das tabelas novas só para `authenticated`. A tela pública usa a service_role,
que **ignora RLS mas não ignora GRANT** — então o Postgres negava a consulta (42501) e a página, que
tratava qualquer falha como token inexistente, dizia "Link não encontrado" com as vagas abertas e
salvas do outro lado.

É o mesmo erro já corrigido em `0027_grants_service_role_perfis.sql` e
`0060_grants_service_role_staff_base.sql` — a terceira vez no projeto. Corrigido em
`0074_grants_service_role_vagas.sql`.

**Regra para tabela nova daqui pra frente: se alguma tela SEM LOGIN lê ou escreve nela, ela precisa
de grant para o `service_role`, não só para o `authenticated`.**

## Duplicado para o Futebol de Base (18/08)

Mesmo modelo, tabelas próprias (`jogo_vagas_staff_base*`, ver 0075_vagas_staff_base.sql) apontando
para `jogos_base` e `staff_operacional_base` — não uma coluna `departamento` nas tabelas do
Profissional, porque é assim que o resto do sistema já separa os dois departamentos.

O que é compartilhado: o catálogo de funções (`staff_funcoes_catalogo`) e os três componentes de
UI, movidos para `components/` (`vagas-form.tsx`, `link-vagas.tsx`, `vaga-publica-form.tsx`) — os
dois departamentos usam exatamente a mesma tela, só trocando de tabela por baixo. `LinkVagas` ganhou
um prop `caminho` (`/vagas` no Profissional, `/vagas-base` na Base) e `VagaPublicaForm` ganhou
`cadastroHref`, pra mandar quem não está cadastrado para o autocadastro do departamento certo —
misturar isso criaria o staff no departamento errado.

Rota pública: `/base/jogos/[id]/vagas` (admin) e `/vagas-base/[token]` (link, adicionado a
`PUBLIC_PATHS`). O grant pro `service_role` já nasceu na própria 0075, em vez de numa migração de
correção depois — é a lição registrada abaixo, aplicada de cara desta vez.

O pré-marcado do Recibo de Pagamento (ver "Encaixe com o que já existe") também foi replicado:
`app/base/jogos/[id]/recibo/page.tsx` busca quem confirmou vaga em `jogo_vagas_staff_base` e passa
pra `ReciboFormBase`, do mesmo jeito que o Profissional já fazia.

## Fora de escopo por ora

- Notificar por WhatsApp/e-mail quem está na espera quando abre vaga (hoje o Mateus chama e avisa).
- Limitar quantas vagas a mesma pessoa pode pegar ao longo do mês.
