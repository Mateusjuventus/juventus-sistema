# Assistência Social (módulo) e Painel de Demandas

## Contexto

Duas frentes pedidas juntas pelo Mateus, confirmadas em brainstorming (uma pergunta por vez):

1. Ele quer dar acesso ao sistema pra uma Assistente Social, mas não sabia se isso devia ser uma
   área própria (como `/treinador`) ou um módulo dentro da estrutura já existente.
2. Ele quer acompanhar o "rendimento" de pessoas específicas (supervisores, a assistente social) —
   um cadastro de quem ele acompanha, uma tela onde cada pessoa registra suas próprias demandas, e
   um painel seu com um card por pessoa, lado a lado.

## Parte 1 — Módulo "Assistência Social" (Futebol de Base)

### Por que módulo, não área própria

Confirmado com o Mateus: a Assistente Social vai registrar atendimentos no dia a dia **e** gerar
pareceres formais, atende só atletas do Futebol de Base, e pode eventualmente também precisar do
módulo Solicitações. Como ela vai ter uma conta normal da Base (não uma experiência à parte como o
Treinador), dar acesso a Solicitações já funciona hoje, de graça — é só marcar o checkbox dela em
`/usuarios`, sem precisar de nada novo.

Isso segue exatamente o padrão já usado pelo Departamento Médico/Fisioterapia
(`lib/auth/modulos-base.ts`, `app/departamento-medico/fisioterapia/`): um módulo novo, liberável por
checkbox em `/usuarios`, aparecendo na sidebar de quem tiver.

- Nova chave `assistencia_social` em `ModuloBaseChave` (`lib/auth/modulos-base.ts`), rota
  `/base/assistencia-social`, label "Assistência Social".
- Entra na lista `MODULOS_BASE`, liberável por checkbox em `/usuarios` igual aos demais módulos da
  Base.

### O que ela vê do atleta

Mesmo critério de restrição já usado pela Fisioterapia (que também esconde CPF e dados de contrato):
foto, nome, apelido, data de nascimento, telefone, categoria, cidade natal/UF, escola, se mora no
alojamento, nome e telefone da mãe e do pai, alergias/observações de saúde.

Fica de fora: CPF, RG, dados de contrato (tipo, datas, empresário, agência, valor de ajuda de
custo) — segue o mesmo tratamento de `app/departamento-medico/fisioterapia/page.tsx`, que já zera
esses campos no tipo `AtletaCardDados` antes de montar os cards.

### Telas

- **Listagem** (`/base/assistencia-social`): cards dos atletas da Base (foto, nome, apelido,
  categoria), busca por nome — mesmo visual de `app/departamento-medico/fisioterapia/page.tsx`.
- **Ficha do atleta** (`/base/assistencia-social/[id]`): histórico de atendimentos, mais recente
  primeiro, com botão "Registrar atendimento" (data, anotações, encaminhamento — texto livre).
- **Parecer Social** (PDF): gerado a partir do histórico de atendimentos daquele atleta, a qualquer
  momento, com a assinatura da Assistente Social — segue o padrão visual já estabelecido em
  `lib/pdf/` (cabeçalho/rodapé compartilhados, bloco de assinatura).

### Dados

Nova tabela `assistencia_social_atendimentos`: `id`, `atleta_id` (referência a `atletas_base`),
`data`, `anotacoes`, `encaminhamento` (nullable), `created_by` (quem registrou), `created_at`,
`updated_at`. RLS no mesmo padrão já usado no resto do sistema (`authenticated_full_access` — a
permissão de verdade é resolvida em código, pelo módulo liberado).

## Parte 2 — Painel de Demandas

### Conceito

