# Plano de implementação — Atletas: Desativação com Motivo, Transição de Categoria e Dados de Pagamento

Baseado em `docs/superpowers/specs/2026-11-04-atletas-desativacao-transicao-pagamento-design.md`, aprovada pelo Mateus. Ordem: schema primeiro, depois tipos/permissão, depois cada frente (1, 2, 3) de ponta a ponta (lib → actions → UI), com verificação no final de cada uma.

**Nenhuma pré-condição bloqueante** (diferente da Unificação de Atletas, que exigia zero RG/CPF nulos antes de alterar a constraint) — todas as colunas novas são opcionais/nullable.

## 1. Migration SQL (`0160_atletas_desativacao_transicao_pagamento.sql`)

Mesmos moldes de `0159_atleta_contrato_gatilhos.sql` (RLS `authenticated_full_access` + grants):

1. Tabela nova `atletas_ativo_historico`:
   ```sql
   create table public.atletas_ativo_historico (
     id uuid primary key default gen_random_uuid(),
     atleta_id uuid not null references public.atletas(id) on delete cascade,
     ativo boolean not null,
     motivo text,
     observacao text,
     data date not null default current_date,
     criado_por_perfil_id uuid references public.perfis(id) on delete set null,
     criado_por_nome text,
     created_at timestamptz not null default now()
   );
   create index atletas_ativo_historico_atleta_id_idx on public.atletas_ativo_historico (atleta_id);
   alter table public.atletas_ativo_historico enable row level security;
   create policy "authenticated_full_access" on public.atletas_ativo_historico
     for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
   grant select, insert, update, delete on public.atletas_ativo_historico to authenticated;
   ```
2. Colunas novas em `atletas` (Dados de Pagamento):
   ```sql
   alter table public.atletas
     add column tipo_pagamento text check (tipo_pagamento in ('pf', 'pj')),
     add column empresa_imagem_nome text,
     add column empresa_imagem_cnpj text;
   ```
3. Coluna nova em `perfis` (permissão de transição de categoria):
   ```sql
   alter table public.perfis add column pode_transitar_categoria_atleta boolean;
   ```
4. `notify pgrst, 'reload schema';`

## 2. Tipos TypeScript (`lib/supabase/types.ts`)

- `AtletaRow`: acrescentar `tipo_pagamento: "pf" | "pj" | null`, `empresa_imagem_nome: string | null`, `empresa_imagem_cnpj: string | null`.
- Tipo novo `AtletaAtivoHistoricoRow` (espelhando `AtletaStatusHistoricoRow`): `id`, `atleta_id`, `ativo`, `motivo: string | null`, `observacao: string | null`, `data`, `criado_por_perfil_id`, `criado_por_nome`, `created_at`.

## 3. Permissão nova (`lib/auth/role.ts`)

- `PerfilPermissoes`: acrescentar `pode_transitar_categoria_atleta: boolean | null`, com comentário apontando pra spec.
- Incluir `pode_transitar_categoria_atleta` na lista de colunas do `select` em `buscarPerfilPermissoes`.
- Função nova `getPodeTransitarCategoriaAtleta(supabase)`, mesmo padrão de `getFisioterapiaPodeEditar`: `role === "master"` sempre `true`; senão `perfil.pode_transitar_categoria_atleta ?? false`.

## 4. Tela de Usuários (`app/usuarios/page.tsx` + `app/usuarios/actions.ts`)

- UI: mesmo componente de toggle já usado pra "Pode inserir e editar registros de Fisioterapia" (`opcoes`/`valoresIniciais`/`action`/`submitLabel`), com o rótulo "Pode transitar atletas entre categorias (Base e Profissional)".
- `actions.ts`: função `parsePodeTransitarCategoriaAtleta(formData)` (mesmo padrão de `parseFisioterapiaPodeEditar`) + action `atualizarPodeTransitarCategoriaAtleta(id, formData)` que faz `update({ pode_transitar_categoria_atleta })` e `revalidatePath("/usuarios")`.
- Incluir o campo no payload de criação de usuário (`criarUsuario`, onde `fisioterapia_pode_editar` já é setado) — default `false`/`null`.

