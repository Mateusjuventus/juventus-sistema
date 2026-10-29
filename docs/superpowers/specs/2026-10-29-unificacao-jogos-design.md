# Unificação de Jogos/Convocação (Futebol Profissional + Futebol de Base) — Fase 2

## Contexto

Sequência direta da Fase 1 (Núcleo de Atletas, `docs/superpowers/specs/2026-10-28-unificacao-atletas-design.md`), já concluída, testada e em produção. A ordem de fases futuras definida naquela spec colocava Jogos/Convocação em primeiro lugar — "o maior módulo do sistema: ônibus, presskit, rooming-list, súmula, financeiro de jogo, checklist, vagas" — e o levantamento desta fase confirmou isso: ~18.275 linhas em 123 arquivos entre `app/jogos` (Profissional) e `app/base/jogos` (Base), maior que Atletas.

Diferente de Atletas, aqui o schema das duas tabelas-núcleo (`jogos`/`jogos_base`) e das tabelas de 10 das 11 sub-áreas já é quase idêntico — em vários casos *deliberadamente* simétrico (ex.: colunas de terceiro tempo existem no Profissional, mas ficam sempre nulas/zeradas, só porque uma query compartilhada seleciona o mesmo conjunto de colunas pros dois lados). Ou seja: o trabalho de schema tende a ser mais mecânico do que foi em Atletas; o grosso do esforço aqui é o número de telas (11 sub-áreas × 2 departamentos) e o sweep de referências.

O Mateus decidiu, depois de ver a proposta de quebrar em 5 sub-specs (Núcleo, Convocação+Súmula, Logística, Financeiro, Checklist+Vagas), **não decompor** — esta spec cobre o módulo inteiro de uma vez.

### Pré-requisito já resolvido antes desta fase

Durante o levantamento, foi encontrado um bug de dados real (não hipotético) deixado pela Fase 1: `onibus_passageiros_base.pessoa_id` e `rooming_list_ocupantes_base.pessoa_id` são referências polimórficas (coluna irmã `pessoa_tipo` diz se é atleta/comissão/staff — nunca foram FK de verdade), então a migration `0151_unificacao_atletas_fks.sql` (que corrigiu as 9 FKs reais que ficaram presas em `atletas_base_old`) não tinha como pegá-las. Registros de ônibus/rooming-list da Base, lançados antes da fusão de Atletas, para os 5 atletas que tinham cadastro duplicado Profissional+Base, ficavam silenciosamente órfãos (sem erro, só sumindo do join). Corrigido em `supabase/migrations/0153_fix_pessoa_id_onibus_rooming_list_base.sql`, já aplicado em produção e confirmado (0 órfãos) antes do início desta fase.

Também durante o levantamento: `convocacao_staff` (Profissional) e `convocacao_staff_base` (Base) são tabelas reais no banco (criadas em `0003_convocacao.sql`/`0033_futebol_base_jogos_financeiro.sql`, pensadas pra "convocar staff pro jogo", espelhando `convocacao_comissao`), mas nenhuma tela ou action do sistema jamais leu ou escreveu nelas — funcionalidade nunca finalizada. Mateus confirmou que é pra remover, não implementar: `ConvocacaoStaffRow` já foi removida de `lib/supabase/types.ts`, e `supabase/migrations/0154_remove_convocacao_staff_nao_usada.sql` derruba as duas tabelas (com checagem de segurança — aborta se alguma tiver dado).

## Decisões já confirmadas com o Mateus

- **Decomposição**: nenhuma — módulo inteiro numa spec/plano só, apesar do tamanho.
- **Número da camisa na Convocação**: mantém a diferença atual. Profissional continua usando o número fixo do cadastro do atleta (`atletas.numero_camisa`); Base continua podendo editrar o número por convocação (campo `numero_camisa` na própria linha de convocação, já que times de base trocam número com frequência). Na tela unificada, esse campo só aparece editável quando a categoria do jogo é de Base.
- **Padrão de unificação**: mesmo da Fase 1 — troca direta de referência de tabela/tipo em todo lugar que hoje lê `jogos_base`/`JogoBaseRow` (e equivalentes nas 11 sub-áreas), sem view de compatibilidade. Tabela do Profissional é sempre a canônica (mantém o nome); a tabela da Base é renomeada `_old` como backup, nunca apagada.
- **Fora de escopo**: Dashboard, Credenciamento e Ingressos continuam exclusivos do Profissional, sem nenhuma mudança — a Base nunca teve equivalente a nenhum dos três, então não há o que unificar (mesmo raciocínio que já tinha excluído Captação/Avaliação como funcionalidade na Fase 1).

## Modelo de dados

### Tabela núcleo: `jogos` (canônica, absorve `jogos_base`)

Mantém o nome `jogos`. `jogos_base` é renomeada `jogos_base_old` (backup).