Uma extensão do que já existe em Tarefas (título, prazo, status), mas organizada por **pessoa** em
vez de por categoria. Cada demanda pertence a quem está logado e a registrou — a pessoa acompanhada
mexe nas próprias demandas, do mesmo jeito que já usa o resto do sistema (confirmado: "esse login
não é à parte, é o mesmo que ela acessa as demais coisas").

Não reaproveita a tabela `tarefas` existente porque ela tem `categoria` obrigatória
(Logística/Registro/Financeiro/Solicitações/Gerais, com `check` no banco) — um conceito que não se
aplica aqui. Uma tabela nova, mais simples (3 status em vez de 4 — sem "solicitado", que só fazia
sentido pro fluxo de Tarefas) evita forçar esse encaixe.

### Quem é acompanhado

Em vez de um cadastro paralelo, o Mateus marca quem acompanhar direto na lista de usuários que já
existe. Nova coluna booleana em `perfis` (`demandas_acompanhado`, default `false`), com um toggle em
`/usuarios` — mesmo padrão de `departamentos_permitidos`/`modulos_permitidos` (só quem é master
define).

### Tabela `demandas`

`id`, `titulo` (not null), `descricao` (nullable), `prazo` (date, nullable), `status` (`pendente` |
`em_andamento` | `concluido`, default `pendente`), `responsavel_id` (uuid, not null, referência a
`auth.users` — sempre quem está logado ao criar), `created_at`, `updated_at`. RLS
`authenticated_full_access`, mesmo padrão do resto do sistema.

### Onde a pessoa preenche — widget na tela inicial

Confirmado com o Mateus: precisa ser fácil e sempre visível, não uma tela a mais pra lembrar de
abrir. Quem tem `demandas_acompanhado = true` ganha um bloco novo no topo da própria tela inicial do
departamento (`app/profissional/page.tsx` ou `app/base/page.tsx`, dependendo de onde ela está
logada) — mesmo padrão dos widgets que já existem lá (`CalendarioWidget`, `MuralWidget` no
Profissional; a Base ganha o bloco acima da Programação Semanal).

O widget (`components/demandas/minhas-demandas-widget.tsx`) lista as demandas em aberto dela,
permite marcar como concluída ali mesmo e tem um campo rápido pra adicionar uma nova — sem precisar
navegar pra outro lugar. Um link "ver tudo" leva pra uma tela cheia (`/minhas-demandas`) com o
histórico completo (inclusive as já concluídas), pra quando a lista crescer.

### Painel do Mateus

Nova tela `/demandas`, só pra master. Busca todos os perfis com `demandas_acompanhado = true` e
monta um card por pessoa, lado a lado (grid responsivo, mesmo espírito dos cards de atleta já usados
no sistema):

- **Foto**: se o perfil tiver vínculo com a Comissão Técnica (`comissao_tecnica_id` ou
  `comissao_tecnica_base_id` — ver `supabase/migrations/0107_perfis_vinculo_comissao_tecnica.sql`),
  busca a foto de lá. Sem vínculo, cai num avatar genérico (iniciais, mesmo padrão de
  `lib/futebol/avatar-cor.ts`).
- **Função/cargo**: mesma fonte (vínculo da Comissão Técnica quando existir, senão `perfis.cargo`).
- **Números**, calculados a partir das `demandas` dela:
  - % concluído **hoje**: das demandas com prazo até hoje (inclui atrasadas), quantas % estão
    concluídas.
  - % concluído na **semana**: mesmo cálculo, olhando as demandas com prazo nos últimos 7 dias.
  - Pendências em aberto: contagem de status ≠ concluído.
  - Atrasadas: contagem de status ≠ concluído com prazo < hoje.
  - Total concluído: contagem de concluídas nos últimos 30 dias (não o total histórico, pra não
    virar um número que só cresce).

## Fora de escopo (por ora)

- Mateus não cria/edita demandas pelas outras pessoas — cada uma mexe só na própria.
- Sem aprovação/fluxo de assinatura nas demandas (diferente das Tarefas, que também não têm isso
  hoje).
- O Parecer Social não entra no fluxo formal de assinatura de terceiros (como o Parecer do
  Treinador) — é assinado só pela Assistente Social, documento dela.
- Sem notificação/push quando uma demanda fica atrasada — pode entrar depois, se fizer falta.

## Arquivos críticos

- `lib/auth/modulos-base.ts` (nova chave `assistencia_social`)
- `app/base/assistencia-social/page.tsx`, `app/base/assistencia-social/[id]/page.tsx`,
  `app/base/assistencia-social/[id]/atendimento-form.tsx`, rota de PDF do Parecer Social
- `supabase/migrations/` — nova migration pra `assistencia_social_atendimentos`
- `supabase/migrations/` — nova migration pra `demandas` + coluna `perfis.demandas_acompanhado`
- `app/usuarios/usuario-form.tsx`, `app/usuarios/actions.ts`, `app/usuarios/page.tsx` (toggle de
  acompanhamento)
- `components/demandas/minhas-demandas-widget.tsx` (novo)
- `app/minhas-demandas/page.tsx` (novo, histórico completo)
- `app/demandas/page.tsx` (novo, painel do Mateus)
- `app/profissional/page.tsx`, `app/base/page.tsx` (inserir o widget)

## Verificação

- Testes novos (vitest): cálculo dos números de rendimento (% hoje, % semana, atrasadas, total
  concluído) com dados de exemplo cobrindo os casos de borda (demanda sem prazo, prazo futuro,
  atrasada, concluída fora do período).
- `npx tsc --noEmit`, `npx vitest run`, `npx eslint`, `npx next build` limpos.
- Roteiro manual (dados de teste, sandbox não conecta no Supabase real):
  - Criar um usuário com o módulo Assistência Social liberado: ver a listagem de atletas da Base
    (sem CPF/contrato), registrar um atendimento, gerar o Parecer Social em PDF.
  - Marcar esse mesmo usuário (ou outro) como acompanhado em `/usuarios`: ver o widget de Minhas
    Demandas aparecer na tela inicial dela, adicionar/concluir uma demanda por ali.
  - Como master, ver o card dela aparecer em `/demandas`, com os números batendo com o que foi
    cadastrado.
- Colar o SQL das migrações novas no chat pro Mateus rodar no SQL Editor do Supabase antes de
  qualquer teste manual.
