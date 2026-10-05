# Plano de implementação — Assistência Social (módulo) e Painel de Demandas

Referência: `docs/superpowers/specs/2026-10-05-assistencia-social-e-demandas-design.md`

As duas frentes são independentes o suficiente pra entregar em pacotes separados (Mateus pode
revisar a Assistência Social sem esperar o Painel de Demandas terminar), mas compartilham a mesma
migration inicial. Por isso: uma única Fase 1 (schema), depois dois braços que não se tocam.

## Fase 1 — Migrações

Uma migration só, numerada a partir da última existente (conferir o número mais alto em
`supabase/migrations/` antes de criar — não assumir 0131 sem checar, o repo já passou de 0130).

```sql
-- Atendimentos da Assistência Social (Futebol de Base) — ver docs/superpowers/specs/
-- 2026-10-05-assistencia-social-e-demandas-design.md, Parte 1.
create table public.assistencia_social_atendimentos (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas_base(id) on delete cascade,
  data date not null,
  anotacoes text not null,
  encaminhamento text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger assistencia_social_atendimentos_set_updated_at
  before update on public.assistencia_social_atendimentos
  for each row execute function set_updated_at();

create index assistencia_social_atendimentos_atleta_id_idx
  on public.assistencia_social_atendimentos (atleta_id);

alter table public.assistencia_social_atendimentos enable row level security;
create policy "authenticated_full_access" on public.assistencia_social_atendimentos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.assistencia_social_atendimentos to authenticated;

-- Demandas por pessoa — ver Parte 2 da spec. Não reaproveita `tarefas` (categoria obrigatória não
-- se aplica aqui); 3 status (sem "solicitado", que só fazia sentido no fluxo de Tarefas).
create table public.demandas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  prazo date,
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'concluido')),
  responsavel_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger demandas_set_updated_at
  before update on public.demandas
  for each row execute function set_updated_at();

create index demandas_responsavel_id_idx on public.demandas (responsavel_id);
create index demandas_status_idx on public.demandas (status);

alter table public.demandas enable row level security;
create policy "authenticated_full_access" on public.demandas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.demandas to authenticated;

-- Quem o Mateus acompanha no painel de Demandas — mesmo padrão de `fisioterapia_pode_editar`
-- (checkbox único em /usuarios).
alter table public.perfis
  add column if not exists demandas_acompanhado boolean not null default false;

notify pgrst, 'reload schema';
```

**Checagem**: colar o SQL completo no chat pro Mateus rodar no SQL Editor do Supabase antes de
qualquer teste manual das fases seguintes.

## Braço A — Módulo Assistência Social

### Fase A1 — Permissão e esqueleto da rota

- `lib/auth/modulos-base.ts`: nova chave `"assistencia_social"` em `ModuloBaseChave`, nova entrada
  em `MODULOS_BASE` (`{ chave: "assistencia_social", label: "Assistência Social", prefixo:
  "/base/assistencia-social" }`). O middleware (`lib/supabase/middleware.ts`) e a sidebar
  (`components/app-shell.tsx`) já resolvem a permissão sozinhos a partir dessa lista — nenhuma
  mudança extra nesses dois arquivos.
- `app/usuarios/page.tsx`/`actions.ts`: nada a fazer aqui além do que já existe — o checkbox novo
  aparece automaticamente na seção "Módulos do Futebol de Base" (ela já itera `MODULOS_BASE`).

### Fase A2 — Listagem de atletas

- `app/base/assistencia-social/page.tsx`: busca atletas da Base ativos (mesma query-base de
  `app/departamento-medico/fisioterapia/page.tsx`), monta `AtletaCardDados` com `cpf: null`,
  `tipoContrato: null`, `dataFimContrato: null` (esconde contrato, mesmo tratamento da
  Fisioterapia) — reaproveita `AtletaCard`/`AtletaCardDados` de `components/atletas/atleta-card.tsx`,
  não cria um card novo.
- Busca com nome (reaproveitar o padrão de busca client-side já usado em
  `fisioterapia-listagem.tsx`, se for Client Component separado, ou adaptar
  `AtletasResumoFiltros` num modo reduzido — decidir na hora olhando qual dá menos código
  duplicado).
- Clicar no card leva pra `/base/assistencia-social/[id]`.

