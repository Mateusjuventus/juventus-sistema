# Importação de súmula por link (PDF da FPF) — Futebol de Base

## Contexto

O Futebol Profissional já tem, na aba Súmula de um jogo (`app/jogos/[id]/sumula`), uma forma de
colar o link do PDF da súmula oficial publicada pela FPF (domínio `conteudo.fpf.org.br`) e deixar o
sistema ler o conteúdo, sugerir o placar e os eventos (gols, cartões, substituições) vinculados aos
atletas já convocados, e importar depois de revisão/confirmação do usuário — ver
`docs/superpowers/specs/2026-08-04-integracao-fpf-design.md`, seção "Fluxo: importar súmula da
FPF". O Futebol de Base tem hoje sua própria aba Súmula (`app/base/jogos/[id]/sumula`), espelhando
a estrutura do Profissional, mas só com lançamento manual de evento — não tem a opção de importar
por link.

Pedido do Mateus: "Preciso que tenha nos jogos da base a mesma coisa que tem no profissional da
sumula, de incluir o link. e fazer a leitura."

## Objetivo

Trazer a mesma funcionalidade de importação de súmula por link pra todos os jogos do Futebol de
Base, em todas as categorias (Sub-11 a Sub-20), sem nenhuma restrição de acesso além da que já
existe hoje pra editar a Súmula de um jogo da Base.

## Fora de escopo

- Qualquer mudança no fluxo do Profissional (`app/jogos/[id]/sumula/*`, `lib/fpf/*`) — a lógica de
  download/parsing do PDF e de sugestão de vínculo de atleta já é genérica e vai ser reaproveitada
  sem alteração.
- Sincronização automática de jogos da FPF pra Base (`fpf_id_jogo`, `fpf_sincronizado_em`,
  `fpf_config`, `fpf_sync_log` etc.) — isso é um recurso maior, à parte, que o Profissional também
  teve que desativar por bloqueio de IP (ver spec de 2026-08-04); aqui entra só o campo mínimo
  necessário pra guardar o link já importado (`fpf_link_sumula`), igual ao Profissional guarda hoje.
- Qualquer tela de vínculo de atleta da Base com a FPF (equivalente a "Elenco na FPF") — assim como
  no Profissional, o vínculo usa só quem já está na Convocação salva do jogo.

## Abordagem

Reaproveitar a infraestrutura já existente, seguindo o mesmo padrão de duplicação que o resto do
sistema já usa pra levar uma feature do Profissional pra Base (ex.: `evento-form-base.tsx` espelha
`evento-form.tsx`, `dados-jogo-form-base.tsx` espelha `dados-jogo-form.tsx`): um par novo de
arquivos dentro de `app/base/jogos/[id]/sumula/`, apontando pras tabelas da Base, sem tocar em nada
do Profissional.

`lib/fpf/sumula-pdf.ts` (download + parsing do PDF) e `lib/fpf/atleta-match.ts` (sugestão de vínculo
por nome/número de registro FPF) são 100% genéricos — não referenciam `jogos`/`atletas` nem
nenhuma tabela específica do Profissional, recebem só texto e uma lista de `{id, nome_completo,
numero_fpf}`. Não precisam de nenhuma alteração: `atletas_base` já tem a coluna `numero_fpf` no
mesmo formato de `atletas`.

**Alternativa considerada e descartada:** extrair um motor de importação único, parametrizado por
nome de tabela, compartilhado entre Profissional e Base, em vez de duplicar `importar-actions.ts`/
`importar-sumula-form.tsx`. Foi descartada porque tocaria em código do Profissional que já está em
produção e já corrigiu bugs reais (ex.: gol contra invertendo o placar sugerido — ver comentários em
`importar-actions.ts`), trocando duplicação que hoje é pequena (a lógica pesada já mora em
`lib/fpf/*`) por um risco de regressão no Profissional sem ganho real. Também fugiria do padrão que
o projeto já usa consistentemente pra Base (duplicar a camada de tela/action, reaproveitar o que é
genérico).

## Mudanças de schema

Duas colunas faltam hoje na Base pra guardar o mesmo tipo de dado que o Profissional já guarda:

- `jogos_base` não tem `fpf_link_sumula` (o Profissional tem, em `jogos`) — é onde fica salvo o
  link do PDF depois de uma importação confirmada.
- `sumula_eventos_base` não tem `nome_adversario` nem `gol_contra_favor_juventus` (o Profissional
  tem, em `sumula_eventos`) — necessários pra registrar um gol do adversário (sem atleta nosso
  vinculado) e distinguir gol normal do adversário de gol contra do adversário que favorece o
  Juventus, exatamente a mesma necessidade que motivou essas colunas no Profissional
  (`0057`/`0058_sumula_evento_gol_contra_favor.sql`).

```sql
-- supabase/migrations/0128_sumula_base_importacao_fpf.sql
-- Colunas que faltam em jogos_base/sumula_eventos_base pra suportar a importação de súmula por
-- link (PDF da FPF), espelhando o que `jogos`/`sumula_eventos` já têm no Futebol Profissional —
-- ver docs/superpowers/specs/2026-10-03-importacao-sumula-base-design.md e
-- docs/superpowers/specs/2026-08-04-integracao-fpf-design.md.
alter table public.jogos_base
  add column if not exists fpf_link_sumula text;

alter table public.sumula_eventos_base
  add column if not exists nome_adversario text,
  add column if not exists gol_contra_favor_juventus boolean not null default false;

notify pgrst, 'reload schema';
```

