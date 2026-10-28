# Unificação de Atletas (Futebol Profissional + Futebol de Base) — Fase 1 (Núcleo)

## Contexto

Depois de unificar a Comissão Técnica/Diretoria (`docs/superpowers/specs/2026-10-28-unificacao-comissao-tecnica-design.md`), o Mateus confirmou que o objetivo final é o mesmo tratamento pro sistema inteiro: acabar com a duplicação Profissional/Base módulo por módulo, até o ponto de não precisar mais do link "Trocar" entre departamentos na sidebar (`components/app-sidebar.tsx`, prop `outroDepartamento`).

Um levantamento do estado atual (ver sessão de 28/10) mostrou que isso é bem maior do que a Comissão Técnica: existem hoje pelo menos 10 pares de módulos espelhados `app/X` ↔ `app/base/X` (Atletas, Jogos, Competições, Financeiro, Fisioterapia, Programação, Estoque, Staff Operacional, Relatório Avulso, Solicitações), e `atletas`/`atletas_base` especificamente têm assimetrias reais de schema — não são só duas cópias com nomes diferentes como Comissão Técnica era.

Por isso este documento cobre só a **Fase 1: o núcleo de Atletas** (tabela, formulário e tela principal). Módulos que dependem de atletas (Jogos/Convocação, Competições/Súmulas, Fisioterapia, Financeiro, Programação, Relatório Avulso, Organograma/Campograma) ficam para rodadas seguintes, cada um com seu próprio levantamento e spec — o mesmo padrão que a Comissão Técnica seguiu (schema+tela primeiro, sweep de cada módulo depois). A remoção do link "Trocar" só acontece quando TODOS os módulos acima estiverem unificados, não só Atletas — não é prometida nesta fase.

## Decisões já confirmadas com o Mateus

- **Status**: enum único `liberado | transicao | departamento_medico | dispensado`, valendo pros dois lados (hoje Profissional tem `liberado|departamento_medico|transicao` e Base tem `liberado|suspenso|departamento_medico|dispensado` — vocabulários incompatíveis, sem bijeção). Atletas da Base que estão `suspenso` hoje migram para `liberado` (mesmo critério usado em 01/10 quando o Profissional aboliu "suspenso").
- **Dispensa**: o status `dispensado` passa a existir pra qualquer atleta, mas o **Relatório de Dispensa** (formulário com motivo + 4 notas de desempenho + período + PDF, hoje em `app/treinador/atletas/[id]/dispensa` e `app/base/atletas/[categoria]/[id]/dispensa`) continua sendo um recurso só da Base. Um atleta Profissional pode ficar com `status = 'dispensado'`, mas sem esse relatório formal.
- **Classificação G1/G2/G3**: passa a valer pra qualquer atleta, Profissional incluído (hoje é só `atletas_base.classificacao`).
- **Captação/Avaliação**: fica fora do escopo desta fase como funcionalidade (funil de inscrição pública → avaliação → aprovação continua só da Base, sem mudança de comportamento) — só o passo final de aprovação passa a inserir na tabela unificada em vez de `atletas_base`. Porém, ver próximo item: a exigência de RG/CPF/data de nascimento obrigatórios afeta o formulário de inscrição.
- **RG/CPF/data de nascimento**: ficam `NOT NULL` no banco pros dois lados (hoje são obrigatórios só no Profissional; a Base permite nulo pra Captação criar cadastro incompleto). Isso exige ajustar a inscrição pública da Captação pra exigir os 3 dados desde o início, em vez de permitir completar depois — mudança de comportamento da Captação, mas pontual (só esses 3 campos passam a ser obrigatórios no formulário público; o resto do funil não muda).
- **Blocos na listagem**: a tela única de Atletas mostra 1 bloco por categoria (Profissional + Sub-20...Sub-11), igual a Base já mostra hoje — diferente da Comissão Técnica, que colapsou pra 2 blocos. Aqui a granularidade por idade importa pro dia a dia (times, convocação), então se mantém.

