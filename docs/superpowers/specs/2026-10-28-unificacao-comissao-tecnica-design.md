# Unificação da Comissão Técnica (Profissional + Base) — frente-piloto da unificação geral

## Contexto

O sistema Juventus SAF hoje tem dois "universos" quase duplicados: Futebol Profissional e
Futebol de Base, cada um com suas próprias tabelas para praticamente todo módulo (Atletas, Jogos,
Comissão Técnica, Financeiro, Competições, Estoque, Solicitações, Fisioterapia, etc. — mais de 30
tabelas em pares). O usuário (Mateus) pediu para unificar o sistema "em um", tratando o Futebol
Profissional como se fosse mais uma categoria, ao lado de sub11...sub20.

Dado o tamanho do pedido, foi decidido (em conversa de brainstorming) dividir essa unificação em
várias frentes independentes, cada uma com sua própria spec. Esta é a **primeira frente-piloto**:
unificar `comissao_tecnica` (Profissional) e `comissao_tecnica_base` (Futebol de Base) numa tabela
só. Foi escolhida como piloto porque as duas tabelas já têm praticamente os mesmos campos hoje
(a única diferença estrutural é a coluna `categorias`, que só existe no lado Base), e porque o
sistema já tem um precedente comprovado do mesmo tipo de unificação: os módulos Demandas e
Programação já são compartilhados entre os dois departamentos hoje, sem tabela "_base" separada.

O resultado desta frente serve de modelo para as próximas (Atletas, Jogos, Financeiro,
Competições, ...), que serão desenhadas e aprovadas uma a uma, em specs separadas, nessa ordem
aproximada (a definir quando chegar a vez de cada uma): Staff Operacional → Atletas → Jogos (e o
que depende de jogo: Convocação, Súmula, Rooming List, Ônibus, Recibo, Checklist, Vagas de Staff)
→ Financeiro → Competições → Estoque/Solicitações → Fisioterapia/Departamento Médico.

## O que já existe (não muda nesta frente)

- `lib/auth/categorias-base.ts` — `CategoriaBase` ("sub20"..."sub11") e `CATEGORIAS_BASE`, usados
  também por `atletas_base` e `jogos_base`. **Não são alterados** — essas duas tabelas continuam
  só com as 7 categorias da Base, sem "profissional". A unificação desta frente cria um tipo novo,
  específico da Comissão Técnica unificada (ver "Modelo de dados").
- Organograma da Base (`organograma_base`, `components/organograma-editor.tsx`) continua existindo
  só para a Base, sem equivalente no Profissional — fora de escopo criar um.
- `resolverEhSupervisorDaCategoriaBase`/`ehSupervisorDaCategoriaBase` (`lib/auth/role.ts`) e
  `buscarSupervisoresDaCategoriaBase` (`lib/notificacoes/financeiro.ts`), que decidem quem assina o
  Financeiro de cada jogo da Base por categoria (frente implementada nesta mesma sessão) —
  continuam só para a Base. Financeiro do Profissional não muda.
- Convocação de jogos continua em duas telas separadas (`app/jogos/[id]/convocacao` e
  `app/base/jogos/[id]/convocacao`), porque Jogos ainda não foi unificado — só a fonte de dados da
  lista de comissão técnica muda (ver "O que muda").
- `configuracoes_cadastro_comissao_tecnica` / `configuracoes_cadastro_comissao_tecnica_base`
  (toggle de "cadastro público" — um link externo de autocadastro) continuam duas configurações e
  duas URLs públicas separadas, intactas. Só o destino dos dados, por trás, muda.

## O que muda

### Modelo de dados

A tabela `comissao_tecnica` (Profissional) é estendida e passa a acolher também os registros de
`comissao_tecnica_base`, com os **mesmos `id`** preservados (nenhum registro muda de identidade).

- Novo tipo `CategoriaComissaoTecnica = "profissional" | CategoriaBase` em
  `lib/auth/categorias-base.ts` (ou arquivo próprio) — especificamente para esta tabela, sem afetar
  `CategoriaBase` usado por Atletas/Jogos.
- Nova coluna `categorias CategoriaComissaoTecnica[] not null` em `comissao_tecnica`, com check
  constraint aceitando "profissional" + as 7 categorias da Base. Backfill: toda linha hoje existente
  em `comissao_tecnica` (Profissional) recebe `categorias = ['profissional']`.
- Migração copia cada linha de `comissao_tecnica_base` para `comissao_tecnica`, preservando `id` e
  todos os campos (que já são idênticos) — alguém que hoje tem duas linhas (uma em cada tabela,
  caso do coordenador que atua nos dois lados) passa a ter **uma linha só**, com
  `categorias = ['profissional', 'sub20']` (por exemplo) em vez de duas linhas separadas.
- `comissao_tecnica_base` é renomeada para `comissao_tecnica_base_old` (não apagada) depois da
  migração, só para o Mateus confirmar que está tudo certo. A remoção definitiva é um passo manual,
  só depois dessa confirmação.
- FKs repontadas para `comissao_tecnica(id)`: `organograma_base.comissao_tecnica_base_id`,
  `convocacao_comissao_base.comissao_tecnica_base_id` (e qualquer outra encontrada na implementação
  que hoje referencie `comissao_tecnica_base`).
