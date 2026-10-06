# Reorganização da sidebar: Programação, remoção de Tarefas, Jogos, Comissão Técnica e Saúde e Performance

## Contexto

Pedido do Mateus (vídeo + 2 prints da sidebar do Futebol de Base, mas as mudanças valem pros dois
departamentos onde fizer sentido):

1. Onde está "Início", trocar por "Programação".
2. Remover "Tarefas" da sidebar ("nem utilizamos essa aba").
3. Onde está "Jogos / Competições", deixar só "Jogos".
4. "Fisioterapia" vira um item de primeiro nível chamado "Saúde e Performance" — não mais pequeno/
   escondido como estava (no Profissional, hoje é um grupo recolhível com uma setinha; precisa
   abrir pra ver "Fisioterapia" lá dentro). Exemplo de como deve ficar: igual a "Comissão Técnica /
   Diretoria" nos prints — um link solto, direto, do mesmo tamanho dos outros.
5. (Pedido mandado durante a implementação) Onde está "Comissão Técnica / Diretoria", deixar só
   "Comissão Técnica".

## O que já existe hoje (achado ao explorar o código antes de implementar)

- **Início → Programação**: o Profissional **já** faz essa troca desde 05/10
  (`docs/superpowers/specs/2026-10-05-programacao-profissional-design.md`) — `homeLabel` em
  `components/app-shell.tsx` já vira `"Programação"` lá. Só a Base ainda diz "Início"
  (`homeLabel` fica `undefined` pra ela, caindo no padrão "Início" de `AppSidebar`). Os dois prints
  do Mateus são da Base — é ela que precisa da troca agora.
- **"Jogos / Competições" → "Jogos"**: o Profissional **já** chama esse módulo só de "Jogos"
  (`lib/auth/modulos.ts`). Só a Base ainda usa o rótulo composto "Jogos / Competições"
  (`lib/auth/modulos-base.ts`) — é ela que precisa da troca.
- **"Departamento Médico"/"Fisioterapia" pequeno e escondido**: isso é o Profissional
  (`lib/auth/modulos.ts`), não a Base. Lá, `departamento_medico` tem `grupo:
  GRUPO_DEPARTAMENTO_MEDICO` — vira um bloco recolhível (seta, fechado por padrão, precisa clicar
  pra abrir) com um único item dentro ("Fisioterapia"), exatamente o "pequeno, meio escondido" que
  o Mateus descreveu. Na Base, `departamento_medico` **já** é um link solto de primeiro nível (sem
  `grupo`) — só o nome é que muda.
- **"Tarefas"**: não é um módulo de `MODULOS`/`MODULOS_BASE` — é um link fixo, sempre visível pra
  qualquer usuário logado, escrito direto em `components/app-sidebar.tsx` (grupo "Geral").

## Decisão de escopo: remover só o link, não a funcionalidade

"Tarefas" tem uma funcionalidade e permissões completas por trás (`app/tarefas/*`,
`tarefas_categorias_visiveis` em `perfis`, migração 0025). Apagar tudo isso é irreversível sem
recriar a migração; só tirar o link da sidebar é reversível em um minuto se o Mateus mudar de ideia.
Como o pedido foi "remover da sidebar" (não "apagar a funcionalidade"), a mudança aqui é só isso:
tira o link. `/tarefas` continua existindo (ninguém apaga dado nenhum), só não aparece mais no menu.
Se o Mateus quiser also decommissionar de vez (rotas, permissão, tabela), é um pedido à parte.

## Mudanças

1. **`lib/auth/modulos-base.ts`** (Base): `jogos.label` → `"Jogos"`; `departamento_medico.label` →
   `"Saúde e Performance"`, remove `subLabel: "Fisioterapia"` (não precisa mais — permissão e link
   passam a ter o mesmo nome). `homeLabel` da Base, em `components/app-shell.tsx`, passa a ser
   sempre `"Programação"` (igual ao Profissional, sem mais `undefined` pra Base).
2. **`lib/auth/modulos.ts`** (Profissional): `departamento_medico.label` → `"Saúde e Performance"`,
   remove `subLabel: "Fisioterapia"` e `grupo: GRUPO_DEPARTAMENTO_MEDICO` (vira item solto, mesmo
   nível dos outros — "Comissão Técnica / Diretoria", "Staff Operacional" etc.). Remove a constante
   `GRUPO_DEPARTAMENTO_MEDICO` em si, que fica sem nenhum uso depois disso.
