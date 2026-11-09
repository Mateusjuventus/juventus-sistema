# Atletas: Desativação com Motivo, Transição de Categoria e Dados de Pagamento

## Contexto

Depois de concluir Gatilhos de Contrato e o ajuste de visibilidade das rubricas por tipo de contrato, o Mateus enviou uma lista de 8 pedidos/pendências pro sistema. Um gap-analysis contra o código confirmou que 4 desses pedidos ainda não existem: (1) Dashboard/Painel principal, (3) desativação de atleta com motivo + histórico, (4) promoção/rebaixamento de categoria por um perfil com permissão específica, (6) dados de pagamento PF/PJ + Empresa de Imagem/CNPJ + reposicionar "Tamanho do uniforme", e (8) melhorias na Comissão Técnica (parcial).

O Mateus escolheu combinar os itens 3, 4 e 6 numa única frente ("Atletas: desativação + promoção + pagamento"), já que os três tocam o cadastro/as ações do atleta. Os itens 1 e 8 ficam para rodadas seguintes, cada um com seu próprio levantamento e spec.

Desde a unificação de Atletas (`docs/superpowers/specs/2026-10-28-unificacao-atletas-design.md`), existe uma tabela `atletas` só, com uma coluna `categoria` que aceita `profissional` ou uma das 7 categorias da Base (`sub20`...`sub11`) — um atleta nunca está em duas categorias ao mesmo tempo. O formulário único (`app/atletas/atleta-form.tsx`) decide reativamente quais seções aparecem a partir da Categoria escolhida.

## Decisões confirmadas com o Mateus

- O toggle hoje em `app/atletas/actions.ts::alternarAtletaAtivo` (usado em `app/atletas/[id]/ver/page.tsx`, via `AtletaAtivoButton` — a mesma tela serve atletas de qualquer categoria, Profissional ou Base) é um simples `ativo = true/false`, sem motivo nem histórico — essa é a Frente 1, e o Mateus confirmou que deve valer pros dois lados.
- Não existe hoje nenhum perfil "Gerente"; em vez de criar um novo tipo de `PerfilRole`, a permissão de transitar categoria é uma permissão adicional (booleana) que pode ser marcada em qualquer perfil existente — igual ao padrão já usado por `fisioterapia_pode_editar`/`demandas_acompanhado` em `PerfilPermissoes` (`lib/auth/role.ts`).
- Essa permissão nova dá acesso "emprestado" a **qualquer categoria da Base e ao Profissional**, só pra efeito da ação de transitar — quem a tiver marcada consegue agir sobre atletas de categorias que normalmente não veria (`departamentos_permitidos`/`categorias_base_permitidas` continuam valendo pra tudo o mais).
- A transição de categoria **não grava histórico** — só troca `atletas.categoria`. (Decisão revisada durante o brainstorming: a ideia original incluía histórico, mas o Mateus pediu pra tirar essa parte de toda a ação.)
- A promoção/rebaixamento pro Profissional (ex.: Sub20 → Profissional) usa a **mesma ação** "Transitar atleta", não um fluxo separado.
- Os dados de pagamento (PF/PJ + Empresa de Imagem/CNPJ) são campos do **cadastro do atleta**, sem vínculo com o sub-sistema de Contrato (`atleta_contratos`) — mas a seção só **aparece** no formulário quando o contrato vigente do atleta é de um tipo com remuneração relevante.
- O conjunto de tipos de contrato que mostra "Dados de Pagamento" é **Definitivo, Formação e Empréstimo** — diferente do conjunto que mostra as rubricas do Contrato (`contratoTemRemuneracaoFormal`, que é só Definitivo e Empréstimo). São duas regras de visibilidade distintas, propositalmente.
- "Dados de Pagamento" não inclui dados bancários (conta/agência/banco) — só Tipo (PF/PJ), Nome/razão social da Empresa de Imagem e CNPJ.
- "Tamanho do uniforme" sai do fim de "Dados esportivos" e vai pro topo dessa mesma seção (perto de Posição/Número da camisa).

## Frente 1 — Desativação de atleta com motivo + histórico (Profissional e Base)

**Escopo**: qualquer atleta, Profissional ou Base — `AtletaAtivoButton`/`alternarAtletaAtivo` já são renderizados hoje pras duas categorias na mesma tela unificada de "Ver atleta" (`app/atletas/[id]/ver/page.tsx`), sem distinção. A mudança desta frente vale pros dois lados sem precisar de nenhuma condição extra por categoria.

Isso é independente do Relatório de Dispensa da Base (`app/treinador/atletas/[id]/dispensa` e `app/base/atletas/[categoria]/[id]/dispensa`), que continua existindo do jeito que está — aquele fluxo grava `status = 'dispensado'` e os campos `dispensa_*` (motivo técnico, notas, período), nunca toca em `ativo`. Um atleta da Base pode ter um Relatório de Dispensa formal gerado e, independentemente disso, ser desativado (ou não) por aqui — são dois registros que não se sobrepõem. Essa frente passa a valer igualmente pra Base: o mesmo botão "Desativar atleta"/"Reativar atleta", a mesma caixa de motivo, a mesma tabela de histórico.

