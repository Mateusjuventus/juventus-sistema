# Contrato do Atleta — Gatilhos (bônus por meta de desempenho)

## Contexto

Pedido do Mateus, verbatim, depois de ver a rodada de extensões do Contrato (direitos econômicos,
evolução salarial, selo de status) já em produção:

> "na parte de contratos tem uma questão que queria incluir. pode se chamar de Gatilhos ou se tiver
> uma referencia melhor tipo Bonus. É quando o atleta tem metas para cumprir, ex: Se o jogador for
> convocado 50% dos jogos, recebe um valor, se o atleta tiver 70% dos jogos com mais de 45min, ganha
> 10.000,00. Algo nessa linha."

Isso é um "gatilho" (termo escolhido por ele): uma meta de desempenho ligada ao contrato vigente —
quando o atleta a atinge, tem direito a um valor fixo em R$, pago uma única vez.

O sistema já calcula tudo que esses exemplos precisam. `lib/futebol/estatisticas-atleta.ts`
(`calcularEstatisticasAtleta`) já agrega, por atleta e por universo de jogos filtrado,
titular/banco/não convocado, gols, assistências, jogos com mais de um tempo (`jogosMaisUmTempo` —
é o "+45min"/"+40min" que já aparece na Ficha, variando por categoria) e jogos completos
(`jogosJogoCompleto`). E `lib/futebol/estatisticas-atleta-query.ts`
(`buscarEstatisticasAtleta`/`buscarCompeticoesDisponiveisAtleta`) já sabe filtrar esse universo por
um conjunto de Competições formais (+ "incluir jogos sem competição vinculada") — é o mesmo filtro
já usado no checklist de "Dados de Jogo" da Ficha do atleta. Gatilhos reaproveita os dois na
íntegra, sem nenhum cálculo novo de estatística de jogo.

## Decisões confirmadas com o Mateus

- **Métricas disponíveis**: lista maior, não só os dois exemplos — % de jogos convocado, % de
  jogos como titular, % de jogos com mais de um tempo, % de jogos completos (as 4 em percentual
  sobre o total de jogos do universo escolhido), total de gols e total de assistências (contagem
  absoluta, sem percentual).
- **Universo de jogos**: por Competição, podendo selecionar mais de uma ao criar o gatilho (mesmo
  checklist multi-seleção já usado no filtro de "Dados de Jogo"/Ficha, com a opção de incluir jogos
  sem Competição vinculada). Sem filtro de data nem vínculo com a vigência do contrato — só o que
  está marcado no checklist entra na conta.
- **Pagamento**: único. Ao bater a meta uma vez, está cumprida — não há recálculo periódico pra
  pagar de novo.
- **Cálculo**: automático (reaproveitando as estatísticas já existentes), mas com um passo de
  confirmação manual — ver "Cálculo automático x confirmação manual" abaixo. É esse passo que
  decide a data exata em que o bônus foi "ganho", necessária pro Financeiro.
- **Financeiro**: o valor do bônus aparece como uma linha separada ("Bônus de gatilhos este mês"),
  visível só enquanto a confirmação caiu no mês atual — não entra na soma do custo mensal
  recorrente do atleta (que representa salário, não bônus pontual).

## Cálculo automático x confirmação manual

Tensão identificada durante o desenho: cálculo 100% automático (sem nenhuma ação humana) exigiria
o sistema escrever no banco sozinho a cada vez que alguém abre a tela — toda a extensão de
Contrato até aqui (dias restantes, status, valor efetivo da evolução salarial) segue o princípio de
nunca escrever nada só de exibir uma tela, sempre recalcular na hora. Também não haveria uma data
clara de "quando foi ganho" pro Financeiro usar.