### Fase A3 — Ficha do atleta e atendimentos

- `app/base/assistencia-social/[id]/page.tsx`: cabeçalho com os dados sociais do atleta (nome,
  apelido, nascimento, telefone, cidade natal/UF, escola, alojado, nome/telefone da mãe e do pai,
  alergias — ver lista exata na spec), lista de atendimentos (`assistencia_social_atendimentos`,
  mais recente primeiro), botão "Registrar atendimento".
- `app/base/assistencia-social/[id]/atendimento-form.tsx` + `actions.ts`: formulário (data,
  anotações, encaminhamento opcional) — Server Action simples, mesmo padrão de outros formulários do
  sistema (`zod` em `lib/validation/schemas.ts`, erro de campo inline).
- Teste unitário do schema de validação (data obrigatória, anotações obrigatórias, encaminhamento
  opcional).

### Fase A4 — Parecer Social (PDF)

- `lib/pdf/parecer-social-document.tsx`: reaproveita `logistica-shared.tsx`
  (`DocumentoFooter`, `AssinaturasBlockDinamico`, `sharedStyles`, `CORES`) — cabeçalho com dados do
  atleta, corpo com o histórico de atendimentos (data + anotações + encaminhamento, em ordem
  cronológica), bloco de assinatura única (Assistente Social).
- `app/base/assistencia-social/[id]/parecer/route.tsx`: monta os dados e chama
  `autoAssinarComoCreator` (`lib/assinaturas/actions.ts`) pra assinar automaticamente com quem está
  gerando — mesmo mecanismo do Relatório de Dispensa do Treinador
  (`app/treinador/atletas/[id]/dispensa/actions.ts`), sem fluxo de aprovação de terceiros (fora de
  escopo, conforme a spec).
- Teste do documento (igual aos outros `*-document.test.ts` já existentes): renderiza sem erro com
  dados de exemplo, incluindo o caso sem nenhum atendimento ainda.

**Checagem do Braço A**: criar um usuário de teste com "Assistência Social" liberado, ver a
listagem (sem CPF/contrato nos cards), abrir um atleta, registrar 2-3 atendimentos, gerar o PDF do
Parecer Social e conferir visualmente (cabeçalho, histórico, assinatura).

## Braço B — Painel de Demandas

### Fase B1 — Componentes de status e CRUD de demandas

- `components/demanda-status.tsx`: `DemandaStatusBadge`/`DemandaStatusSelect`, mesmo padrão visual
  de `components/tarefa-status.tsx` mas com os 3 status de `demandas` (sem "solicitado").
- `lib/validation/schemas.ts`: `demandaSchema` (`titulo` obrigatório, `descricao`/`prazo`
  opcionais) + `DEMANDA_STATUS` (`pendente`/`em_andamento`/`concluido`).
- `app/minhas-demandas/actions.ts`: `criarDemanda`, `updateDemandaStatus`, `deleteDemanda` —
  sempre com `responsavel_id = auth.uid()` (nunca recebido do form), espelhando
  `app/tarefas/actions.ts`. Sem action de "criar demanda pra outra pessoa" (fora de escopo).
- Teste unitário do schema.

### Fase B2 — Tela cheia "Minhas Demandas"

- `app/minhas-demandas/page.tsx`: lista as demandas do usuário logado (abertas primeiro, depois
  "Concluídas" num `<details>` recolhível — mesmo padrão de `app/tarefas/page.tsx`). Acessível a
  qualquer usuário logado (não só quem tem `demandas_acompanhado = true` — ela só não aparece na
  sidebar/widget de quem não é acompanhado, mas a URL funciona pra quem quiser usar por conta
  própria).
- Link "Minhas Demandas" no grupo "Geral" da sidebar (`components/app-sidebar.tsx`, ao lado de
  Tarefas/Documentos Pendentes) — visível só quando `demandas_acompanhado` do usuário logado é
  `true` (precisa passar essa flag adiante a partir de `AppShell`, que já busca o perfil completo em
  outros pontos).

### Fase B3 — Widget "Minhas Demandas" na tela inicial

