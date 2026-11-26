# Relação de Atletas (Formação e Profissional) para Financeiro/Controladoria

**Data:** 26/11/2026
**Pedido por:** Mateus

## Contexto

Mensalmente, Mateus precisa mandar pro Financeiro/Controladoria do clube uma relação atualizada
dos atletas do Futebol de Base (Sub-20 pra baixo) que têm contrato de Formação ou contrato
Profissional (Definitivo/Empréstimo), com os valores e o período de cada contrato. Hoje isso não
existe como documento no sistema — precisa ser montado manualmente.

Esse pedido surgiu no meio de uma conversa sobre adicionar colunas de dados bancários e escolha de
orientação (retrato/paisagem) no Relatório Avulso já existente (`app/relatorios/avulso/` e
`app/base/relatorios/avulso/`). Mateus decidiu que essa necessidade merece um módulo próprio, em
vez de forçar no Avulso — este documento cobre só esse módulo novo; a mudança no Avulso foi
descartada por enquanto.

O sistema já tem uma modelagem completa de Contrato de Atleta (`atleta_contratos`, ver
`0137_atleta_contrato.sql` e extensões em `0158_atleta_contrato_extensoes.sql`): tipo de contrato,
clube de origem (quando é empréstimo), vigência, as rubricas de remuneração (salário CTPS, direito
de imagem, bonificação, auxílio moradia, outros), direitos econômicos em %, evolução salarial
agendada, e histórico automático de contratos anteriores (um "vigente" por vez). Este módulo novo
não precisa desse dado do zero — só precisa ler e apresentar.

## Decisões

- **Destinatário:** Financeiro e controladoria (interno/externo ao clube) — não é uma exigência de
  federação (FPF/CBF), é um controle financeiro do próprio Juventus. Isso significa que não há um
  formato fixo imposto por terceiros: o formato e os campos são os que o Mateus definir aqui.
- **Escopo de atletas:** só Futebol de Base, categorias Sub-20 pra baixo (toda `TODAS_CATEGORIAS_BASE`
  — Sub-20 a Sub-11). Futebol Profissional (equipe principal) fica de fora deste módulo.
- **Tipos de contrato incluídos:** Formação e Profissional (Definitivo + Empréstimo). Amador e
  Iniciação ficam de fora — não têm remuneração relevante pro Financeiro acompanhar.
- **Status:** atletas Dispensados ficam fora do cálculo automático.
- **Mecanismo de inclusão/remoção:** automático por padrão (critério acima), com exceções manuais
  que persistem mês a mês (Abordagem B das 3 propostas — ver seção "Mecanismo de exceções"
  abaixo). Decisão explícita do Mateus: nem 100% automático (sem conseguir tirar ninguém), nem
  100% manual (teria que montar a lista toda vez do zero).
- **Agrupamento:** dois blocos separados no documento — "Formação" (tipo_contrato = formacao) e
  "Profissional" (tipo_contrato = definitivo ou emprestimo) — não uma tabela única misturada.
- **Dados por atleta:** Nome completo, CPF, Data de nascimento, Tipo de contrato (com Clube de
  origem quando for Empréstimo), Vigência (início e fim — fim fica em branco quando o contrato não
  tem prazo definido, mesmo comportamento que o campo já tem hoje), as 5 rubricas de remuneração,
  Valor total (soma automática). Só no bloco Profissional: evolução salarial futura já agendada pro
  contrato (se existir), com data e novo valor.
- **Formato de saída:** PDF e Excel — os dois, pedido explícito do Mateus (o Excel é mais fácil pro
  Financeiro mexer nos números).
- **Quem gera:** só master (mesma trava `isMaster` dos outros relatórios do sistema).

## Mecanismo de exceções

Uma tabela nova, `atleta_relacao_formacao_profissional_excecoes`, guarda exceções manuais por
atleta:

```sql
create table public.atleta_relacao_formacao_profissional_excecoes (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas_base(id) on delete cascade,
  tipo text not null check (tipo in ('incluir', 'excluir')),
  criado_por_perfil_id uuid references public.perfis(id) on delete set null,
  criado_por_nome text,
  created_at timestamptz not null default now(),
  unique (atleta_id)
);

create index atleta_relacao_formacao_profissional_excecoes_atleta_id_idx
  on public.atleta_relacao_formacao_profissional_excecoes (atleta_id);

alter table public.atleta_relacao_formacao_profissional_excecoes enable row level security;

create policy "authenticated_full_access" on public.atleta_relacao_formacao_profissional_excecoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atleta_relacao_formacao_profissional_excecoes to authenticated;

notify pgrst, 'reload schema';
```

