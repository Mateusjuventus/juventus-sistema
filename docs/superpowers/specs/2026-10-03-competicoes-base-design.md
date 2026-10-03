# Módulo de Competições para o Futebol de Base

## Contexto

O Futebol Profissional tem um módulo completo de Competições (`/competicoes`, ver
`docs/superpowers/specs/2026-08-10-competicoes-design.md`): estrutura Temporada → Competição →
Fases → Grupos → (equipes/jogos vinculados), com classificação calculada, disciplina (cartões/
suspensões derivados da Súmula + suspensão manual), inscritos, análise de adversários, condição de
jogo por atleta, prazos, documentos e 6 relatórios em PDF. O Futebol de Base não tem nada disso
hoje — o único módulo relacionado a jogos é "Jogos / Competições" (rótulo já deixado assim de
propósito), e o campo "Competição" na aba Dados do Jogo de um jogo da Base é texto livre, sem
nenhum vínculo com um cadastro.

Pedido original do Mateus, ao mostrar a tela de edição de um jogo Sub-12: "a parte da competição
agora, será algo selecionável de acordo com as competições cadastradas." Na conversa de
brainstorming, confirmou que quer o módulo inteiro espelhado pra Base, não só o campo.

## Objetivo

Levar o módulo de Competições pro Futebol de Base, espelhando 100% o que já existe no Profissional
— mesmas telas, mesmas regras de negócio, schema próprio (`_base`) — e, diferente do Profissional,
fazer o campo "Competição" da aba Dados do Jogo virar um select vindo desse cadastro, já vinculando
o jogo à competição no momento da criação.

## Decisões já confirmadas com o Mateus

- Módulo inteiro de uma vez (as 25 telas do Profissional), não só o cadastro básico.
- Temporadas da Base são uma lista própria, separada das Temporadas do Profissional.
- Uma competição da Base é sempre de **uma única categoria** (sub11 a sub20) — não existe
  competição multi-categoria (ex.: "Paulista Sub-11/12" viraria dois cadastros).
- O campo Competição na aba Dados do Jogo da Base vira um select, filtrado pela categoria do jogo,
  e vincula a competição já na criação/edição do jogo (diferente do Profissional, onde isso
  continua manual, feito depois dentro do módulo).
- Competições é um módulo próprio da Base, com permissão independente em `/usuarios` — mesma
  separação que já existe no Profissional entre "Jogos" e "Competições".

## Fora de escopo

- Qualquer mudança no módulo do Profissional (`app/competicoes/*`, `lib/futebol/competicao-*.ts`,
  `lib/pdf/competicao-documents.tsx`) — tudo isso é reaproveitado como está ou espelhado, nunca
  alterado.
- Mural da Home e página `/avisos` agregando os alertas das competições da Base — essa superfície
  é hoje exclusiva do Profissional (a Home da Base não tem Mural). A aba "Alertas" de cada
  competição da Base funciona normalmente (lê uma função pura, sem depender do Mural), só não
  aparece agregada em lugar nenhum fora dela. Extensão futura, se pedida.
- Mudar o campo Competição do Profissional pra select — ele continua texto livre, como é hoje.

## Abordagem

Mesmo padrão de duplicação que o resto do sistema usa pra levar uma feature do Profissional pra
Base: tabelas novas com sufixo `_base`, e cada um dos 25 arquivos de `app/competicoes/` ganha um
equivalente em `app/base/competicoes/`, apontando pras tabelas `_base`. As partes de `lib/` que já
são puras (sem Supabase, sem nada hard-coded de Profissional) são reaproveitadas sem nenhuma cópia:

| Arquivo | Reaproveitado como está? |
|---|---|
| `lib/futebol/competicao-classificacao.ts` | Sim — cálculo puro de tabela/classificação |
| `lib/futebol/competicao-desempate.ts` | Sim — critérios de desempate, puro |
| `lib/futebol/competicao-disciplina.ts` | Sim — motor de cartão→suspensão→condição, puro |
| `lib/futebol/competicao-sumula-import.ts` | Sim — parsing/matching de nome de equipe, puro |
| `lib/pdf/competicao-documents.tsx` | Sim — 6 componentes de PDF, só recebem props tipadas |
| `lib/fpf/sumula-pdf.ts` | Sim — já reaproveitado também pela súmula da Base |
| `lib/futebol/competicao-query.ts` | **Não** — tem `jogos`/`atletas`/`sumulas`/`sumula_eventos` hard-coded; ganha uma versão `lib/futebol/competicao-query-base.ts` trocando essas 4 tabelas pelas `_base` |
| `lib/futebol/competicao-avisos.ts` | `avisosDaCompeticao` (puro) é reaproveitado pela aba Alertas; `carregarAvisosCompeticoes` (hard-coded Profissional, usado só pelo Mural) não é portado — ver "Fora de escopo" |