3. **`components/app-sidebar.tsx`**: remove o link fixo "Tarefas" do grupo "Geral". Remove a entrada
   `"Jogos / Competições": "Jogos"` de `ROTULO_CURTO` (rótulo curto da barra inferior do celular,
   fica redundante — o rótulo cheio já virou "Jogos"). Acrescenta `"Saúde e Performance": "Saúde"`
   em `ROTULO_CURTO`, mesmo critério dos outros rótulos longos ali (a barra inferior do celular tem
   pouco espaço).
4. **`components/app-shell.tsx`**: `homeLabel` deixa de ser condicional — vira sempre
   `"Programação"`, pros dois departamentos. `homeTitle` da Base passa de "Início do Futebol de
   Base" pra "Programação do Futebol de Base" (mesmo padrão do texto do Profissional).
   `homeIconeProgramacao` passa a ser sempre `true` (hoje só o Profissional usa o ícone de
   Programação; com os dois chamando "Programação", os dois usam o mesmo ícone — pequeno ajuste de
   consistência visual, não pedido explicitamente, mas decorre direto do nome ficar igual nos dois).
5. **`lib/auth/modulos.ts`/`lib/auth/modulos-base.ts`**: `comissao_tecnica.label` → `"Comissão
   Técnica"` (nos dois). `components/app-sidebar.tsx`: chave de `ROTULO_CURTO` atualizada junto
   (continua existindo um rótulo curto pra barra inferior do celular, só com o texto novo).

## Fora de escopo

- Apagar a funcionalidade/rotas/permissão de Tarefas (só o link sai do menu, ver seção acima).
- Qualquer mudança na ordem dos módulos na lista (cada item muda de nome/agrupamento no lugar onde
  já está, sem reordenar).
- Renomear a tabela/migração ou qualquer referência interna a "departamento_medico" (a chave
  continua a mesma — só o rótulo visível muda).

## Verificação

- `npx tsc --noEmit`, `npx eslint` nos arquivos alterados, `npx vitest run`, `npx next build`.
- Conferir visualmente: Base mostrando "Programação" no topo, "Jogos" (sem "/Competições"), "Saúde
  e Performance" como item solto; Profissional mostrando "Saúde e Performance" como item solto
  (sem grupo recolhível) no lugar onde antes só "Fisioterapia" aparecia depois de abrir a seta;
  "Tarefas" sumiu da sidebar nos dois; checkbox de permissão em `/usuarios` lendo "Saúde e
  Performance" em vez de "Departamento Médico".

## Adendo (depois da entrega): "Saúde e Performance" vira módulo com ramificações

Depois da entrega do item 4 (link solto, nome "Saúde e Performance"), o Mateus pediu mais um
ajuste: "Exemplo, Saúde e Performance, deve ficar como um modulo que tenha ramificações pra baixo a
exemplo da Fisioterapia". A primeira leitura possível — reintroduzir um grupo recolhível com seta na
sidebar — foi descartada depois de perguntar: ele confirmou explicitamente que o link da sidebar
**não** deve voltar a ter seta/sub-itens embutidos ("saúde e performance não está com a seta com com
as categorias abaixo... ela é pra ficar como tela e abaixo a fisioterapia"). Ou seja: o link da
sidebar continua um item único, de primeiro nível, sem seta — mas clicar nele leva a uma **tela**
(hub), e "Fisioterapia" aparece como um cartão dentro dessa tela, não na sidebar.

**Padrão reaproveitado**: `app/estoque/page.tsx` já faz exatamente isso — "um módulo só, mas com
ramificações separadas", uma tela de entrada com um cartão por sub-área, e o `prefixo` do módulo
apontando pro hub em vez de direto pra sub-área (o middleware libera as duas rotas porque uma é
prefixo da outra, via `startsWith`). Aplicado aqui sem precisar renomear nenhuma rota já construída
de Fisioterapia (listagem, ficha do atleta, relatório, PDFs, Server Actions — permanecem intactas).

**Mudanças**:

- **`app/departamento-medico/page.tsx`** (novo, Profissional) e **`app/base/departamento-medico/
  page.tsx`** (novo, Base): tela hub com um cartão "Fisioterapia" (estilo igual ao de
  `app/estoque/page.tsx`: barra de acento `bg-grena`, título, subtítulo com estatística —
  "{total} atletas · {em tratamento} em tratamento"). A versão Base restringe as contagens às
  categorias permitidas do usuário logado (`getCategoriasBasePermitidas`), com a contagem de "em
  tratamento" intersectada com o conjunto de atletas já permitidos (evita contar lesão de atleta de
  categoria fora do escopo de quem está vendo).