**Colunas novas em `jogos`** (hoje só em `jogos_base`):
- `categoria` (`text not null`, mesmo check de 8 valores de `atletas.categoria` — `'profissional'` nas linhas existentes, valor escalar que já tinham vindo de `jogos_base`).
- `penaltis_pro` / `penaltis_contra` (`integer`, nullable) — placar de pênaltis em mata-mata, hoje só usado pela Base; fica disponível pro Profissional também (sem uso definido ainda, mesmo tratamento dado aos campos Base-only de Atletas que ficaram nullable pro Profissional).

Resto das colunas já bate campo a campo entre as duas tabelas (`competicao`, `rodada_fase`, `adversario_nome`, `adversario_logo_path`, `data_jogo`, `horario`, `local_estadio`, `endereco`, `mandante`, `gols_pro`/`gols_contra`, `concentracao_data`, `concentracao_regras`, `dia_jogo_liberacao`, `fpf_link_sumula`).

### Sub-áreas — tabelas mescladas (pares já simétricos)

Mesmo padrão da tabela núcleo em cada par abaixo: canônica mantém o nome do Profissional, absorvida vira `_old`.

| Sub-área | Canônica (mantém) | Absorvida (`_old`) | Observação |
|---|---|---|---|
| Checklist | `checklist_jogo_itens` | `checklist_jogo_itens_base` | Campo a campo idêntico. |
| Convocação | `convocacoes`, `convocacao_atletas`, `convocacao_comissao` | equivalentes `_base` | `convocacao_atletas` ganha a coluna `numero_camisa` (nullable) que só existia do lado Base — ver decisão acima sobre exibição condicional. `convocacao_staff`/`convocacao_staff_base` NÃO entram aqui — removidas antes desta fase, ver "Pré-requisito já resolvido" acima. |
| Súmula | `sumulas`, `sumula_eventos` | `sumulas_base`, `sumula_eventos_base` | Campos de terceiro tempo (`duracao_terceiro_tempo`, `acrescimo_terceiro_tempo`) já existem nas duas — passam a valer de verdade pra qualquer categoria com `numero_tempos = 3` (hoje só a Base usa isso na prática; Profissional fica disponível, sem uso). |
| Financeiro de jogo | `gastos_jogo` | `gastos_jogo_base` | Campo a campo idêntico. `categorias_gasto` já é tabela única, compartilhada — não muda. `configuracoes_financeiro`/`configuracoes_financeiro_base` (assinaturas dos relatórios) também são lidas aqui, mas são compartilhadas com o módulo Financeiro avulso (`app/financeiro/configuracoes`, `app/base/financeiro/configuracoes`) — ver pendência sobre escopo abaixo. |
| Ônibus | `onibus_lista`, `onibus_passageiros` | `onibus_lista_base`, `onibus_passageiros_base` | Campo a campo idêntico (`pessoa_id`/`pessoa_tipo` polimórfico, ver pré-requisito acima). |
| Programação (concentração/dia de jogo) | `jogo_programacao_itens` | `jogo_programacao_itens_base` | Campo a campo idêntico. **Não confundir** com a "Programação Semanal" do treinador (`/treinador`, só Base) — são dois conceitos diferentes com nome parecido; aquela é fora de escopo desta fase. |
| Recibo | `recibos_jogo` | `recibos_jogo_base` | Campo a campo idêntico (`pessoa_tipo` aqui só aceita comissão/staff — nunca teve atleta, então não tem o bug de `pessoa_id` que ônibus/rooming-list tinham). |
| Rooming-list | `rooming_list`, `rooming_list_quartos`, `rooming_list_ocupantes` | `rooming_list_base`, `rooming_list_quartos_base`, `rooming_list_ocupantes_base` | Campo a campo idêntico (mesma ressalva de `pessoa_id` polimórfico do Ônibus). |
| Vagas de Staff | `jogo_vagas_staff`, `jogo_vagas_staff_funcoes`, `jogo_vagas_staff_inscricoes` | `jogo_vagas_staff_base`, `jogo_vagas_staff_base_funcoes`, `jogo_vagas_staff_base_inscricoes` | Campo a campo idêntico. Atenção ao nome absorvido: o `_base` vem logo depois de `jogo_vagas_staff`, não no final (`jogo_vagas_staff_base_funcoes`, não `jogo_vagas_staff_funcoes_base`). |
| Presskit | sem tabela própria (gera na hora a partir de convocação + jogo + atletas) | — | Só merge de rota. |
| Relacionados | sem tabela própria (deriva de convocação) | — | Só merge de rota. |

### Fora de escopo desta fase