## Modelo de dados

Uma migration só, espelhando as tabelas finais do módulo (pós `0063`–`0067`), com duas mudanças
deliberadas: `categoria` de `competicoes_base` vira uma categoria única da Base (check constraint,
em vez do texto livre "Profissional" de hoje), e as FKs pra `jogos`/`atletas` passam a apontar pras
tabelas `_base`.

```sql
-- supabase/migrations/0130_competicoes_base.sql
-- Módulo de Competições para o Futebol de Base — espelha supabase/migrations/0063 a 0067
-- (público `competicoes`) com sufixo `_base`, ver
-- docs/superpowers/specs/2026-10-03-competicoes-base-design.md. Duas diferenças deliberadas:
-- `competicoes_base.categoria` é uma categoria única da Base (não texto livre — uma competição
-- nunca cobre mais de uma categoria), e as FKs que no Profissional apontam pra `jogos`/`atletas`
-- aqui apontam pras tabelas `_base`.

create table public.temporadas_base (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.competicoes_base (
  id uuid primary key default gen_random_uuid(),
  temporada_id uuid not null references public.temporadas_base(id),
  nome text not null,
  federacao text,
  categoria text not null check (categoria in ('sub20','sub17','sub15','sub14','sub13','sub12','sub11')),
  data_inicio date,
  data_termino date,
  status text not null default 'planejada' check (status in ('planejada', 'em_andamento', 'encerrada')),
  regulamento_path text,
  observacoes text,
  regra_amarelos_suspensao integer not null default 3 check (regra_amarelos_suspensao >= 1),
  regra_jogos_suspensao_amarelos integer not null default 1 check (regra_jogos_suspensao_amarelos >= 1),
  regra_jogos_suspensao_vermelho integer not null default 1 check (regra_jogos_suspensao_vermelho >= 1),
  regra_observacoes text,
  criterios_desempate text[] not null default array[
    'vitorias', 'saldo', 'gols_pro', 'menos_vermelhos', 'menos_amarelos', 'sorteio'
  ],
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger competicoes_base_set_updated_at
before update on public.competicoes_base
for each row execute function set_updated_at();

create index competicoes_base_temporada_idx on public.competicoes_base (temporada_id);

create table public.competicao_fases_base (
  id uuid primary key default gen_random_uuid(),
  competicao_id uuid not null references public.competicoes_base(id) on delete cascade,
  nome text not null,
  ordem integer not null default 0,
  status text not null default 'aguardando' check (status in ('aguardando', 'em_andamento', 'encerrada')),
  zerar_cartoes_ao_encerrar boolean not null default false,
  criterios_desempate text[],
  created_at timestamptz not null default now()
);

create index competicao_fases_base_competicao_idx on public.competicao_fases_base (competicao_id, ordem);

create table public.competicao_grupos_base (
  id uuid primary key default gen_random_uuid(),
  fase_id uuid not null references public.competicao_fases_base(id) on delete cascade,
  nome text not null,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index competicao_grupos_base_fase_idx on public.competicao_grupos_base (fase_id, ordem);

create table public.competicao_grupo_equipes_base (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.competicao_grupos_base(id) on delete cascade,
  nome text,
  origem_grupo_id uuid references public.competicao_grupos_base(id) on delete cascade,
  origem_posicao integer check (origem_posicao is null or origem_posicao >= 1),
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  check (nome is not null or (origem_grupo_id is not null and origem_posicao is not null))
);

create index competicao_grupo_equipes_base_grupo_idx on public.competicao_grupo_equipes_base (grupo_id, ordem);

create table public.competicao_jogos_base (
  id uuid primary key default gen_random_uuid(),
  competicao_id uuid not null references public.competicoes_base(id) on delete cascade,
  jogo_id uuid not null unique references public.jogos_base(id) on delete cascade,
  fase_id uuid references public.competicao_fases_base(id) on delete set null,
  grupo_id uuid references public.competicao_grupos_base(id) on delete set null,
  cartoes_amarelos_adversario integer not null default 0 check (cartoes_amarelos_adversario >= 0),
  cartoes_vermelhos_adversario integer not null default 0 check (cartoes_vermelhos_adversario >= 0),
  sumula_link text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index competicao_jogos_base_competicao_idx on public.competicao_jogos_base (competicao_id);

create table public.competicao_grupo_resultados_base (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.competicao_grupos_base(id) on delete cascade,
  equipe_casa text not null,
  equipe_fora text not null,
  gols_casa integer not null check (gols_casa >= 0),
  gols_fora integer not null check (gols_fora >= 0),
  data_jogo date,
  rodada text,
  sumula_path text,
  sumula_link text,
  cartoes_amarelos_casa integer not null default 0 check (cartoes_amarelos_casa >= 0),
  cartoes_amarelos_fora integer not null default 0 check (cartoes_amarelos_fora >= 0),
  cartoes_vermelhos_casa integer not null default 0 check (cartoes_vermelhos_casa >= 0),
  cartoes_vermelhos_fora integer not null default 0 check (cartoes_vermelhos_fora >= 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index competicao_grupo_resultados_base_grupo_idx on public.competicao_grupo_resultados_base (grupo_id);

create table public.competicao_inscricoes_base (
  id uuid primary key default gen_random_uuid(),
  competicao_id uuid not null references public.competicoes_base(id) on delete cascade,
  atleta_id uuid not null references public.atletas_base(id) on delete cascade,
  lista text check (lista in ('A', 'B')),
  data_inscricao date not null default current_date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (competicao_id, atleta_id)
);

create index competicao_inscricoes_base_competicao_idx on public.competicao_inscricoes_base (competicao_id);

create table public.competicao_suspensoes_manuais_base (
  id uuid primary key default gen_random_uuid(),
  competicao_id uuid not null references public.competicoes_base(id) on delete cascade,
  atleta_id uuid not null references public.atletas_base(id) on delete cascade,
  origem text not null default 'decisao_disciplinar' check (origem in ('cartao', 'decisao_disciplinar', 'outro')),
  motivo text not null,
  jogos_suspensao integer not null default 1 check (jogos_suspensao >= 1),
  data_decisao date not null default current_date,
  observacoes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index competicao_suspensoes_manuais_base_competicao_idx
  on public.competicao_suspensoes_manuais_base (competicao_id);

create table public.competicao_prazos_base (
  id uuid primary key default gen_random_uuid(),
  competicao_id uuid not null references public.competicoes_base(id) on delete cascade,
  titulo text not null,
  data_inicio date,
  data_fim date not null,
  concluido boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index competicao_prazos_base_competicao_idx on public.competicao_prazos_base (competicao_id, data_fim);

create table public.competicao_documentos_base (
  id uuid primary key default gen_random_uuid(),
  competicao_id uuid not null references public.competicoes_base(id) on delete cascade,
  nome text not null,
  arquivo_path text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index competicao_documentos_base_competicao_idx on public.competicao_documentos_base (competicao_id);

-- RLS (mesmo padrão de 0063: acesso total pra qualquer usuário autenticado)

alter table public.temporadas_base enable row level security;
alter table public.competicoes_base enable row level security;
alter table public.competicao_fases_base enable row level security;
alter table public.competicao_grupos_base enable row level security;
alter table public.competicao_grupo_equipes_base enable row level security;
alter table public.competicao_jogos_base enable row level security;
alter table public.competicao_grupo_resultados_base enable row level security;
alter table public.competicao_inscricoes_base enable row level security;
alter table public.competicao_suspensoes_manuais_base enable row level security;
alter table public.competicao_prazos_base enable row level security;
alter table public.competicao_documentos_base enable row level security;

create policy "authenticated_full_access" on public.temporadas_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicoes_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_fases_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_grupos_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_grupo_equipes_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_jogos_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_grupo_resultados_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_inscricoes_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_suspensoes_manuais_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_prazos_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.competicao_documentos_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.temporadas_base to authenticated;
grant select, insert, update, delete on public.competicoes_base to authenticated;
grant select, insert, update, delete on public.competicao_fases_base to authenticated;
grant select, insert, update, delete on public.competicao_grupos_base to authenticated;
grant select, insert, update, delete on public.competicao_grupo_equipes_base to authenticated;
grant select, insert, update, delete on public.competicao_jogos_base to authenticated;
grant select, insert, update, delete on public.competicao_grupo_resultados_base to authenticated;
grant select, insert, update, delete on public.competicao_inscricoes_base to authenticated;
grant select, insert, update, delete on public.competicao_suspensoes_manuais_base to authenticated;
grant select, insert, update, delete on public.competicao_prazos_base to authenticated;
grant select, insert, update, delete on public.competicao_documentos_base to authenticated;

-- Storage: bucket próprio da Base (não compartilha com competicao-documentos do Profissional).
-- Convenção de path: competicao-documentos-base/<competicao_documento_id>/<arquivo>

insert into storage.buckets (id, name, public)
values ('competicao-documentos-base', 'competicao-documentos-base', false)
on conflict (id) do nothing;

create policy "authenticated_read_competicao_documentos_base" on storage.objects
  for select using (bucket_id = 'competicao-documentos-base' and auth.role() = 'authenticated');
create policy "authenticated_insert_competicao_documentos_base" on storage.objects
  for insert with check (bucket_id = 'competicao-documentos-base' and auth.role() = 'authenticated');
create policy "authenticated_update_competicao_documentos_base" on storage.objects
  for update using (bucket_id = 'competicao-documentos-base' and auth.role() = 'authenticated');
create policy "authenticated_delete_competicao_documentos_base" on storage.objects
  for delete using (bucket_id = 'competicao-documentos-base' and auth.role() = 'authenticated');

-- Módulo novo "Competições" liberado pra todo mundo que já tem acesso ao Futebol de Base hoje
-- (mesmo espírito de 0063: a chegada de um módulo novo nunca tira acesso de ninguém).

alter table public.perfis
  alter column modulos_base_permitidos set default array[
    'atletas',
    'comissao_tecnica',
    'staff_operacional',
    'jogos',
    'competicoes',
    'solicitacoes',
    'estoque',
    'financeiro',
    'relatorios_avulso',
    'captacao',
    'alojamento'
  ];

update public.perfis
  set modulos_base_permitidos = array_append(modulos_base_permitidos, 'competicoes')
  where modulos_base_permitidos is not null
    and not ('competicoes' = any(modulos_base_permitidos));

notify pgrst, 'reload schema';
```