Segue o mesmo padrão de RLS/grant das demais tabelas novas do sistema (`atleta_contratos`,
`atleta_contrato_evolucao_salarial`) — acesso liberado pra qualquer usuário autenticado, sem
política mais granular (igual ao resto do banco hoje). `atleta_id` referencia `atletas_base`
porque o escopo deste módulo é só Futebol de Base (Sub-20 pra baixo) — não faz sentido apontar pra
`atletas` (Profissional).

- `unique (atleta_id)`: um atleta só pode ter UMA exceção ativa por vez (ou "sempre incluir", ou
  "sempre excluir" — nunca os dois). Criar uma exceção nova pro mesmo atleta substitui a anterior
  (upsert).
- `tipo = 'excluir'`: atleta que bateria no critério automático, mas foi removido manualmente (ex.:
  saiu do clube mas o cadastro ainda não foi atualizado, ou qualquer outro motivo pontual). Fica de
  fora de todas as gerações futuras até a exceção ser apagada.
- `tipo = 'incluir'`: atleta que NÃO bate no critério automático (outra categoria, outro tipo de
  contrato, ou até Dispensado), mas deve aparecer mesmo assim. Fica em todas as gerações futuras
  até a exceção ser apagada.
- Cálculo da lista final: `(candidatos automáticos ∪ exceções 'incluir') − exceções 'excluir'`.
- Apagar uma exceção (botão "Remover exceção" na tela) volta o atleta pro comportamento 100%
  automático — não precisa escolher de novo o que ele "deveria" ser.

## Tela (`/base/relatorios/formacao-profissional`)

Só master acessa (redireciona como as outras telas restritas). Mostra:

1. **Bloco Formação** e **Bloco Profissional**: lista de atletas já calculada (automático +
   exceções), cada linha com os dados principais (nome, tipo, vigência, valor total) e um botão
   "Remover da relação" (cria uma exceção `excluir` pro atleta daquela linha).
2. **Adicionar atleta fora do padrão**: um campo de busca (mesmo padrão `ListaSelecao` já usado no
   Relatório Avulso) listando atletas da Base que ainda não estão na relação — selecionar um cria
   uma exceção `incluir`.
3. **Exceções ativas**: uma lista simples mostrando quem está incluído/excluído manualmente hoje,
   com botão "Remover exceção" em cada linha (volta ao automático).
4. Dois botões no topo: **Baixar PDF** e **Baixar Excel** — cada um abre/baixa o documento com a
   lista calculada no momento do clique (os documentos não ficam "salvos"; são gerados na hora,
   igual aos outros relatórios do sistema).

## PDF

Novo `lib/pdf/relacao-formacao-profissional-document.tsx`, seguindo o padrão visual dos outros
documentos (`logistica-shared.tsx`: cabeçalho com escudo, `sharedStyles.page`, `DocumentoFooter`).
Duas tabelas (uma por bloco), mesmo estilo de `TabelaPessoas` já usado em
`relatorio-avulso-document.tsx`/`relacao-atletas-base-document.tsx`. Título do documento:
"Relação de Atletas — Formação e Profissional", com a data de geração no rodapé (já padrão).
Rota: `app/base/relatorios/formacao-profissional/pdf/route.tsx` (POST ou GET simples — sem
parâmetros de formulário, já que a lista vem inteira do cálculo automático + exceções).

## Excel

Reaproveita `lib/xlsx-export.ts` (`buildXlsxResponse`), mesmo usado em
`app/comissao-tecnica/export/route.ts`. Duas abas, "Formação" e "Profissional", com as mesmas
colunas do PDF (datas e valores formatados como no exemplo de `comissao-tecnica/export/route.ts`:
`formatData`/`formatMoeda`). Rota: `app/base/relatorios/formacao-profissional/export/route.ts`.

## Fora de escopo (por enquanto)

- Qualquer envio automático (e-mail, etc.) — o Mateus baixa e manda por fora do sistema, como os
  outros relatórios.
- Histórico de gerações passadas (quem recebeu, quando foi mandado) — não foi pedido.
- Mudanças no Relatório Avulso (dados bancários, orientação retrato/paisagem) — descartadas nesta
  conversa, podem voltar como pedido separado no futuro.