**Estado atual**: `alternarAtletaAtivo(id, novoValor)` faz só `update({ ativo: novoValor })`. `AtletaAtivoButton` é um `<form>` simples que troca o label entre "Ativar atleta"/"Desativar atleta".

**Novo comportamento**:
- Ao clicar **"Desativar atleta"**, abre uma caixa (inline, no mesmo espírito de `NovoLancamentoForm` em `historico-status-modal.tsx`) pedindo:
  - **Motivo** (obrigatório, select): Rescisão de contrato / Fim de contrato (não renovado) / Transferência ou venda para outro clube / Empréstimo para outro clube / Outro (abre campo de texto livre obrigatório quando selecionado).
  - **Observação** (opcional, texto livre) — além do motivo, pra anotar algo a mais.
- Ao clicar **"Reativar atleta"** (quando já está desativado), abre a mesma caixa, mas sem a lista fixa de motivos — só um campo de **Observação/motivo da volta** (texto livre, obrigatório, já que o Mateus pediu que a reativação também peça motivo/observação).
- As duas ações gravam uma linha numa tabela nova de histórico e atualizam `atletas.ativo` de acordo — mesmo padrão de `registrarStatusAtleta`/`recomputarStatusAtual` (`lib/futebol/status-historico.ts`): nunca apagar/sobrescrever a linha anterior, só inserir e recalcular o estado atual a partir da mais recente.
- Uma tela/modal nova **"Histórico de desativações"**, acessível a partir de "Ver atleta", lista a linha do tempo (igual ao modal de Histórico de Status já existente): cada entrada mostra ativo/inativo, motivo (ou observação, se for reativação), data, e quem registrou (`criado_por_nome`, resolvido a partir de quem está logado — nunca um campo escolhido).

**Modelo de dados** — tabela nova `atletas_ativo_historico`:

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid, PK | |
| `atleta_id` | uuid, FK `atletas.id` | |
| `ativo` | boolean | o novo estado sendo registrado |
| `motivo` | text, nullable | só preenchido ao desativar (um dos 4 fixos, ou o texto livre de "Outro") |
| `observacao` | text, nullable | texto livre opcional na desativação; obrigatório na reativação |
| `data` | date | data do evento (padrão: hoje) |
| `criado_por_perfil_id` | uuid, nullable | |
| `criado_por_nome` | text | resolvido via `nomeDaContaAtual` |
| `created_at` | timestamptz | |

`lib/futebol/ativo-historico.ts` (novo módulo, espelhando a estrutura de `status-historico.ts`, mas com funções próprias — o formato da linha é diferente, `ativo` booleano em vez de `status` enum, então não dá pra importar as funções genéricas direto): `registrarAtivoAtleta(supabase, atletaId, ativo, motivo, observacao, data)` grava a linha e sincroniza `atletas.ativo` com a mais recente; `linhaMaisRecenteAtivo`/`calcularLinhaDoTempoAtivo`, réplicas do mesmo algoritmo de `linhaMaisRecente`/`calcularLinhaDoTempo` adaptadas pro novo formato de linha.

## Frente 2 — Transição de categoria (com permissão nova)

**Permissão nova**: `pode_transitar_categoria_atleta` (boolean, nullable, igual ao padrão de `fisioterapia_pode_editar`) em `PerfilPermissoes`/tabela `perfis`. Marcável em qualquer perfil (não é exclusiva de um `role` específico), editável na tela de Usuários do mesmo jeito que as outras permissões booleanas.

**Efeito da permissão**:
- Quem a tiver marcada ganha, só pra esta ação, visão/ação sobre atletas de **qualquer categoria** (as 7 da Base + Profissional) — ignorando `departamentos_permitidos`/`categorias_base_permitidas` especificamente nesta função. O resto do sistema continua respeitando as restrições normais de departamento/categoria pra essa pessoa.
- Vê um botão/ação **"Transitar atleta"** na tela de "Ver atleta", que abre um seletor com as 8 categorias possíveis (exceto a atual) e confirma a troca.
- A troca é direta: `update atletas set categoria = <nova> where id = <atleta>` — **sem motivo, sem histórico**, sem efeito colateral em outras tabelas (Contrato, Status etc. continuam como estão; só a categoria muda).
- Cobre também o caso de promover um atleta do Sub20 pro Profissional (ou rebaixar o inverso) — é só mais um valor de destino dentro da mesma ação.