- **`lib/auth/modulos.ts`**: `departamento_medico.prefixo` passa de `/departamento-medico/
  fisioterapia` pra `/departamento-medico` (o hub).
- **`lib/auth/modulos-base.ts`**: `departamento_medico.prefixo` passa de `/base/departamento-medico/
  fisioterapia` pra `/base/departamento-medico` (o hub).
- Nenhuma mudança em `components/app-sidebar.tsx` — o link da sidebar já apontava pro `prefixo` do
  módulo, então passa a abrir o hub automaticamente, sem precisar de nenhum ajuste ali. Nenhuma
  migração SQL nova.

**Verificação**: `npx tsc --noEmit`, `npx eslint` nos 4 arquivos tocados, `npx vitest run` (592/592,
sem mudança de contagem), `npx next build` — todos limpos. Visual: clicar em "Saúde e Performance"
(Profissional ou Base) abre a tela com o cartão "Fisioterapia"; clicar no cartão leva pra listagem
de Fisioterapia de sempre; o link da sidebar continua sem seta/sub-itens.

## Correção (mesmo dia, antes do próximo deploy): o adendo acima está substituído

O adendo logo acima (tela-hub com cartão) foi entregue, mas o Mateus mandou em seguida um vídeo de
referência (outro sistema, ícones diferentes dos nossos) deixando claro que não era isso: "não é pra
abrir cartão, é pra ficar igual o video enviado". O vídeo mostra um item de sidebar do MESMO
tamanho/peso visual dos outros (não o rótulo pequeno em letras maiúsculas que o bloco
"Administrativo" já usa), com uma seta à direita — ao clicar, ele expande **no próprio lugar da
sidebar** (sem navegar), revelando sub-telas logo abaixo, recuadas. Ou seja, a leitura anterior
("ela é pra ficar como tela, sem seta") estava errada — o que ele descartou da primeira vez foi
especificamente o estilo ANTIGO de seta (pequena, três níveis escondidos, `GRUPO_DEPARTAMENTO_MEDICO`
removido no item 4), não o mecanismo de expandir em si.

**O que muda em relação ao adendo anterior**:

- As telas-hub (`app/departamento-medico/page.tsx` e `app/base/departamento-medico/page.tsx`) foram
  **removidas** — voltam a não existir. `prefixo` volta a apontar direto pra Fisioterapia
  (`/departamento-medico/fisioterapia` e `/base/departamento-medico/fisioterapia`), como era antes
  do adendo anterior.
- Novo campo **`subItens`** em `ModuloInfo`/`ModuloBaseInfo` (`lib/auth/modulos.ts`/`modulos-base.ts`):
  lista de `{href, label}` que o item da sidebar expande pra mostrar. Hoje só `departamento_medico`
  usa, com um único item ("Fisioterapia") — dá pra crescer no futuro (Nutrição, Preparação Física
  etc.) só adicionando entradas aqui, sem mexer em `components/app-sidebar.tsx` de novo.
- Novo componente **`ItemComSubitens`** em `components/app-sidebar.tsx`: renderiza o item com o
  MESMO estilo visual de um item solto (`linkClasse`), mais um ícone de seta que gira ao abrir/
  fechar. Abre sozinho se a página atual está em algum dos `subItens` (mesma regra do
  `GrupoRecolhivel`, que continua existindo — ele é quem renderiza o bloco "Administrativo", sem
  mudança). Na barra recolhida (só ícone, sem espaço pra seta), vira um link direto pro `prefixo`,
  igual a qualquer outro item nesse modo.
- `app-shell.tsx` passa `subItens: m.subItens` ao montar `navItems`, igual já fazia com `grupo`.

**Verificação**: `rm -rf .next && npx tsc --noEmit` (precisa limpar o `.next` — senão os tipos
gerados pras telas-hub removidas quebram o build com "Cannot find module"), `npx eslint` nos
arquivos tocados, `npx vitest run` (592/592, sem mudança de contagem), `npx next build` — todos
limpos, rotas das telas-hub confirmadas fora da lista de rotas do build. Visual: "Saúde e
Performance" aparece do mesmo tamanho dos outros itens, com seta à direita; clicar expande ali
mesmo, mostrando "Fisioterapia" recuada; clicar em "Fisioterapia" leva direto pra listagem de
sempre — nenhuma tela intermediária.