## Tipos (`lib/supabase/types.ts`)

Uma interface nova pra cada uma das 11 tabelas acima, espelhando exatamente `TemporadaRow`,
`CompeticaoRow` (trocando `categoria: string` por `categoria: CategoriaBase`),
`CompeticaoComTemporadaRow`, `CompeticaoFaseRow`, `CompeticaoGrupoRow`,
`CompeticaoGrupoEquipeRow`, `CompeticaoJogoRow`, `CompeticaoGrupoResultadoRow`,
`CompeticaoInscricaoRow`, `CompeticaoSuspensaoManualRow`, `CompeticaoPrazoRow`,
`CompeticaoDocumentoRow` — com sufixo `Base` no nome (`TemporadaBaseRow`, `CompeticaoBaseRow`
etc.), reaproveitando os tipos `CompeticaoStatus`/`CompeticaoFaseStatus`/
`CompeticaoListaInscricao`/`CompeticaoSuspensaoOrigem` (são só uniões de string, servem pros dois).

## Módulo, menu e permissões

- `lib/auth/modulos-base.ts`: nova chave `"competicoes"` em `ModuloBaseChave`, nova entrada em
  `MODULOS_BASE`: `{ chave: "competicoes", label: "Competições", prefixo: "/base/competicoes" }`.
