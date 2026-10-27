# Ficha do Atleta — Dossiê: Dados de Jogo e Anotações do treinador/staff

Data: 27/10/2026
Status: aprovado pelo Mateus, aguardando spec review final

## Contexto

Continuação do trabalho na Ficha do Atleta (ver specs de 16/10 — Dados Pessoais e Dados Esportivos/
Contrato — e de 22/10, que criou a Ficha configurável em PDF). O Mateus voltou com um pedido maior,
verbatim:

> "Faz sentido deixar os dados de jogo junto? Se o atleta, por um acaso transitar entre categoria,
> exemplo (se for Sub 17) e participar de jogos no Sub 20. Isso deva contabilizar no relatório dele
> também. Tipo preciso gerar aqui um Dossiê do atleta ou Ficha como chamamos, quero ter uma opção do
> treinador poder fazer um relatório dele para ficar anexado e salvo como histórico também sabe? e
> não somente como na dispensa. e esse relatório grave data e por quem foi criado. E quero que
> quando o atleta também for dispensado, esse relatório e essas notas vão pra esse histórico também.
> e quero que no relatório contenha os gráficos e não somente os números."

Antes de desenhar, um levantamento do que já existe (tudo isso já está no ar, não é rascunho):

- **Classificação G1/G2/G3 e Relatório de Dispensa** (spec de 25/08) — já implementado, só Futebol
  de Base. `atletas_base.classificacao`, campos `dispensa_*`, e a tela do treinador em
  `/treinador/atletas/[id]/dispensa` (trava depois de gerado).
- **Ficha configurável em PDF** (spec de 22/10) — `/atletas/[id]/ficha/pdf` e
  `/base/atletas/[categoria]/[id]/ficha/pdf`. Escolha campo a campo (não por bloco), agrupados em 3
  seções fixas: Dados Pessoais, Dados Esportivos, Dados do Contrato (`lib/futebol/ficha-atleta.ts`).
  Hoje é só texto — nenhum gráfico, nenhum histórico.
- **Dados de Jogo** (spec de 04/08) — aba própria no perfil do atleta, com filtro de período, gráfico
  de participação (rosca: Titular/Banco/Não Convocado), contadores (gols, assistências, cartões) e
  minutagem, calculados sob demanda a partir de Convocação + Súmula. Já tem seu próprio "Gerar PDF"
  (rota `.../relatorio/pdf`), que já inclui o gráfico — colocar gráfico num PDF já é um caminho
  testado no sistema.

## Decisões confirmadas com o Mateus

- **Convocação entre categorias — sem mudança.** A Convocação de um jogo continua restrita a atletas
  da mesma categoria do jogo (como já é hoje). Quando um atleta realmente passa a jogar por outra
  categoria, isso é uma alteração manual de categoria no cadastro dele — mesmo caminho já usado pro
  Vitor Coca. Achado confirmado lendo o código: `buscarEstatisticasAtleta` (Dados de Jogo) já soma só
  por `atleta_id`, sem filtrar pela categoria do jogo — então os jogos de antes e de depois de uma
  mudança de categoria já entram juntos nas estatísticas dele, sem precisar de nenhuma mudança aqui.
- **Anotações do treinador/staff** — um histórico por atleta, texto livre, com autor e data gravados
  automaticamente (autor vem do perfil logado, nunca digitado). Sem edição depois de criada (mesmo
  princípio já usado no Parecer Final, na Dispensa e nos Contratos) — pra corrigir, apaga e escreve
  de novo.
- **Quem escreve:** o treinador (Base, só nas categorias dele) e o Mateus/staff pelo cadastro
  interno — nos dois departamentos.
- **Escopo:** Profissional e Base. A Classificação G1/G2/G3 e o Relatório de Dispensa formal (que
  muda o `status` do atleta pra "Dispensado") **continuam só na Base** — esta rodada não estende
  isso pro Profissional, só o histórico de anotações e a Ficha mestre.
- **A Dispensa entra no mesmo histórico, sem duplicar dado.** A entrada de "Dispensa" que aparece no
  histórico é montada na hora (igual ao resto do sistema: Valor total do Contrato, estatísticas de
  Dados de Jogo) a partir dos campos que já existem em `atletas_base` (`dispensa_data`,
  `dispensa_motivo`, `dispensado_por`, `dispensado_em`) — não é uma linha física na tabela de
  anotações. Se o Mateus editar a dispensa depois pelo cadastro interno, o histórico reflete sozinho.
- **Gráficos no relatório** — reaproveita o gráfico de participação que já existe em Dados de Jogo.
  Nenhum gráfico novo nesta rodada (ex.: evolução de classificação/notas ao longo do tempo fica de
  fora, por decisão do Mateus).
- **Exclusão:** o Mateus/staff pode apagar qualquer anotação (limpeza, pelo cadastro interno); o
  treinador só apaga as próprias. Nenhum dos dois edita uma anotação já salva.