Solução: o **progresso** de cada gatilho é sempre calculado ao vivo e exibido (sem nenhuma escrita
no banco) — ex. "62% — ainda não bateu", ou um destaque quando o limiar é cruzado ("🎯 Meta batida!
Bônus de R$ 10.000,00 ainda não confirmado"). A **confirmação** é a única escrita: um botão
"Confirmar bônus", que só aparece quando o progresso já cruzou o limiar e ainda não foi confirmado,
grava a data (`cumprida_em`) e quem confirmou. Esse registro nunca se desfaz automaticamente, mesmo
que uma correção posterior de Convocação/Súmula baixe o percentual de novo — é um fato histórico
("o bônus foi ganho/pago"), não um estado recalculado.

## Modelo de dados

Migração `0159_atleta_contrato_gatilhos.sql`:

```sql
-- Gatilhos (bônus por meta de desempenho) do Contrato do Atleta — ver docs/superpowers/specs/
-- 2026-11-04-contrato-atleta-gatilhos-design.md. Preso ao contrato (cascade), mesmo espírito de
-- atleta_contrato_evolucao_salarial (0158): só edita enquanto o contrato é o vigente.
create table public.atleta_contrato_gatilhos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.atleta_contratos(id) on delete cascade,
  metrica text not null check (
    metrica in (
      'pct_convocado', 'pct_titular', 'pct_mais_um_tempo', 'pct_jogo_completo',
      'total_gols', 'total_assistencias'
    )
  ),
  -- Percentual (0-100) pras métricas pct_*, contagem absoluta (ex: 10 gols) pras total_*.
  limiar numeric(10, 2) not null check (limiar >= 0),
  valor_bonus numeric(12, 2) not null check (valor_bonus >= 0),
  incluir_sem_competicao boolean not null default false,
  -- NULL = ainda não confirmado (progresso é sempre calculado ao vivo, nunca lido daqui). Setado
  -- uma única vez, pelo botão "Confirmar bônus" — nunca recalculado/desfeito automaticamente.
  cumprida_em date,
  confirmada_por_perfil_id uuid references public.perfis(id) on delete set null,
  confirmada_por_nome text,
  criado_por_perfil_id uuid references public.perfis(id) on delete set null,
  criado_por_nome text,
  created_at timestamptz not null default now()
);

create index atleta_contrato_gatilhos_contrato_id_idx
  on public.atleta_contrato_gatilhos (contrato_id);

alter table public.atleta_contrato_gatilhos enable row level security;

create policy "authenticated_full_access" on public.atleta_contrato_gatilhos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atleta_contrato_gatilhos to authenticated;

-- Quais Competições entram no universo de jogos deste gatilho (checklist multi-seleção, mesmo
-- filtro já usado em "Dados de Jogo"/Ficha). Sem FK pra `competicoes`/`competicoes_base`: Contrato
-- já é unificado (Profissional + Base), mas Competições ainda não — um gatilho de atleta da Base
-- referencia `competicoes_base.id`, um do Profissional referencia `competicoes.id`. Mesma ambiguidade
-- que `TabelasEstatisticasAtleta` já resolve na camada de consulta (recebe o nome da tabela certa
-- como parâmetro); aqui só guardamos o id solto, sem checar contra uma tabela específica.
create table public.atleta_contrato_gatilho_competicoes (
  gatilho_id uuid not null references public.atleta_contrato_gatilhos(id) on delete cascade,
  competicao_id uuid not null,
  primary key (gatilho_id, competicao_id)
);

alter table public.atleta_contrato_gatilho_competicoes enable row level security;

create policy "authenticated_full_access" on public.atleta_contrato_gatilho_competicoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atleta_contrato_gatilho_competicoes to authenticated;

-- "Adicionar gatilho" grava a linha principal + as Competições marcadas numa operação atômica só
-- (mesmo motivo de `criar_contrato_atleta`: evita a janela entre duas chamadas separadas do
-- supabase-js deixar um gatilho sem nenhuma Competição vinculada se a segunda falhar).
create function public.criar_gatilho_contrato(
  p_contrato_id uuid,
  p_metrica text,
  p_limiar numeric,
  p_valor_bonus numeric,
  p_competicao_ids uuid[],
  p_incluir_sem_competicao boolean,
  p_criado_por_perfil_id uuid,
  p_criado_por_nome text
) returns public.atleta_contrato_gatilhos
language plpgsql
as $$
declare
  novo public.atleta_contrato_gatilhos;
  competicao_id uuid;
begin
  insert into public.atleta_contrato_gatilhos (
    contrato_id, metrica, limiar, valor_bonus, incluir_sem_competicao,
    criado_por_perfil_id, criado_por_nome
  ) values (
    p_contrato_id, p_metrica, p_limiar, p_valor_bonus, p_incluir_sem_competicao,
    p_criado_por_perfil_id, p_criado_por_nome
  ) returning * into novo;

  foreach competicao_id in array p_competicao_ids loop
    insert into public.atleta_contrato_gatilho_competicoes (gatilho_id, competicao_id)
    values (novo.id, competicao_id);
  end loop;

  return novo;
end;
$$;

grant execute on function public.criar_gatilho_contrato to authenticated;

notify pgrst, 'reload schema';
```

"Confirmar bônus" e "Remover" não precisam de função de banco — são um `update`/`delete` direto via
`supabase-js` (mesmo padrão de `removerEvolucaoSalarial`): `update ... set cumprida_em = hoje,
confirmada_por_perfil_id = ..., confirmada_por_nome = ... where id = :id and cumprida_em is null`
(a condição `cumprida_em is null` impede confirmar duas vezes por engano) e `delete ... where id =
:id` (só permitido pela UI quando ainda não confirmado — ver "Tela" abaixo).

## Cálculo (módulo puro)

Novo `lib/futebol/gatilho-contrato.ts` (import relativo, igual a `contrato.ts`, pra funcionar no
vitest):

```ts
import type { EstatisticasAtleta } from "./estatisticas-atleta";
import type { MetricaGatilhoContrato } from "../supabase/types";

export const METRICA_GATILHO_OPTIONS = [
  { value: "pct_convocado", label: "% de jogos convocado", tipo: "percentual" },
  { value: "pct_titular", label: "% de jogos como titular", tipo: "percentual" },
  { value: "pct_mais_um_tempo", label: "% de jogos com mais de um tempo", tipo: "percentual" },
  { value: "pct_jogo_completo", label: "% de jogos completos", tipo: "percentual" },
  { value: "total_gols", label: "Total de gols", tipo: "contagem" },
  { value: "total_assistencias", label: "Total de assistências", tipo: "contagem" },
] as const;

export interface ProgressoGatilho {
  atual: number; // percentual (0-100) ou contagem absoluta, conforme a métrica
  atingida: boolean;
}

export function calcularProgressoGatilho(
  stats: EstatisticasAtleta,
  metrica: MetricaGatilhoContrato,
  limiar: number,
): ProgressoGatilho {
  const totalJogos = stats.titular + stats.banco + stats.naoConvocado;
  const atual = (() => {
    switch (metrica) {
      case "pct_convocado":
        return totalJogos > 0 ? ((stats.titular + stats.banco) / totalJogos) * 100 : 0;
      case "pct_titular":
        return totalJogos > 0 ? (stats.titular / totalJogos) * 100 : 0;
      case "pct_mais_um_tempo":
        return totalJogos > 0 ? (stats.jogosMaisUmTempo / totalJogos) * 100 : 0;
      case "pct_jogo_completo":
        return totalJogos > 0 ? (stats.jogosJogoCompleto / totalJogos) * 100 : 0;
      case "total_gols":
        return stats.gols;
      case "total_assistencias":
        return stats.assistencias;
    }
  })();
  return { atual, atingida: atual >= limiar };
}
```

`totalJogos` (denominador das métricas `pct_*`) é `stats.titular + stats.banco +
stats.naoConvocado` — o total de jogos do time no universo filtrado, mesmo denominador já usado no
donut de participação da Ficha.

## Tela

Dentro de `ContratoCard` (só no card `destaque`, igual à Evolução salarial), nova seção
"Gatilhos" (`GatilhosSecao`, em `components/contrato-secao.tsx`):

- Lista cada gatilho com: rótulo da métrica, limiar, valor do bônus, e o progresso atual —
  calculado pela página (ver "Integração" abaixo) e passado como prop, não calculado dentro do
  componente (mantém `contrato-secao.tsx` livre de I/O, igual está hoje).
  - Ainda não cumprida: barra/texto de progresso ("62% de 70%").
  - Cumprida, não confirmada: destaque ("🎯 Meta batida!") + botão "Confirmar bônus".
  - Confirmada: selo "Bônus confirmado em dd/mm/aaaa" (sem botão).
- "Remover" só aparece em gatilhos ainda não confirmados (evita apagar por engano um bônus já
  pago/registrado).
- Mini-formulário "+ Adicionar gatilho" (`components/gatilho-contrato-form.tsx`, mesmo padrão de
  `EvolucaoSalarialForm`): métrica (`SelectField`), limiar (`TextField type="number"`, com
  sufixo/rótulo "%" ou "gols"/"assistências" conforme a métrica escolhida), valor do bônus
  (`CurrencyField`), e um checklist de Competições + "incluir jogos sem competição vinculada" —
  mesmo padrão visual do checklist já usado em `components/atletas/ficha-atleta-modal.tsx`.
- Contratos do histórico (`!destaque`) mostram a lista travada, sem progresso/controles — mesmo
  tratamento que Evolução salarial já recebe.

## Integração (impura — fora de `contrato-secao.tsx`)

`app/atletas/[id]/ver/page.tsx` e `app/atletas/[id]/page.tsx` (editar) ganham, ao lado da busca de
evolução salarial que já existe:

1. Buscar `atleta_contrato_gatilhos` por `contrato_id in (...)` e, pra cada gatilho encontrado, suas
   `atleta_contrato_gatilho_competicoes` (join simples por `gatilho_id`).
2. Pra cada gatilho do contrato vigente (histórico não precisa de progresso, já que não tem mais
   controle nenhum), chamar `buscarEstatisticasAtleta(supabase, atletaId, tabelas, {
   competicaoIds: gatilho.competicaoIds, incluirSemCompeticao: gatilho.incluir_sem_competicao })` e
   passar o `stats` resultante por `calcularProgressoGatilho`.
3. Montar um `Map<gatilhoId, ProgressoGatilho>` e passar pra `ContratoSecao`.

Isso soma uma consulta de estatísticas por gatilho do vigente — aceitável na escala atual (um
atleta tem poucos gatilhos ao mesmo tempo); se um dia isso pesar, dá pra agrupar gatilhos com o
mesmo conjunto de Competições numa única chamada, mas não há necessidade agora.

## Financeiro

`lib/futebol/financeiro.ts`/`financeiro-base.ts` ganham uma função pura `bonusGatilhosDoMes
(gatilhos: AtletaContratoGatilhoRow[], hojeStr: string): number` — soma `valor_bonus` de todo
gatilho cuja `cumprida_em` cai no mesmo ano/mês de `hojeStr`. `app/financeiro/page.tsx` (aba
"Geral") e o espelho da Base buscam os gatilhos dos contratos vigentes, calculam esse total e
mostram como linha extra ("Bônus de gatilhos este mês: R$ X"), separada de `custoComissao`/
`custoAtletas`/`totalGeral` — esses três continuam representando só o custo mensal recorrente,
sem o bônus. Preciso localizar durante a implementação se existe também um PDF que espelha essa
aba (`app/financeiro/pdf/route.tsx` ou similar) pra decidir se a linha precisa entrar lá também.

## Alternativas descartadas

- **Gravar `cumprida_em` automaticamente, sem botão de confirmação** — descartado: quebraria o
  princípio de "nunca escrever só de abrir a tela" que o resto do Contrato segue, e perderia a data
  exata do "mês em que o bônus foi ganho" que o Financeiro precisa (o progresso pode cruzar o
  limiar e descruzar de novo se alguém corrigir uma Súmula depois).
- **Somar o gatilho direto no custo mensal recorrente do Financeiro** — descartado a pedido do
  Mateus: distorceria o salário mensal do atleta pra sempre, quando o bônus é só um pagamento
  pontual.
- **Guardar Competições como array de uuid na própria linha do gatilho** (em vez de tabela de
  junção) — descartado: o padrão já usado no resto do schema pra relações N:N é tabela de junção
  (ex. `convocacao_atletas`, `competicao_jogos`), e facilita adicionar/remover uma Competição sem
  reescrever o array inteiro.

## Arquivos afetados

- `supabase/migrations/0159_atleta_contrato_gatilhos.sql` (novo)
- `lib/supabase/types.ts` — `MetricaGatilhoContrato`, `AtletaContratoGatilhoRow`
- `lib/futebol/gatilho-contrato.ts` (novo) + `gatilho-contrato.test.ts` (novo)
- `lib/futebol/financeiro.ts`, `lib/futebol/financeiro-base.ts` — `bonusGatilhosDoMes`
- `components/gatilho-contrato-form.tsx` (novo)
- `components/contrato-secao.tsx` — `GatilhosSecao`, `ContratoCard` ganha prop de progresso
- `app/atletas/[id]/contrato/actions.ts` — `criarGatilhoContrato`, `confirmarGatilhoContrato`,
  `removerGatilhoContrato`
- `app/atletas/[id]/ver/page.tsx`, `app/atletas/[id]/page.tsx` — busca de gatilhos + cálculo de
  progresso por gatilho
- `app/financeiro/page.tsx` e espelho da Base — linha de bônus do mês

## Verificação

`lib/futebol/gatilho-contrato.test.ts` cobrindo `calcularProgressoGatilho` pras 6 métricas
(percentual com denominador zero, contagem absoluta, limiar exatamente batido). Depois de
implementado: `npx tsc --noEmit`, `npx vitest run` e `npx next build`, mais um teste manual criando
um gatilho com limiar baixo pra confirmar que o botão "Confirmar bônus" aparece e grava a data
certa, e que a linha do Financeiro só aparece no mês da confirmação.