- Ícone: `components/app-sidebar.tsx` **não precisa de nenhuma mudança** — `SidebarIconKey` já é
  `ModuloChave | "usuarios" | "captacao" | "alojamento"`, e `ModuloChave` (Profissional) já inclui
  `"competicoes"` mapeado pra `IconCompeticoes` em `ICONES`. Como a chave nova da Base usa o mesmo
  literal `"competicoes"`, o mapa de ícones já resolve sozinho.
- `app/usuarios/` ganha o checkbox "Competições" na seção "Módulos do Futebol de Base" (já
  reaproveita `MODULOS_BASE` automaticamente, sem código extra).
- `lib/supabase/middleware.ts` já bloqueia por prefixo via `moduloBaseDaRota` — funciona sozinho
  assim que `/base/competicoes` existir no catálogo.
- `app/base/page.tsx` (Home da Base) não ganha nenhum indicador novo — a única integração que a
  Home do Profissional tem com Competições é alimentar o Mural via `carregarAvisosCompeticoes`
  (`app/profissional/page.tsx`), e isso já está fora de escopo (ver "Fora de escopo").

## Arquivos — mapeamento completo

Cada arquivo de `app/competicoes/` ganha um espelho em `app/base/competicoes/`, trocando as 4
tabelas (`jogos`→`jogos_base`, `atletas`→`atletas_base`, `competicoes`→`competicoes_base` e as
demais `competicao_*`→`competicao_*_base`) e usando `competicao-query-base.ts` no lugar de
`competicao-query.ts`:

| Profissional | Base |
|---|---|
| `app/competicoes/page.tsx` | `app/base/competicoes/page.tsx` |
| `app/competicoes/actions.ts` | `app/base/competicoes/actions.ts` |
| `app/competicoes/competicao-form.tsx` | `app/base/competicoes/competicao-form.tsx` (campo Categoria vira `SelectField` com as 7 categorias da Base, em vez do `TextField` livre) |
| `app/competicoes/criterios-desempate-field.tsx` | `app/base/competicoes/criterios-desempate-field.tsx` (reaproveitável quase 1:1, sem nada hard-coded de Profissional — avaliar se dá pra importar direto em vez de copiar) |
| `app/competicoes/nova/page.tsx` | `app/base/competicoes/nova/page.tsx` |
| `app/competicoes/[id]/page.tsx` | `app/base/competicoes/[id]/page.tsx` |
| `app/competicoes/[id]/editar/page.tsx` | `app/base/competicoes/[id]/editar/page.tsx` |
| `app/competicoes/[id]/pdf-shared.ts` | `app/base/competicoes/[id]/pdf-shared.ts` |
| `app/competicoes/[id]/pdf/route.tsx` | `app/base/competicoes/[id]/pdf/route.tsx` |
| `app/competicoes/[id]/fases/page.tsx` | `app/base/competicoes/[id]/fases/page.tsx` |
| `app/competicoes/[id]/classificacao/page.tsx` | `app/base/competicoes/[id]/classificacao/page.tsx` |
| `app/competicoes/[id]/classificacao/pdf/route.tsx` | `app/base/competicoes/[id]/classificacao/pdf/route.tsx` |
| `app/competicoes/[id]/resultados/page.tsx` | `app/base/competicoes/[id]/resultados/page.tsx` |
| `app/competicoes/[id]/resultados/importar-sumula-forms.tsx` | `app/base/competicoes/[id]/resultados/importar-sumula-forms.tsx` |
| `app/competicoes/[id]/adversarios/page.tsx` | `app/base/competicoes/[id]/adversarios/page.tsx` |
| `app/competicoes/[id]/jogos/page.tsx` | `app/base/competicoes/[id]/jogos/page.tsx` (lista jogos da Base ainda não vinculados — já filtrando pela categoria da competição) |
| `app/competicoes/[id]/inscritos/page.tsx` | `app/base/competicoes/[id]/inscritos/page.tsx` |
| `app/competicoes/[id]/inscritos/pdf/route.tsx` | `app/base/competicoes/[id]/inscritos/pdf/route.tsx` |
| `app/competicoes/[id]/cartoes/page.tsx` | `app/base/competicoes/[id]/cartoes/page.tsx` |
| `app/competicoes/[id]/cartoes/pdf/route.tsx` | `app/base/competicoes/[id]/cartoes/pdf/route.tsx` |
| `app/competicoes/[id]/suspensoes/page.tsx` | `app/base/competicoes/[id]/suspensoes/page.tsx` |
| `app/competicoes/[id]/suspensoes/pdf/route.tsx` | `app/base/competicoes/[id]/suspensoes/pdf/route.tsx` |
| `app/competicoes/[id]/condicao/page.tsx` | `app/base/competicoes/[id]/condicao/page.tsx` |
| `app/competicoes/[id]/condicao/pdf/route.tsx` | `app/base/competicoes/[id]/condicao/pdf/route.tsx` |
| `app/competicoes/[id]/alertas/page.tsx` | `app/base/competicoes/[id]/alertas/page.tsx` |
| `app/competicoes/[id]/prazos/page.tsx` | `app/base/competicoes/[id]/prazos/page.tsx` |