- **Ficha vira documento "mestre"** — ganha Dados de Jogo e Anotações como seções opcionais a mais,
  junto das 3 que já existem. Os atalhos que já existem continuam exatamente como estão: o "Gerar
  PDF" dentro da aba Dados de Jogo, e o PDF de Dispensa — pra quem só quer aquele relatório pontual
  sem abrir a Ficha inteira.

## Modelo de dados

Migração `0148_atleta_anotacoes.sql` (próximo número livre — a última é `0147_sumula_acrescimo.sql`):

```sql
-- Anotações do atleta (Profissional) — histórico de texto livre, nunca editado, só criado/apagado.
-- Mesmo espírito de `atleta_contratos`: tabela de histórico própria, sem mexer no atleta principal.
create table public.atleta_anotacoes (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  texto text not null,
  criado_por_perfil_id uuid references public.perfis(id) on delete set null,
  -- Nome capturado no momento da criação (mesmo padrão de `criado_por_nome` em `atleta_contratos` e
  -- `dispensado_por`/`parecer_preenchido_por`) — continua legível mesmo se o perfil for removido
  -- depois.
  criado_por_nome text not null,
  created_at timestamptz not null default now()
);

create index atleta_anotacoes_atleta_id_idx on public.atleta_anotacoes (atleta_id);

alter table public.atleta_anotacoes enable row level security;

create policy "authenticated_full_access" on public.atleta_anotacoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atleta_anotacoes to authenticated;

-- Mesma tabela, espelhada pra Base.
create table public.atleta_base_anotacoes (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas_base(id) on delete cascade,
  texto text not null,
  criado_por_perfil_id uuid references public.perfis(id) on delete set null,
  criado_por_nome text not null,
  created_at timestamptz not null default now()
);

create index atleta_base_anotacoes_atleta_id_idx on public.atleta_base_anotacoes (atleta_id);

alter table public.atleta_base_anotacoes enable row level security;

create policy "authenticated_full_access" on public.atleta_base_anotacoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atleta_base_anotacoes to authenticated;

notify pgrst, 'reload schema';
```

Novos tipos em `lib/supabase/types.ts`: `AtletaAnotacaoRow`/`AtletaBaseAnotacaoRow` (id, atleta_id,
texto, criado_por_perfil_id, criado_por_nome, created_at).

## Quem escreve e onde

### Cadastro interno (Profissional e Base)

Nova aba **"Anotações"** em `AtletaTabs`/`AtletaTabsBase`, ao lado de Dados Pessoais/Documentação/
Dados de Jogo/Contrato:

- `app/atletas/[id]/anotacoes/page.tsx` e `app/base/atletas/[categoria]/[id]/anotacoes/page.tsx` —
  lista cronológica (mais recente primeiro) + formulário "+ Nova anotação" (textarea), mesmo padrão
  de lista-mais-mini-formulário já usado em Contatos de Emergência e Documentação. Cada item mostra
  o texto, o nome de quem criou e a data. Um botão remover por linha (`DeleteButton` compartilhado).
- Na Base, a entrada de Dispensa (quando o atleta tiver `dispensa_data` preenchida) aparece misturada
  na mesma linha do tempo, na posição cronológica certa, com um estilo visualmente diferente (ex.:
  borda à esquerda na cor do clube + rótulo "Relatório de Dispensa") e um link "Ver PDF" pra rota que
  já existe. Essa entrada não tem botão de apagar — pra remover, é preciso desfazer a dispensa pelo
  cadastro interno, não por aqui.
- Server actions `adicionarAnotacao`/`removerAnotacao` (e espelho `_base`) em
  `app/atletas/actions.ts`/`app/base/atletas/actions.ts`, mesmo molde de
  `adicionarDocumento`/`removerDocumento`. O autor nunca vem de um campo do formulário — a action lê
  o perfil logado (nome + id) e grava os dois.

### Treinador (só Base)

Hoje o treinador não tem uma página de detalhe do atleta — só o card dele dentro de "Meus atletas"
(`treinador-atletas-view.tsx`) e a tela de Dispensa. Fica criada `app/treinador/atletas/[id]/
page.tsx`: cabeçalho do atleta, os Dados de Jogo dele (só leitura, reaproveitando
`buscarEstatisticasAtleta` + `DonutChart`, sem filtro de período — só o histórico completo, pra
manter simples) e a mesma lista + formulário de Anotações. Ações próprias em
`app/treinador/atletas/actions.ts` (`adicionarAnotacaoTreinador`/`removerAnotacaoTreinador`), com a
mesma dupla checagem de categoria já usada em `salvarClassificacaoTreinador` — confirma que quem está
logado é treinador e que a categoria do atleta está entre as `categorias_treinador` dele. O treinador
só apaga anotações onde `criado_por_perfil_id` é o dele mesmo. O card em "Meus atletas" ganha um link
pra essa página nova (além do link "Gerar relatório de dispensa" que já existe, que passa a morar
dentro dela também).

