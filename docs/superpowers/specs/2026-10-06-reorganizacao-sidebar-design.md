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