## Modelo de dados

### Tabela `atletas` (canônica, absorve `atletas_base`)

Mantém o nome `atletas` (mesmo padrão de `comissao_tecnica`: a tabela do Profissional já existia e vira a canônica; `atletas_base` é renomeada para `atletas_base_old` como backup, não apagada, mesmo tratamento dado a `comissao_tecnica_base_old`).

**Coluna nova**: `categoria` (`text not null`, `check (categoria in ('profissional','sub20','sub17','sub15','sub14','sub13','sub12','sub11'))`). Diferente de `comissao_tecnica.categorias` (array — uma pessoa podia estar em Profissional e numa categoria de Base ao mesmo tempo), aqui é **um valor só por atleta** — um atleta nunca está em duas categorias simultaneamente. Toda linha hoje em `atletas` recebe `categoria = 'profissional'`; as linhas vindas de `atletas_base` recebem o valor que já tinham na coluna `categoria` escalar de lá.

**Colunas só em `atletas_base` hoje, que passam a existir em `atletas` (nullable, sem uso definido pro Profissional ainda — ficam disponíveis, não exibidas no formulário quando a categoria é "profissional", exceto classificação/dispensa que valem pros dois por decisão acima)**: `email_pai`, `email_mae`, `alojado`, `classificacao`, `dispensa_motivo`, `dispensa_nota_tecnica`, `dispensa_nota_fisica`, `dispensa_nota_tatica`, `dispensa_nota_comportamental`, `dispensa_data`, `dispensado_por`, `dispensado_em`, `valor_ajuda_custo`, `agencia`, `mae_nome`, `mae_telefone`, `pai_nome`, `pai_telefone`, `escola`.

> Pendência de revisão: `mae_nome`/`pai_nome`/`escola`/`alojado`/`valor_ajuda_custo`/`agencia` são campos claramente ligados ao contexto de um atleta menor de idade/Base (responsável legal, se mora alojado, ajuda de custo). O plano aqui é esses campos continuarem existindo no banco pros dois lados (pra não travar a migração), mas só aparecerem no formulário/tela quando a categoria do atleta for uma categoria de Base — igual ao Relatório de Dispensa, que fica restrito à Base mesmo com o status "dispensado" valendo pros dois. Avisar o Mateus disso explicitamente na revisão da spec, caso ele queira outro comportamento.

**`status`**: troca a constraint pra `check (status in ('liberado','transicao','departamento_medico','dispensado'))`, valendo pra toda a tabela (hoje Profissional só permite 3 valores, sem "dispensado").

**`tipo_contrato`** (em `atleta_contratos`, ver abaixo): passa a aceitar os 5 valores (`definitivo|emprestimo|amador|formacao|iniciacao`) pros dois lados — hoje só `atleta_base_contratos` tem "iniciacao".

**RG/CPF/data de nascimento**: trocam de `nullable` (em `atletas_base`) pra `not null` nos dois. **Risco de migração**: se existir hoje algum atleta em `atletas_base` com algum desses 3 campos nulo (cadastro incompleto vindo da Captação, ainda não completado), a migração de ALTER COLUMN ... SET NOT NULL vai falhar até esses registros serem completados. A migration SQL desta fase precisa incluir uma consulta de verificação antes do ALTER, e qualquer registro pendente precisa ser completado manualmente (pelo Mateus ou por quem for) antes de rodar a migration em produção.

### Tabelas filhas — mescladas (pares quase idênticos)

Cada par abaixo vira uma tabela só, com `atleta_id` apontando para `atletas.id`. Mantém o nome do lado Profissional como canônico, mesmo padrão da tabela principal:

| Canônica (mantém) | Absorvida (dados migrados, depois renomeada `_old`) |
|---|---|
| `atleta_documentos` | `atleta_documentos_base` |
| `atleta_contatos_emergencia` | `atleta_base_contatos_emergencia` |
| `atleta_anotacoes` | `atleta_base_anotacoes` (nome exato a confirmar no código) |
| `atleta_contratos` | `atleta_base_contratos` |
| `atletas_status_historico` | `atletas_base_status_historico` |