- `perfis.comissao_tecnica_id` e `perfis.comissao_tecnica_base_id` (hoje dois campos de vínculo de
  conta, um pra cada lado) **colapsam num campo só**, `comissao_tecnica_id`, apontando pra tabela
  unificada — já que uma pessoa com vínculo nos dois lados agora é uma linha só na tabela de
  destino, não precisa mais de dois campos de vínculo. `components/vinculo-comissao-tecnica-form.tsx`
  passa a ter um único campo de seleção (hoje tem dois). `lib/assinaturas/nome-cargo.ts` e
  `lib/assinaturas/actions.ts`, que já tratavam os dois IDs numa lógica só, simplificam para um único
  caminho.
- `lib/auth/role.ts`: o embed de `comissao_tecnica_base` em `PerfilPermissoes` passa a vir do vínculo
  único; `resolverCategoriasBasePermitidas` e as funções de supervisor continuam lendo apenas as
  categorias da Base dentro da lista (ignorando "profissional"), já que seu comportamento não muda
  (ver "O que já existe").

### Telas

- `app/comissao-tecnica/page.tsx` e `app/base/comissao-tecnica/page.tsx` (e os `[id]/page.tsx` e
  `export/route.ts` de cada lado) são substituídos por uma página única (rota a definir na
  implementação, ex. `/comissao-tecnica`), que lista os registros em **blocos por categoria**
  ("Profissional", "Sub-20", "Sub-17", ... — nunca uma lista única misturada). Uma pessoa com
  múltiplas categorias aparece em cada bloco correspondente. Export em Excel único, com coluna de
  categoria(s).
- A rota antiga `/base/comissao-tecnica` passa a redirecionar para a nova rota única, para não
  quebrar links/favoritos salvos.
- As URLs de autocadastro público (`/cadastro-comissao-tecnica` e `/cadastro-comissao-tecnica-base`)
  **não mudam** — continuam duas URLs separadas, cada uma escrevendo na tabela unificada com a(s)
  categoria(s) certa(s) por trás.
- A página única aparece no menu lateral dos dois departamentos (Profissional e Base), sempre
  levando para o mesmo lugar — reaproveitando exatamente o padrão já usado hoje por Demandas e
  Programação (`components/app-sidebar.tsx`, `lib/auth/modulos.ts`/`modulos-base.ts`), não um
  mecanismo novo.
- Convocação de jogos (`app/jogos/[id]/convocacao`, `app/base/jogos/[id]/convocacao`) passa a buscar
  a lista de comissão técnica na tabela unificada (filtrando por "profissional" ou pela categoria do
  jogo, conforme o lado) — as duas telas de convocação em si continuam existindo, só a fonte de
  dados muda.

### Permissões

Sem mudança no controle de acesso: continuam os dois interruptores de hoje nas contas de usuário —
um libera o bloco "Profissional" (módulo `comissao_tecnica` em `modulos_permitidos`), outro libera
o(s) bloco(s) da Base (módulo `comissao_tecnica` em `modulos_base_permitidos`, com os blocos de
categoria filtrados pelas categorias já permitidas hoje). A página única simplesmente mostra cada
bloco conforme esses interruptores — sem introduzir uma lista de permissão unificada.

## Casos de borda

- **Pessoa nos dois lados** (ex.: coordenador Profissional + Sub-20): uma linha só na tabela
  unificada, aparece nos dois blocos na tela, um vínculo de conta único.
- **PDFs e assinaturas já gerados** não são afetados — eles guardam uma foto do nome/cargo no
  momento da assinatura (`assinaturas_documento.assinatura_path` e campos próprios), não recalculam
  a partir do cadastro atual.
- **Export Excel**: antes eram dois arquivos (um por departamento); passa a ser um arquivo com uma
  coluna de categoria(s), igual à lista da tela.
- **Link de convite/autocadastro público já compartilhado** com alguém continua funcionando sem
  mudança de URL.

## Fora de escopo

- Unificar `atletas`/`atletas_base`, `jogos`/`jogos_base`, Financeiro, Competições, Estoque,
  Solicitações, Fisioterapia, Staff Operacional — cada um é uma frente própria, a desenhar depois.
- Unificar o menu/navegação de forma geral (a escolha de departamento ao entrar no sistema
  continua existindo) — só este módulo específico passa a ser compartilhado, como Demandas e
  Programação já são.
- Estender "quem assina o Financeiro por categoria" (Base) para o Profissional.
- Criar Organograma para o Profissional.

## Verificação

- Migração roda com contagem de linhas confirmada antes/depois (nenhuma perda, nenhuma duplicata
  por conflito de `id`).
- Conferir manualmente o(s) registro(s) que hoje existem nos dois lados (o coordenador citado pelo
  Mateus) — devem aparecer como uma linha só, nos blocos certos, depois da migração.
- Testar contas com diferentes combinações dos dois interruptores de módulo, confirmando que só os
  blocos liberados aparecem.
- Testar convocação de um jogo do Profissional e de um jogo da Base, confirmando que a lista de
  comissão técnica de cada um continua certa.
- Testar assinatura digital (nome/cargo) de uma conta vinculada, confirmando que resolve certo pelo
  vínculo único.
- Build local (esbuild, checagem de sintaxe) + aguardar o build do Vercel (checagem de tipos) antes
  de considerar pronto, como nas frentes anteriores desta sessão.