## A Ficha mestre

`SECOES_FICHA_ATLETA` (`lib/futebol/ficha-atleta.ts`) ganha duas seções novas, **"Dados de Jogo"** e
**"Anotações"** — estruturalmente diferentes das 3 que já existem: não são uma grade simples de
campo/valor, então `construirSecoesFichaAtleta` e `FichaAtletaDocument` passam a reconhecer dois
tipos de seção "ricos" além do tipo grade que já existe:

- **Dados de Jogo**: os mesmos contadores da aba (gols, assistências, cartões, minutagem) + o gráfico
  de participação, reaproveitando o componente que `AtletaRelatorioDocument` (rota
  `.../relatorio/pdf`) já usa pra desenhar o gráfico dentro de um PDF — sem recriar do zero.
- **Anotações**: a lista completa da linha do tempo (texto + autor + data), com a entrada de Dispensa
  misturada quando houver (só Base) — mesma função de montagem compartilhada entre a tela e o PDF
  (`lib/futebol/anotacoes-atleta.ts`, novo — mescla as linhas de `atleta_anotacoes`/
  `atleta_base_anotacoes` com a entrada virtual de dispensa, ordenado por data).

O modal de seleção (`components/atletas/ficha-atleta-modal.tsx`) ganha essas duas seções na lista de
checkboxes. Quando "Dados de Jogo" está marcado, aparece também o mesmo filtro de período (de/até/
competição) que a aba já usa — sem marcar, não aparece. As rotas `.../ficha/pdf/route.tsx`
(Profissional e Base) passam a aceitar esses parâmetros de período e, só quando a seção estiver
marcada, buscam as estatísticas e as anotações do atleta, do mesmo jeito que as telas próprias já
fazem.

Os atalhos que já existem continuam intactos: "Gerar PDF" dentro da aba Dados de Jogo, e o PDF de
Dispensa — ninguém perde o caminho rápido que já tinha.

## Arquivos afetados

- `supabase/migrations/0148_atleta_anotacoes.sql` (novo)
- `lib/supabase/types.ts` — `AtletaAnotacaoRow`, `AtletaBaseAnotacaoRow`
- `lib/futebol/ficha-atleta.ts` — seções `dados_de_jogo`/`anotacoes`, `construirSecoesFichaAtleta`
  estendido pros dois tipos de seção rica
- `lib/futebol/anotacoes-atleta.ts` (novo) — mescla anotações + dispensa virtual, usado pela tela e
  pelo PDF
- `lib/pdf/ficha-atleta-document.tsx` — suporte às seções ricas (gráfico + lista com data/autor)
- `components/atleta-tabs.tsx`, `components/atleta-tabs-base.tsx` — aba "Anotações"
- `components/atletas/ficha-atleta-modal.tsx` — checkboxes das seções novas + filtro de período
  condicional
- `app/atletas/[id]/anotacoes/page.tsx`, `app/base/atletas/[categoria]/[id]/anotacoes/page.tsx`
  (novos)
- `app/atletas/actions.ts`, `app/base/atletas/actions.ts` — `adicionarAnotacao`/`removerAnotacao`
- `app/atletas/[id]/ficha/pdf/route.tsx`, `app/base/atletas/[categoria]/[id]/ficha/pdf/route.tsx` —
  seções novas + parâmetros de período
- `app/treinador/atletas/[id]/page.tsx` (novo) — Dados de Jogo + Anotações do treinador
- `app/treinador/atletas/actions.ts` — `adicionarAnotacaoTreinador`/`removerAnotacaoTreinador`
- `app/treinador/atletas/treinador-atletas-view.tsx` — link pra página nova do atleta

## Fora de escopo (deliberado)

- Classificação G1/G2/G3 e Relatório de Dispensa formal (com troca de status) continuam só na Base —
  não estendidos pro Profissional nesta rodada.
- Nenhuma mudança na Convocação — continua restrita a atletas da própria categoria do jogo.
- Nenhum gráfico novo além do gráfico de participação que já existe em Dados de Jogo (ex.: evolução
  de classificação/notas ao longo do tempo).
- Edição de uma anotação já criada (só apagar e escrever de novo).
- Anotação visível só pra quem escreveu — por decisão do Mateus, qualquer anotação é visível pra
  todo mundo com acesso ao atleta (mesma transparência já usada na Dispensa e no Parecer).

## Verificação

Checagem de sintaxe por esbuild em cada arquivo tocado. Como mexe em geração de PDF (seções novas no
`FichaAtletaDocument`), vale montar um harness de render rápido (mesmo padrão já usado nesta sessão
pras súmulas) antes de considerar pronto — gerar um PDF de teste com as duas seções novas marcadas e
conferir visualmente que o gráfico e a lista de anotações saem legíveis. Recomendo rodar
`npm run typecheck`/`next build` no projeto real antes do deploy, como de costume.