- `components/demandas/minhas-demandas-widget.tsx`: Server Component que busca as demandas abertas
  do usuário logado, renderiza até ~5 com status inline (`DemandaStatusSelect`) e um mini-form pra
  adicionar uma nova (título + prazo opcional) sem sair da tela — mesmo espírito dos widgets que já
  existem em `app/profissional/page.tsx` (`CalendarioWidget`, `MuralWidget`). Link "ver tudo" pra
  `/minhas-demandas` quando houver mais do que as exibidas.
- `app/profissional/page.tsx` e `app/base/page.tsx`: inserir o widget no topo, só quando
  `demandas_acompanhado` do usuário logado for `true` — busca essa flag junto com o resto dos dados
  da página (uma query a mais em `perfis`, ou reaproveitar o que `getPerfilPermissoes`
  (`lib/auth/role.ts`) já carrega, estendendo o tipo/select de lá em vez de duplicar a query).

### Fase B4 — Toggle "acompanhado" em `/usuarios`

- `app/usuarios/actions.ts`: nova action `atualizarDemandasAcompanhado`, mesmo padrão exato de
  `atualizarFisioterapiaPodeEditar` (só master, grava via `createAdminClient()`).
- `app/usuarios/page.tsx`: novo checkbox único "Acompanhar no painel de Demandas"
  (`PermissaoCheckboxesForm` com uma opção só, `valoresIniciais={perfil.demandas_acompanhado ?
  ["sim"] : []}`), ao lado dos demais controles de permissão de cada perfil.

### Fase B5 — Painel do Mateus (`/demandas`)

- `lib/demandas/rendimento.ts` (novo, puro/testável): dado um array de `demandas` de uma pessoa e a
  data de hoje, calcula `{ percentualHoje, percentualSemana, pendentes, atrasadas,
  concluidasUltimos30Dias }` — exatamente as 5 métricas da spec. Função pura, sem Supabase, pra
  testar fácil com dados de exemplo.
- Teste unitário cobrindo os casos de borda: demanda sem prazo (não entra no cálculo de % hoje/
  semana), prazo futuro (não entra em "hoje"), atrasada não concluída, concluída fora da janela de
  30 dias.
- `app/demandas/page.tsx`: só master (redirect/404 pra quem não é). Busca perfis com
  `demandas_acompanhado = true`, pra cada um busca as demandas (`responsavel_id = perfil.id`) e a
  foto/função — vínculo com a Comissão Técnica quando existir
  (`comissao_tecnica_id`/`comissao_tecnica_base_id`, igual a `resolverNomeCargoParaAssinatura` em
  `lib/assinaturas/nome-cargo.ts`, mas também puxando `foto_path`), senão `perfis.cargo` e um avatar
  de iniciais (`lib/futebol/avatar-cor.ts`).
- `components/demandas/pessoa-acompanhada-card.tsx`: card por pessoa (foto, nome, função, as 5
  métricas, lista curta das pendências) — grid responsivo lado a lado.
- Link "Demandas" na sidebar, grupo "Geral", só pra master.

**Checagem do Braço B**: marcar 2 usuários de teste como acompanhados, logar como cada um, ver o
widget na tela inicial, adicionar/concluir demandas por ali e pela tela cheia, depois conferir como
master que `/demandas` mostra os dois cards com os números batendo.

## Fase final — Verificação e entrega

- `npx tsc --noEmit`, `npx vitest run`, `npx eslint`, `npx next build` limpos.
- Checagem visual dos dois braços conforme os roteiros manuais acima.
- Sincronizar os arquivos alterados na pasta local do Mateus (`C:\Users\mateu\Documents\Projeto
  Juventus - Profissional\repo-atual`, via device bridge) e passar o comando de `git push` pra ele
  rodar do lado dele.
- Explicar pro Mateus, em português simples, o que mudou e onde encontrar cada coisa nova.

## Ordem de entrega sugerida

1. **Fase 1** (migrações) — SQL único, roda antes de tudo.
2. **Braço A** (Assistência Social) — fecha sozinho, não depende do Braço B.
3. **Braço B** (Demandas) — fases B1→B5 em sequência (cada uma depende da anterior: componentes →
   tela cheia → widget → toggle de quem é acompanhado → painel do Mateus, que só faz sentido depois
   que já existe gente acompanhada gerando dados).

Os dois braços podem ser entregues em commits/revisões separados, já que resolvem pedidos
independentes do Mateus.
