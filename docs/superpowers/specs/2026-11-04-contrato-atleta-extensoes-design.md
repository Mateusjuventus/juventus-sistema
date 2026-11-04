# Contrato do Atleta — extensões (dias restantes, direitos econômicos, aditivo, evolução salarial, selo de status)

Data: 04/11/2026
Status: aprovado pelo Mateus, pronto para implementação

## Contexto

O sub-sistema de Contrato do Atleta já existe (migração `0137_atleta_contrato.sql`, spec
`docs/superpowers/specs/2026-10-16-atleta-dados-esportivos-contrato-design.md`): tabela
`atleta_contratos` (unificada Base+Profissional em 28/10/2026), um contrato "vigente" por
atleta por vez, os demais viram histórico automaticamente, 5 rubricas de remuneração,
botão "Novo contrato", e o Financeiro já usa o total desse contrato nos cálculos de custo
(`docs/superpowers/specs/2026-10-16-financeiro-contrato-design.md`).

Esta spec cobre as extensões pedidas pelo Mateus em 04/11/2026 em cima desse sistema já
existente — **não é uma reescrita**. Nada aqui muda o comportamento hoje em produção além
do que está descrito.

## 1. Contagem de dias/meses restantes

No card do contrato vigente (`ContratoCard`, dentro de `components/contrato-secao.tsx`),
ao lado da vigência, mostrar quanto tempo falta — ex. "faltam 247 dias (≈ 8 meses)". Só
aparece quando `vigencia_fim` está preenchido; sem data de término, não mostra nada ali
(contrato sem prazo definido).

Nova função pura em `lib/futebol/contrato.ts` (arquivo novo, mesmo espírito de
`lib/futebol/calendario.ts`):

```ts
export interface DiasRestantes {
  dias: number;
  meses: number;
}

/** `null` quando `vigenciaFim` é null ou já passou (não mostra "faltam -12 dias"). */
export function diasRestantesContrato(vigenciaFim: string | null, hojeStr: string): DiasRestantes | null {
  if (!vigenciaFim) return null;
  const dias = diasEntre(hojeStr, vigenciaFim); // reaproveita de lib/futebol/calendario.ts
  if (dias < 0) return null;
  return { dias, meses: Math.round(dias / 30) };
}
```

## 2. Direitos econômicos

Até 3 partes por contrato, todas opcionais, em percentual:

- **Juventus** (%)
- **Atleta** (%)
- **Terceiro** — nome digitável (ex: "Botafogo-SP") + (%), para quando o direito é
  compartilhado com outro clube

Validação: cada percentual entre 0 e 100; soma das 3 partes não pode passar de 100% (pode
ficar abaixo — nem sempre as partes já estão 100% negociadas); "Terceiro" exige nome
quando o percentual é maior que zero.

Aparecem no `ContratoCard` como mais uma pequena seção, só quando pelo menos um dos 3
estiver preenchido (senão fica em branco — não é um campo obrigatório do contrato).

## 3. Aditivo

"Novo contrato" (em `ContratoSecao`) vira dois botões lado a lado:

- **Contrato novo** — igual hoje: leva pra `.../contrato/novo`, formulário em branco.
- **Aditivo** — só aparece quando já existe um contrato vigente. Leva pra
  `.../contrato/novo?modo=aditivo`, mesmo formulário, mas pré-preenchido com os dados do
  contrato vigente atual (tipo, clube de origem, vigência, as 5 rubricas, direitos
  econômicos) — a pessoa edita só o que mudou (normalmente prazo e/ou rubricas).

Em ambos os casos, salvar continua funcionando exatamente como hoje: `criar_contrato_atleta`
encerra o vigente atual (vira histórico, nunca é apagado) e insere o novo registro como o
único vigente. A única diferença de um Aditivo: o campo Tipo de contrato fica travado em
"Definitivo" (não editável) — um aditivo sempre resulta num contrato definitivo,
independente do que o contrato anterior era.

## 4. Evolução salarial

Lista de "a partir de tal data, tal rubrica passa a valer R$ X", presa ao contrato
**vigente** (sem sentido editar a evolução de um contrato que já é histórico). Gerenciada
diretamente no `ContratoCard` do vigente — mesmo padrão de "+ Adicionar" já usado em
Contato de Emergência (`components/contato-emergencia-form.tsx`): uma lista das evoluções
já cadastradas (cada uma com botão "Remover") + um mini-formulário pra adicionar (Rubrica,
Data, Novo valor).