## 5. Frente 1 — Desativação com motivo + histórico

### 5.1 Lib (`lib/futebol/ativo-historico.ts`, novo módulo)

Espelha a estrutura de `lib/futebol/status-historico.ts`, com funções próprias pro formato de linha (`ativo` booleano, não `status` enum):

- `linhaMaisRecenteAtivo<T>(linhas: T[]): T | null` — mesmo critério de empate (maior `data`, depois `created_at`).
- `LinhaAtivoHistoricoComDias` + `calcularLinhaDoTempoAtivo(linhas, hojeStr)` — mesmo cálculo de `dias` de `calcularLinhaDoTempo`.
- `registrarAtivoAtleta(supabase, atletaId, ativo, motivo, observacao, data)`: insere a linha (resolvendo `criado_por_nome` via `nomeDaContaAtual`, nunca um campo escolhido) e depois `recomputarAtivoAtual` (mesma ideia de `recomputarStatusAtual`, relê a mais recente e sincroniza `atletas.ativo`).
- Testes (`ativo-historico.test.ts`): mesma cobertura de `status-historico.test.ts` adaptada (linha mais recente, cálculo de dias, lista vazia).

### 5.2 Motivos fixos (`lib/validation/schemas.ts` ou `lib/futebol/ativo-historico.ts`)

```ts
export const MOTIVO_DESATIVACAO_ATLETA_OPTIONS = [
  { value: "rescisao_contrato", label: "Rescisão de contrato" },
  { value: "fim_contrato", label: "Fim de contrato (não renovado)" },
  { value: "transferencia_venda", label: "Transferência/venda para outro clube" },
  { value: "emprestimo", label: "Empréstimo para outro clube" },
  { value: "outro", label: "Outro" },
] as const;
```

Validação (zod): `motivo` obrigatório (um dos 5 valores) quando `ativo = false`; se `motivo === "outro"`, exige `motivoOutro` (texto livre) — gravado em `motivo` como o texto digitado (ou gravar o texto em `observacao` e manter `motivo = "outro"`, a decidir na hora, mas sem ambiguidade: usar `motivo` sempre como o rótulo final mostrado no histórico). Quando `ativo = true` (reativação), `observacao` é obrigatória (texto livre), `motivo` fica `null`.

### 5.3 Actions (`app/atletas/actions.ts`)

Substituir `alternarAtletaAtivo` (que só fazia `update({ ativo })`) por uma Server Action com estado de formulário (`useFormState`, mesmo padrão de `lancarStatusManual`):

```ts
export interface AtivarDesativarAtletaFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function alternarAtletaAtivoComMotivo(
  _prevState: AtivarDesativarAtletaFormState,
  formData: FormData,
): Promise<AtivarDesativarAtletaFormState> {
  // valida com o schema da seção 5.2, chama registrarAtivoAtleta, revalidatePath("/atletas") e
  // revalidatePath(`/atletas/${id}/ver`).
}
```

Action auxiliar `buscarHistoricoAtivo(atletaId)` (igual `buscarHistoricoStatus`) pro modal buscar sob demanda.

### 5.4 UI (`components/atleta-ativo-button.tsx` → vira um modal, mesmo padrão de `HistoricoStatusModal`)

- Botão "Desativar atleta"/"Reativar atleta" abre uma caixa inline (não precisa ser modal cheio — pode ser o mesmo padrão de `NovoLancamentoForm`, um card que aparece no lugar do botão) com:
  - Se vai desativar: `SelectField` com `MOTIVO_DESATIVACAO_ATLETA_OPTIONS` (+ `TextField` condicional "Qual?" quando `motivo === "outro"`) e `TextField` opcional "Observação".
  - Se vai reativar: só `TextField` obrigatório "Observação/motivo da volta".