Nenhuma migração de dado é necessária (colunas novas, nulas/`false` por padrão, não afetam nenhuma
linha existente).

## Backend

Novo `app/base/jogos/[id]/sumula/importar-actions.ts`, espelhando
`app/jogos/[id]/sumula/importar-actions.ts` com as mesmas duas Server Actions:

- `buscarPreviaImportacaoSumulaBase(jogoId, linkPdf)` — mesma lógica de
  `buscarPreviaImportacaoSumula`, trocando as tabelas-fonte: lê `convocacoes_base`/
  `convocacao_atletas_base` (exige Convocação já salva, mesma mensagem de erro) pra montar o
  universo de candidatos, busca em `atletas_base` (`id, nome_completo, numero_fpf`), lê
  `sumulas_base` pra duração já salva dos tempos. Chama `baixarTextoSumulaPdf`/`parsearSumulaPdf`
  de `lib/fpf/sumula-pdf.ts` e `sugerirAtleta` de `lib/fpf/atleta-match.ts` sem nenhuma adaptação.
  Mesma lógica de `ehLadoJuventus`/`golFavoreceJuventus` (comparação por substring "juventus" no
  nome da equipe extraído do PDF) — não depende de categoria, só do nome do time na súmula.
- `confirmarImportacaoSumulaBase(input)` — mesma lógica de `confirmarImportacaoSumula`, gravando em
  `jogos_base` (placar + `fpf_link_sumula`), `sumulas_base` (upsert por `jogo_id`) e
  `sumula_eventos_base` (apaga e regrava os eventos confirmados, incluindo `nome_adversario`/
  `gol_contra_favor_juventus`). `revalidatePath` nas rotas da Base
  (`/base/jogos/${jogoId}/sumula`, `/base/jogos/${jogoId}`, `/base/jogos`).

Os tipos `PreviaImportacaoSumula`, `PreviaEventoImportado`, `ConfirmacaoEvento`,
`ConfirmarImportacaoInput`/`Resultado` são reaproveitados tal como estão (não têm nada específico
do Profissional) — só duplicados nesse novo arquivo pra manter o isolamento que o resto do projeto
já usa entre as duas áreas.

## Frontend

Novo `app/base/jogos/[id]/sumula/importar-sumula-form.tsx`, cópia visual de
`app/jogos/[id]/sumula/importar-sumula-form.tsx` (mesmo card "Importar da súmula oficial (PDF)",
campo de link, botão "Buscar dados da súmula", prévia com placar/duração sugeridos, lista de
eventos com caixinha de incluir/excluir e seletor de atleta, botão "Confirmar e importar"), só
trocando as duas Server Actions importadas pelas versões `*Base` do item anterior.

Em `app/base/jogos/[id]/sumula/page.tsx`, adicionar o import do novo componente e renderizá-lo no
mesmo lugar em que o Profissional renderiza o seu: logo depois de `<DadosJogoFormBase ... />` e
antes da seção "Escalação (referência)" — mesma posição de `app/jogos/[id]/sumula/page.tsx`. A
prop `atletasConvocados` vem da mesma lista de convocados (titulares + reservas) que a página já
monta hoje pra passar pro `EventoFormBase`.

## Permissões

Nenhuma checagem nova. Quem já acessa a aba Súmula de um jogo da Base hoje — via
`verificarAcessoJogoBase` (que já aplica o filtro por categoria do supervisor, quando configurado)
— já pode usar a importação por link; não existe uma régua separada pra isso no Profissional, então
a Base segue o mesmo princípio.

## Testes e verificação

- Testes unitários novos não são necessários além dos que já existem: a lógica testável
  (`lib/fpf/sumula-pdf.test.ts`, `lib/fpf/atleta-match.test.ts`) já cobre o parsing/matching
  reaproveitado sem alteração. As duas Server Actions novas (`importar-actions.ts` da Base) são, à
  semelhança do Profissional, não cobertas por teste unitário próprio (dependem de rede/Supabase);
  seguem o mesmo padrão já aceito.
- `npx tsc --noEmit`, `npx vitest run`, `npx eslint` (escopo nos arquivos alterados/criados),
  `npx next build` — todos limpos antes da entrega.
- Colar o SQL da migração `0128_sumula_base_importacao_fpf.sql` completo no chat pro Mateus rodar no
  SQL Editor do Supabase antes de testar.
- Roteiro manual sugerido pro Mateus: abrir a Súmula de um jogo da Base com Convocação já salva,
  colar o link de uma súmula real publicada pela FPF pra aquela categoria, conferir a prévia
  (placar sugerido, eventos, vínculo de atleta) e confirmar a importação; depois conferir que o
  placar do jogo e os eventos da aba Súmula refletem o que foi confirmado.

## Risco conhecido

O parser (`lib/fpf/sumula-pdf.ts`) foi calibrado em cima de súmulas reais do Profissional (Copa
Paulista/Copa São Paulo) — não há confirmação de que o layout de texto das súmulas de categorias de
base da FPF seja byte-a-byte idêntico. O parser já foi desenhado pra ser tolerante (linha que não
bate com nenhum padrão conhecido é só ignorada e contabilizada em "avisos", nunca quebra a
importação inteira), e o lançamento manual de evento continua disponível como caminho alternativo
pra qualquer coisa que o parser não reconheça — mesma rede de segurança que já existe hoje no
Profissional. Se a importação de uma súmula real de Base vier com poucos eventos reconhecidos,
isso é visível pelo aviso "N linhas não reconhecidas" e pode ser ajustado depois, sem bloquear a
entrega.