A função de banco `criar_contrato_atleta` passa a ser a única (hoje existe `criar_contrato_atleta_base` espelhada) — `criar_contrato_atleta_base` é removida depois que todo o código que a chama (`app/base/atletas/.../contrato/actions.ts`) passar a chamar a única função.

### Fora do escopo desta fase (ficam como estão, só repontam a FK no final)

- `captacao_base` e tabelas relacionadas (documentos de captação, configs de inscrição/parecer, alojamento) — continuam só da Base; só o passo de aprovação final passa a inserir em `atletas` em vez de `atletas_base`.
- `assistencia_social_atendimentos` — só Base, sem equivalente Profissional; fora de escopo.
- `fisioterapia_historico_importado` — só Profissional, sem equivalente Base; fora de escopo (Fisioterapia inteira é uma fase futura).
- Toda tabela de outro módulo que referencia `atleta_id`/`atleta_base_id` (convocação, súmula, inscrição em competição, fisioterapia) — continua apontando pro id de origem por enquanto; ajustar essas FKs é trabalho da fase de cada módulo, não desta.

## Telas

Uma `/atletas` só, acessível pelos dois departamentos (mesmo padrão de `/comissao-tecnica`), com:

- **Formulário único**: seletor de Categoria (Profissional + as 7 da Base) no topo, condicionando quais campos aparecem — Dados Pessoais e Esportivos comuns sempre visíveis; Classificação (G1/G2/G3) visível pra qualquer categoria; mãe/pai/escola/alojado/ajuda de custo/agência visíveis só quando a categoria é de Base; "Novo contrato"/histórico de contrato continuam como já estão hoje (já eram compartilhados em `components/contrato-secao.tsx`, só trocam de ler `atletas_base`/`atleta_base_contratos` quando for o caso).
- **Listagem**: 1 bloco por categoria (Profissional + Sub-20...Sub-11), igual à Base hoje — cada bloco só aparece se o interruptor de módulo do departamento dele estiver liberado pra conta (mesmo padrão dos 2 interruptores que a Comissão Técnica manteve).
- **Dispensa**: o botão/fluxo de Relatório de Dispensa continua restrito a atletas de categoria de Base (não aparece pra Profissional), mesmo que o status "dispensado" sozinho esteja disponível pros dois.

## Riscos e pendências pra revisão

1. Confirmar com o Mateus se mãe/pai/escola/alojado/ajuda de custo/agência ficam mesmo restritos à Base no formulário (assumido acima, não perguntado explicitamente).
2. Antes de rodar a migration em produção, verificar se existe algum atleta da Base com RG/CPF/data de nascimento nulos hoje — esses precisam ser completados manualmente antes do `ALTER COLUMN ... SET NOT NULL`.
3. Confirmar o nome exato da tabela de anotações da Base (`atleta_base_anotacoes` é uma suposição a partir do padrão de nomenclatura; precisa confirmar lendo o arquivo da migration/tipo real antes de escrever o SQL).
4. Esta fase não toca em Jogos/Convocação, Competições/Súmulas, Fisioterapia, Financeiro, Programação, Relatório Avulso nem Organograma/Campograma — todos continuam funcionando sobre `atletas_base` até a fase deles chegar; a FK desses módulos só é repontada quando cada um for unificado.

## Fases futuras (fora deste documento)

Pela ordem sugerida (cada uma com seu próprio levantamento + spec, quando chegar a vez):

1. Jogos/Convocação (maior módulo do sistema: ônibus, presskit, rooming-list, súmula, financeiro de jogo, checklist, vagas).
2. Competições/Súmulas.
3. Fisioterapia.
4. Financeiro.
5. Programação.
6. Relatório Avulso.
7. Organograma/Campograma.
8. Remoção do link "Trocar" entre departamentos — só depois de todas as fases acima.