**Campo "Categoria" do formulário normal** (`app/atletas/atleta-form.tsx`): passa a ser **somente leitura** (mostra o valor atual, sem `<select>` editável) pra qualquer pessoa, master incluído — a única forma de mudar a categoria de um atleta já cadastrado passa a ser a ação "Transitar atleta". O cadastro de um atleta **novo** continua escolhendo a categoria normalmente (o campo só fica travado depois de criado).

## Frente 3 — Dados de Pagamento (PF/PJ + Empresa de Imagem/CNPJ) e reposicionamento do Tamanho do uniforme

**Campos novos em `atletas`**:

| Coluna | Tipo | Observação |
|---|---|---|
| `tipo_pagamento` | text, nullable, check in (`'pf'`,`'pj'`) | |
| `empresa_imagem_nome` | text, nullable | só relevante quando `tipo_pagamento = 'pj'` |
| `empresa_imagem_cnpj` | text, nullable | texto livre com placeholder `00.000.000/0000-00`, mesmo padrão de `hoteis.cnpj` (sem máscara/validação forte) |

**Seção nova "Dados de Pagamento"** em `app/atletas/atleta-form.tsx`: campo Tipo de pagamento (select PF/PJ) e, só quando PJ estiver selecionado, Nome da Empresa de Imagem + CNPJ (mesmo padrão reativo já usado pro checkbox "Possui alergia" / seleção de Categoria — mostra/esconde sem precisar salvar).

**Visibilidade da seção inteira**: só aparece quando o contrato **vigente** do atleta tiver `tipo_contrato` em `definitivo`, `formacao` ou `emprestimo` — conjunto diferente do usado por `contratoTemRemuneracaoFormal` (que é só `definitivo`/`emprestimo`, usado pras rubricas do Contrato). Nova função pura em `lib/futebol/contrato.ts`:

```ts
export function atletaTemDadosPagamento(tipoContrato: string | null | undefined): boolean {
  return tipoContrato === "definitivo" || tipoContrato === "formacao" || tipoContrato === "emprestimo";
}
```

Como `AtletaForm` hoje não recebe nenhuma informação de contrato, as páginas de criar/editar atleta (`app/atletas/[id]/page.tsx`, `app/atletas/novo/page.tsx`) passam a buscar o `tipo_contrato` do contrato vigente (mesma query que já alimenta `ContratoSecao`) e passar como nova prop (`tipoContratoVigente?: string | null`) pro `AtletaForm` decidir se mostra a seção. No cadastro de atleta novo (sem contrato ainda), a seção fica escondida até existir um contrato.

**Reposicionamento do "Tamanho do uniforme"**: sai da última posição de "Dados esportivos" e passa a ficar logo depois de "Número da camisa" (antes de "Número CBF"), já que são dados do mesmo tipo (identificação/uniforme do atleta).

## Riscos e pendências pra revisão

1. A permissão nova (`pode_transitar_categoria_atleta`) dá acesso de leitura/escrita a atletas de categorias fora do que a pessoa normalmente vê — isso é uma concessão deliberada (confirmada com o Mateus), mas vale revisar se essa visão "emprestada" deve aparecer só dentro da própria ação de transição (um seletor que busca o atleta por nome/ID, sem listar os atletas da Base inteira pra essa pessoa) ou se estende à tela de "Ver atleta" normal — a implementação vai assumir a primeira opção (mínimo necessário) a menos que o Mateus diga o contrário na revisão da spec.
2. Bloquear o campo Categoria no formulário normal significa que, se o botão "Transitar atleta" não existir ou falhar por algum motivo, não há mais nenhum jeito de corrigir a categoria de um atleta (nem pelo master) — vale confirmar que isso é aceitável, já que hoje qualquer um com acesso de editar o atleta pode corrigir uma categoria errada direto no formulário.
3. A tabela `atletas_ativo_historico` é nova e paralela a `atletas_status_historico` — são dois históricos independentes (um é ativo/inativo, o outro é liberado/departamento médico/transição/dispensado). Não há necessidade de unificá-los, mas vale deixar claro que são conceitos diferentes pra não confundir na hora de exibir os dois na tela de "Ver atleta".
4. CNPJ da Empresa de Imagem não tem validação de formato (segue o padrão simples já usado em `hoteis.cnpj`) — se o Mateus quiser validação/máscara, isso pode ser adicionado numa rodada futura sem mudar o modelo de dados.

## Fora do escopo desta frente

- Item 1 (Dashboard/Painel principal) e item 8 (melhorias na Comissão Técnica) — cada um com seu próprio levantamento e spec, em rodadas futuras.
- Dados bancários (conta/agência/banco) — não entram nos Dados de Pagamento por decisão do Mateus; podem ser adicionados depois se precisar.
- Qualquer mudança no sub-sistema de Contrato (`atleta_contratos`, rubricas, gatilhos) — Dados de Pagamento só *lê* o tipo de contrato vigente pra decidir visibilidade, não grava nem altera nada lá.