- Novo componente `HistoricoAtivoModal` (ou aba dentro da tela "Ver atleta"), mesmo layout de `HistoricoStatusModal`: lista a linha do tempo (ativo/inativo, motivo ou observação, data, quem registrou), sem edição inline (diferente do histórico de Status, que permite editar — aqui não foi pedido, manter simples: só leitura + as duas ações de desativar/reativar criam linhas novas).
- Link/botão "Ver histórico de desativações" na página "Ver atleta" (`app/atletas/[id]/ver/page.tsx`), ao lado do `AtletaAtivoButton`.
- Aproveitar a limpeza: o comentário de `atleta-ativo-button.tsx` ainda cita `alternarAtletaBaseAtivo`, função que não existe mais desde a unificação (ficou em `app/base/atletas/actions.ts`, já apagado como arquivo órfão) — remover essa referência stale ao reescrever o componente.

### 5.5 Verificação

`tsc`, `vitest run lib/futebol/ativo-historico.test.ts`, teste manual do fluxo completo (desativar com cada motivo, reativar, ver histórico).

## 6. Frente 2 — Transição de categoria

### 6.1 Campo Categoria travado (`app/atletas/atleta-form.tsx`)

- Quando `entityId` existir (edição), o `<SelectField>` de Categoria (linhas 81-99) vira somente leitura: trocar por um campo desabilitado mostrando o rótulo atual (`categoriaAtletaLabel(categoria)`) **mais** um `<input type="hidden" name="categoria" value={categoria} />` — sem isso o valor não seria enviado no submit, já que `<select disabled>` não posta nada.
- Quando `entityId` for `undefined` (criação), o `<select>` continua editável normalmente.

### 6.2 Lib (`lib/auth/categorias-base.ts` ou `lib/futebol/`)

Nenhuma função pura nova necessária — a ação só faz um `update` direto de `categoria`. Validação: nova categoria precisa ser um dos 8 valores de `CATEGORIAS_ATLETA` e diferente da atual.

### 6.3 Action (`app/atletas/actions.ts`)

```ts
export async function transitarCategoriaAtleta(
  _prevState: TransitarCategoriaFormState,
  formData: FormData,
): Promise<TransitarCategoriaFormState> {
  const supabase = createClient();
  if (!(await getPodeTransitarCategoriaAtleta(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }
  // valida atletaId + novaCategoria (required, ∈ CATEGORIAS_ATLETA, ≠ categoria atual)
  // update("atletas").set({ categoria: novaCategoria }).eq("id", atletaId)
  // revalidatePath("/atletas"); revalidatePath(`/atletas/${atletaId}/ver`); revalidatePath(`/atletas/${atletaId}`);
}
```

Checagem de permissão **sempre no servidor** (nunca confiar só em esconder o botão no client) — mesmo princípio já usado em `salvarParecerCaptacao`/`salvarRelatorioDispensaTreinador`.

### 6.4 UI

- Componente novo `components/transitar-categoria-form.tsx`: botão "Transitar atleta" que abre um `<select>` com as 8 categorias (exceto a atual) + confirmar/cancelar — mesmo padrão inline de `NovoLancamentoForm`.
- Renderizado em `app/atletas/[id]/ver/page.tsx`, visível só quando `await getPodeTransitarCategoriaAtleta(supabase)` for `true` (checagem no Server Component, não manda o botão pro client se não precisa).

### 6.5 Verificação

`tsc`, teste manual: marcar a permissão num perfil de teste, confirmar que sem ela o botão não aparece nem a action aceita, e que a categoria muda corretamente (incluindo Sub20 ↔ Profissional).

## 7. Frente 3 — Dados de Pagamento + reposicionar Tamanho do uniforme

### 7.1 Lib (`lib/futebol/contrato.ts`)

```ts
/** Igual espírito de `contratoTemRemuneracaoFormal`, mas pra "Dados de Pagamento" do cadastro do
 * atleta — conjunto diferente (inclui "formacao"): pedido do Mateus em 05/11/2026. */
export function atletaTemDadosPagamento(tipoContrato: string | null | undefined): boolean {
  return tipoContrato === "definitivo" || tipoContrato === "formacao" || tipoContrato === "emprestimo";
}
```