**Valor efetivo de cada rubrica** (usado no `ContratoCard` e no cálculo do Financeiro) deixa
de ser sempre o valor gravado no contrato — passa a ser a evolução mais recente cuja data já
chegou, e só cai no valor do contrato quando não há nenhuma aplicável ainda:

```ts
export function valorEfetivoRubrica(
  valorContrato: number,
  evolucoes: AtletaContratoEvolucaoSalarialRow[],
  rubrica: RubricaContrato,
  hojeStr: string,
): number {
  const aplicaveis = evolucoes
    .filter((e) => e.rubrica === rubrica && e.data_vigencia <= hojeStr)
    .sort((a, b) => (a.data_vigencia < b.data_vigencia ? 1 : -1)); // mais recente primeiro
  return aplicaveis[0]?.novo_valor ?? valorContrato;
}
```

**Aviso de evolução chegando** — quando existe uma evolução com data futura (ainda não
aplicada), mostrar um aviso junto do contrato na ficha do atleta: "Evolução salarial em 12
dias: Salário CTPS passa a R$ X" (contagem de dias até a data). Nova função, mesmo arquivo:

```ts
export interface AvisoEvolucaoSalarial {
  rubricaLabel: string;
  novoValor: number;
  diasRestantes: number;
  data: string;
}

export function evolucoesProximas(
  evolucoes: AtletaContratoEvolucaoSalarialRow[],
  hojeStr: string,
): AvisoEvolucaoSalarial[] {
  return evolucoes
    .filter((e) => e.data_vigencia > hojeStr)
    .map((e) => ({
      rubricaLabel: RUBRICA_CONTRATO_LABEL[e.rubrica],
      novoValor: e.novo_valor,
      diasRestantes: diasEntre(hojeStr, e.data_vigencia),
      data: e.data_vigencia,
    }))
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}
```

Contratos do histórico também mostram as evoluções que tiveram (mesma lista, mas sem os
controles de adicionar/remover — só consulta, igual ao resto do card histórico).

Por enquanto este aviso aparece só na ficha do próprio atleta (não existe ainda um
Dashboard geral — essa é outra frente, já combinada com você, que vem depois). A função
`evolucoesProximas` é escrita de um jeito reaproveitável (recebe uma lista de evoluções
solta, sem depender de nenhuma tela específica) justamente para o Dashboard poder chamá-la
de novo mais tarde, juntando de vários atletas de uma vez — sem precisar refazer essa
lógica.

Sem mudança automática "por trás" nenhuma (sem cron, sem job agendado): o valor efetivo é
sempre calculado na hora de exibir a tela ou calcular o Financeiro, olhando a data de hoje
contra a lista de evoluções — mesmo princípio que o Valor Total do contrato já usa hoje
(calculado na hora, nunca gravado).

## 5. Selo "Contrato Ativo"

No topo do `ContratoSecao` (aparece nas telas "Ver atleta" e "Editar atleta", que é onde
este bloco já vive desde 16/10), ao lado do título "Contrato vigente":

- 🟢 **Contrato Ativo** — existe vigente e (`vigencia_fim` é null OU ainda não passou)
- 🔴 **Contrato Vencido** — existe vigente, mas `vigencia_fim` já passou
- ⚪ **Sem contrato** — não existe nenhum contrato vigente cadastrado

## Modelo de dados

Migração `0158_atleta_contrato_extensoes.sql`:

```sql
-- Direitos econômicos (até 3 partes, em %) no contrato vigente/histórico.
alter table public.atleta_contratos
  add column if not exists direito_economico_juventus_pct numeric(5, 2),
  add column if not exists direito_economico_atleta_pct numeric(5, 2),
  add column if not exists direito_economico_terceiro_nome text,
  add column if not exists direito_economico_terceiro_pct numeric(5, 2);

alter table public.atleta_contratos
  add constraint atleta_contratos_direitos_economicos_pct_check
  check (
    (direito_economico_juventus_pct is null or (direito_economico_juventus_pct between 0 and 100))
    and (direito_economico_atleta_pct is null or (direito_economico_atleta_pct between 0 and 100))
    and (direito_economico_terceiro_pct is null or (direito_economico_terceiro_pct between 0 and 100))
    and (
      coalesce(direito_economico_juventus_pct, 0)
      + coalesce(direito_economico_atleta_pct, 0)
      + coalesce(direito_economico_terceiro_pct, 0)
    ) <= 100
  );

-- Evolução salarial — histórico/agenda de mudanças futuras de uma rubrica, preso ao contrato.
create table public.atleta_contrato_evolucao_salarial (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.atleta_contratos(id) on delete cascade,
  rubrica text not null check (
    rubrica in ('salario_ctps', 'direito_imagem', 'bonificacao', 'auxilio_moradia', 'outros')
  ),
  data_vigencia date not null,
  novo_valor numeric(12, 2) not null,
  criado_por_perfil_id uuid references public.perfis(id) on delete set null,
  criado_por_nome text,
  created_at timestamptz not null default now()
);

create index atleta_contrato_evolucao_salarial_contrato_id_idx
  on public.atleta_contrato_evolucao_salarial (contrato_id);

alter table public.atleta_contrato_evolucao_salarial enable row level security;

create policy "authenticated_full_access" on public.atleta_contrato_evolucao_salarial
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atleta_contrato_evolucao_salarial to authenticated;

-- `criar_contrato_atleta` ganha 4 parâmetros novos (com default null) para os direitos
-- econômicos — chamadas existentes continuam funcionando sem passá-los.
create or replace function public.criar_contrato_atleta(
  p_atleta_id uuid,
  p_tipo_contrato text,
  p_clube_origem text,
  p_vigencia_inicio date,
  p_vigencia_fim date,
  p_salario_ctps numeric,
  p_direito_imagem numeric,
  p_bonificacao numeric,
  p_auxilio_moradia numeric,
  p_outros numeric,
  p_criado_por_perfil_id uuid,
  p_criado_por_nome text,
  p_direito_economico_juventus_pct numeric default null,
  p_direito_economico_atleta_pct numeric default null,
  p_direito_economico_terceiro_nome text default null,
  p_direito_economico_terceiro_pct numeric default null
) returns public.atleta_contratos
language plpgsql
as $$
declare
  novo public.atleta_contratos;
begin
  update public.atleta_contratos
  set vigente = false, encerrado_em = now()
  where atleta_id = p_atleta_id and vigente;

  insert into public.atleta_contratos (
    atleta_id, tipo_contrato, clube_origem, vigencia_inicio, vigencia_fim,
    salario_ctps, direito_imagem, bonificacao, auxilio_moradia, outros,
    criado_por_perfil_id, criado_por_nome,
    direito_economico_juventus_pct, direito_economico_atleta_pct,
    direito_economico_terceiro_nome, direito_economico_terceiro_pct
  ) values (
    p_atleta_id, p_tipo_contrato, p_clube_origem, p_vigencia_inicio, p_vigencia_fim,
    p_salario_ctps, p_direito_imagem, p_bonificacao, p_auxilio_moradia, p_outros,
    p_criado_por_perfil_id, p_criado_por_nome,
    p_direito_economico_juventus_pct, p_direito_economico_atleta_pct,
    p_direito_economico_terceiro_nome, p_direito_economico_terceiro_pct
  ) returning * into novo;

  update public.atletas
  set tipo_contrato = p_tipo_contrato, data_fim_contrato = p_vigencia_fim
  where id = p_atleta_id;

  return novo;
end;
$$;

notify pgrst, 'reload schema';
```

Não mexe em `atleta_base_contratos_old` (tabela legada, já fora de uso desde a unificação
de 28/10) nem em `criar_contrato_atleta_base` (idem).

## Formulário "Novo contrato" / "Aditivo"

- `ContratoForm` ganha uma seção "Direitos econômicos" (3 campos de percentual + o nome do
  terceiro) e aceita um novo prop `modoAditivo?: boolean` — quando `true`, o campo Tipo de
  contrato aparece travado em "Definitivo" (sem `<select>`, só texto + um campo `hidden`).