- **Credenciamento** (`credenciamento_catalogo`, `credenciamento_jogo`) e **Ingressos** (`ingresso_cargas`, `ingresso_solicitacoes`) — exclusivos do Profissional, sem equivalente Base; nenhuma mudança.
- **Dashboard** (`app/jogos/dashboard`) — exclusivo do Profissional, sem equivalente Base; nenhuma mudança.
- Lógica pura em `lib/futebol/` (ex.: `recibo-auto-sync.ts`, `sumula-eventos.ts`, `vagas-staff.ts`, `competicao-sumula-import.ts`) — ajustada conforme o sweep encontrar, mas sem redesenho; é trabalho mecânico de troca de referência, não de design.

## Telas

Um `/jogos` só, acessível pelos dois departamentos (mesmo padrão de `/atletas` e `/comissao-tecnica`):

- **Listagem e formulário únicos**: `jogo-form.tsx` ganha o seletor de Categoria no topo (mesmo padrão do formulário de Atletas), condicionando os campos de mata-mata (pênaltis) e, nas sub-telas, o campo de número de camisa na convocação.
- **Hub por jogo (`[id]/`)**: `jogo-tabs.tsx` e `jogo-tabs-base.tsx` viram um só, com a lista de abas condicionada por categoria — Credenciamento e Ingressos só aparecem pra jogos do Profissional; o resto das 11 abas aparece pras duas.
- **Cada uma das 11 sub-áreas**: os pares de arquivo lado a lado (ex.: `onibus-form.tsx`/`onibus-form-base.tsx`, `convocacao-form.tsx`/`convocacao-form-base.tsx`) mesclam num componente só, seguindo exatamente o padrão já usado nas 11 áreas de Atletas/Comissão Técnica (prop ou campo de categoria condicionando o que muda).
- **Telas satélite**:
  - `/area-financeira/jogos` e `/area-financeira/base/jogos` (hoje 2 rotas) viram 1, somente leitura, espelhando a tela de Financeiro do jogo sem a coluna de Ações.
  - `/treinador/jogos` mantém exatamente o recorte restrito que já tem hoje (só Convocação e Relacionados) — só reponta pras rotas unificadas, sem ganhar acesso a nenhuma aba nova.
- **Camada de PDF** (`lib/pdf/onibus-document.tsx`, `rooming-list-document.tsx`, `rooming-list-envio-document.tsx`, `recibo-document.tsx`, `dia-jogo-document.tsx`) já é compartilhada hoje (uma função só, tipada como `JogoRow`, já consumida pelas duas rotas com cast) — baixo risco, só ajustar o tipo quando `JogoRow`/`JogoBaseRow` virarem um só. `credenciamento-document.tsx` fica como está (Profissional-only).

## Riscos e pendências pra revisão

1. Nomes e colunas de todas as tabelas da tabela "Modelo de dados" acima já foram conferidos direto contra o SQL real de criação (`0001_init.sql`, `0003_convocacao.sql`, `0006_operacao_jogo.sql`, `0008_rooming_list_atletas.sql`, `0015_checklist_jogo.sql`, `0029_jogo_programacao.sql`, `0033_futebol_base_jogos_financeiro.sql`, `0042_quarto_triplo_rooming_list.sql`, `0043_fix_rooming_list_ocupantes_atleta.sql`, `0044_numero_apartamento_rooming_list.sql`, `0073_vagas_staff_jogo.sql`, `0075_vagas_staff_base.sql`) — não é mais suposição baseada só em tipos/uso em `.from(...)`. Súmula (`0053`/`0058`/`0059`/`0128`/`0139`/`0146`/`0147`) e Vagas de Staff (`0073`/`0075`) foram conferidas quanto a nome/existência, mas não tiveram todas as colunas lidas campo a campo — se a implementação encontrar alguma diferença de coluna não listada aqui, é motivo pra pausar e avisar, não pra decidir sozinho.
2. **Escopo de `configuracoes_financeiro`/`configuracoes_financeiro_base`**: essa tabela (assinaturas dos relatórios financeiros) é lida tanto pelo Financeiro de jogo (dentro desta fase) quanto pelo módulo Financeiro avulso (`/financeiro`, `/base/financeiro` — Fase 4 da lista de fases futuras). Perguntar ao Mateus: unifica essa tabela já nesta fase (é só 1 linha cada, barato) e o Financeiro avulso herda de graça quando chegar a vez dele, ou deixa como está agora e trata junto com a Fase 4 pra não adiantar trabalho de uma fase que ainda nem tem spec?
3. `convocacao_atletas.numero_camisa` (coluna nova, vinda da Base) precisa ficar nullable — Profissional nunca preenche.
4. Sweep final (`git grep -n -i "jogos_base\b\|JogoBaseRow\|_base\b" app/jogos app/base/jogos lib/futebol lib/pdf` ou equivalente) pra achar qualquer referência presa antes de considerar a fase concluída — mesmo padrão usado nas duas unificações anteriores, pedindo pro Mateus rodar no repositório real e colar o resultado completo.
5. Build local/Vercel ao final, com o mesmo cuidado de sempre (gaps de staging por profundidade no listing recursivo do device bridge já causaram um build quebrado nesta sessão).