Teste em `contrato.test.ts`: `true` pra definitivo/formação/empréstimo, `false` pra amador/iniciação e pra `null`/`undefined`.

### 7.2 Páginas (`app/atletas/[id]/page.tsx`, `app/atletas/novo/page.tsx`)

- Em `[id]/page.tsx` (editar): reaproveitar a mesma lógica de `ContratoSecao` pra achar o vigente —
  ```ts
  const vigenteBruto = contratos.find((c) => c.vigente);
  const vigente = vigenteBruto && !contratoVazio(vigenteBruto) ? vigenteBruto : undefined;
  ```
  — e passar `tipoContratoVigente={vigente?.tipo_contrato ?? null}` pro `<AtletaForm>`.
- Em `novo/page.tsx` (criar): não existe contrato ainda — passar `tipoContratoVigente={null}` (seção fica escondida até o atleta ter um contrato).
- Acrescentar aos `defaultValues`: `tipoPagamento: atleta.tipo_pagamento ?? ""`, `empresaImagemNome: atleta.empresa_imagem_nome ?? ""`, `empresaImagemCnpj: atleta.empresa_imagem_cnpj ?? ""`.

### 7.3 Formulário (`app/atletas/atleta-form.tsx`)

- Nova prop `tipoContratoVigente?: string | null`.
- Mover o `<SelectField>` de "Tamanho do uniforme" (hoje a última linha de "Dados esportivos", linhas 370-382) pra logo depois de "Número da camisa" (antes de "Número CBF").
- Nova `<FormSection title="Dados de Pagamento">`, renderizada só quando `atletaTemDadosPagamento(tipoContratoVigente)` for `true`, logo depois de "Dados esportivos":
  - `SelectField` "Tipo de pagamento" (PF/PJ), com `useState` local (mesmo padrão de `categoria`/`possuiAlergia`) controlando um `tipoPagamento` reativo.
  - Quando `tipoPagamento === "pj"`: `TextField` "Nome da Empresa de Imagem" + `TextField` "CNPJ" (placeholder `00.000.000/0000-00`, mesmo padrão de `hoteis.cnpj` — sem máscara/validação forte).

### 7.4 Validação e action (`lib/validation/schemas.ts`, `app/atletas/actions.ts`)

- `atletaSchema`: acrescentar `tipoPagamento: z.enum(["pf", "pj"]).optional().or(z.literal(""))`, `empresaImagemNome`/`empresaImagemCnpj` opcionais, só exigidos (refino condicional, mesmo padrão de `refinoAlergia`) quando `tipoPagamento === "pj"`.
- `createAtleta`/`updateAtleta`: incluir os 3 campos novos no `insert`/`update`.

### 7.5 Verificação

`tsc`, `vitest run lib/futebol/contrato.test.ts`, teste manual: contrato Amador/Iniciação não mostra a seção; Definitivo/Formação/Empréstimo mostram; trocar PF↔PJ no form sem salvar (reatividade).

## 8. Verificação final (todas as frentes)

- `npx tsc --noEmit -p tsconfig.json`
- `npx vitest run`
- `npx next build`
- Sweep rápido: `git grep -n "alternarAtletaAtivo\b"` no repositório real (pedir ao Mateus) pra confirmar que nenhum outro lugar além de `app/atletas/[id]/ver/page.tsx` ainda chama a action antiga diretamente (ex.: algum atalho/teste esquecido).
- Entregar ao Mateus: arquivo de migration `0160_...sql` pra rodar no SQL Editor do Supabase (antes do deploy do código, mesma ordem de sempre), depois sincronizar os arquivos e passar os comandos de git.

## Observação sobre as fases futuras

Itens 1 (Dashboard/Painel principal) e 8 (melhorias na Comissão Técnica) da lista original de 8 pedidos continuam fora deste plano — cada um com seu próprio levantamento + spec quando chegar a vez, conforme já combinado com o Mateus.