- `NovoContratoAtletaPage` passa a ler também `searchParams.modo` — quando `"aditivo"`,
  busca o contrato vigente do atleta e usa seus valores como `values` iniciais do
  formulário (em vez de vazio), e passa `modoAditivo`. Título da página e texto de apoio
  mudam ("Aditivo de contrato" / "Isso encerra o contrato atual e cria um aditivo a partir
  dele.").
- `ContratoSecao` ganha o botão "Aditivo" ao lado de "Novo contrato" (só quando existe
  vigente) e o selo de status descrito na seção 5.
- `criarContrato` (action) passa a ler e enviar os 4 campos novos de direitos econômicos
  pra `criar_contrato_atleta`.

## Evolução salarial — UI e ações

- `ContratoCard` (quando é o vigente) ganha, logo abaixo das rubricas: lista das evoluções
  já cadastradas pra este contrato (rubrica, data, novo valor, botão "Remover") + o
  mini-formulário de adicionar (reaproveitando o padrão de `ContatoEmergenciaForm`).
- Novas ações em `app/atletas/[id]/contrato/actions.ts`:
  - `salvarEvolucaoSalarial(prevState, formData)` — valida (rubrica, data, valor),
    insere em `atleta_contrato_evolucao_salarial` com `contrato_id` vindo de um campo
    oculto do formulário.
  - `removerEvolucaoSalarial(formData)` — apaga por `id`, revalida a página do atleta
    (mesmo padrão de `removerContatoEmergencia`).
- O aviso "Evolução salarial em N dias" (seção 4) aparece acima do `ContratoCard` do
  vigente, quando `evolucoesProximas` retorna algo.

## Fora de escopo

- Dashboard/painel geral com alertas combinados de vários atletas — frente própria, já
  combinada que vem depois; a função `evolucoesProximas` já fica pronta pra ser reutilizada
  lá.
- Mudar `atleta_contratos_old`/`criar_contrato_atleta_base` (tabela/função legadas da Base,
  já fora de uso).
- Limpeza das colunas antigas de contrato em `atletas` (`numero_fpf`, `tipo_contrato` solto,
  etc.) — já estava fora de escopo desde a spec original de 16/10.

## Arquivos afetados

- `supabase/migrations/0158_atleta_contrato_extensoes.sql` (novo)
- `lib/supabase/types.ts` — `AtletaContratoRow` (4 campos novos), nova
  `AtletaContratoEvolucaoSalarialRow`
- `lib/validation/schemas.ts` — `atletaContratoSchema` (direitos econômicos), nova
  `atletaContratoEvolucaoSalarialSchema`, novo `RUBRICA_CONTRATO_OPTIONS`/
  `RUBRICA_CONTRATO_LABEL`
- `lib/futebol/contrato.ts` (novo) — `diasRestantesContrato`, `valorEfetivoRubrica`,
  `evolucoesProximas`, `statusContrato` (selo)
- `lib/futebol/contrato.test.ts` (novo)
- `components/contrato-secao.tsx` — selo de status, botão Aditivo, dias restantes,
  direitos econômicos, bloco de evolução salarial
- `components/contrato-form.tsx` — seção de direitos econômicos, `modoAditivo`
- `components/evolucao-salarial-form.tsx` (novo) — mini-formulário "+ Adicionar evolução"
- `app/atletas/[id]/contrato/novo/page.tsx` — `searchParams.modo`, pré-preenchimento
- `app/atletas/[id]/contrato/actions.ts` — `criarContrato` (novos campos),
  `salvarEvolucaoSalarial`, `removerEvolucaoSalarial`
- `app/atletas/[id]/ver/page.tsx`, `app/atletas/[id]/page.tsx` — passam as evoluções pro
  `ContratoSecao` (hoje só passam `contratos`)

## Verificação

- `npx tsc --noEmit -p tsconfig.json` sem erros antes de subir.
- Testes novos em `lib/futebol/contrato.test.ts` cobrindo `diasRestantesContrato` (com e
  sem `vigencia_fim`, data já passada), `valorEfetivoRubrica` (sem evolução, com uma, com
  várias em datas diferentes) e `evolucoesProximas` (ordenação, exclui já aplicadas).
- Verificação manual: criar um contrato novo com direitos econômicos somando mais de 100%
  (deve bloquear); fazer um Aditivo e confirmar que o anterior vira histórico e o tipo fica
  "Definitivo"; adicionar uma evolução salarial futura e ver o aviso de dias contando;
  adicionar uma evolução com data de hoje/passada e confirmar que o valor efetivo no card e
  no Financeiro já reflete o novo valor.