`lib/futebol/competicao-query-base.ts` (novo) espelha `competicao-query.ts` trocando as 4 tabelas
citadas acima — é o único arquivo de lógica realmente duplicado; todo o resto de `lib/` é
reaproveitado como está (ver tabela na seção Abordagem).

## Integração com a aba Dados do Jogo

Em `app/base/jogos/jogo-form-base.tsx`, o `TextField` de Competição vira um `SelectField`
carregado com `competicoes_base` filtradas por `categoria = <categoria do jogo>` (a lista de
opções é buscada pela página server component e passada como prop, mesmo padrão já usado por
outros selects dependentes de categoria no formulário). Em `app/base/jogos/actions.ts`
(`criarJogoBase`/`atualizarJogoBase`):

1. Grava o nome da competição selecionada em `jogos_base.competicao` (texto, mantém compatível com
   todo mundo que já lê esse campo como string — nenhuma mudança nos ~60 pontos de leitura
   levantados na exploração).
2. Faz um `upsert` em `competicao_jogos_base` (`onConflict: "jogo_id"`) vinculando o jogo à
   competição escolhida — isso é o que, no Profissional, só acontece manualmente dentro de
   `/competicoes/[id]/jogos`.

Se a categoria do jogo ainda não tem nenhuma competição cadastrada, o select mostra só a opção
"Nenhuma competição cadastrada pra <categoria> ainda" (desabilitada) com um link pra
`/base/competicoes/nova` — não bloqueia salvar o jogo sem competição (o campo deixa de ser
obrigatório na Base, diferente do Profissional, já que pode ser o primeiro jogo da categoria antes
de existir cadastro).

## Testes e verificação

- `lib/futebol/competicao-query-base.ts`: sem teste próprio, mesmo padrão do original (depende de
  Supabase).
- Reaproveitar os testes já existentes de `competicao-classificacao.test.ts`,
  `competicao-desempate.test.ts`, `competicao-disciplina.test.ts` (se existirem) sem duplicar —
  são puros e já cobrem a lógica que a Base também usa.
- `npx tsc --noEmit`, `npx vitest run`, `npx eslint`, `npx next build` ao final de cada etapa da
  implementação (não só no final de tudo, dado o tamanho).
- Colar o SQL da migração `0130_competicoes_base.sql` completo no chat pro Mateus rodar no SQL
  Editor do Supabase antes de testar.
- Roteiro manual: cadastrar uma Temporada e uma Competição Sub-12 em `/base/competicoes`, criar/
  editar um jogo Sub-12 e confirmar que o select de Competição mostra essa competição e que, ao
  salvar, ela aparece vinculada em `/base/competicoes/[id]/jogos`; conferir que um jogo de outra
  categoria (ex. Sub-15) não vê essa competição no select.

## Plano de implementação em etapas

Dado o tamanho (25 arquivos + migration + integração no formulário de jogo), a implementação roda
em etapas, cada uma terminando com o conjunto de verificação rodado:

1. Migration `0130` + tipos em `lib/supabase/types.ts` + `lib/futebol/competicao-query-base.ts`.
2. Módulo/menu/permissão (`modulos-base.ts`, checkbox em `/usuarios`) + cadastro de
   Temporada/Competição (`page.tsx`, `nova/`, `[id]/editar/`, `competicao-form.tsx`,
   `criterios-desempate-field.tsx`) + visão geral `[id]/page.tsx` + PDF resumo.
3. Fases/Grupos/Equipes + Classificação (+ PDF).
4. Resultados dos grupos (+ importação por link) + Jogos vinculados + Adversários.
5. Inscritos (+ PDF) + Cartões (+ PDF) + Suspensões (+ PDF) + Condição de jogo (+ PDF).
6. Alertas + Prazos (+ documentos).
7. Integração final: select de Competição + vínculo automático em `jogo-form-base.tsx`/
   `app/base/jogos/actions.ts`.
8. Verificação final completa, sincronização e entrega.
