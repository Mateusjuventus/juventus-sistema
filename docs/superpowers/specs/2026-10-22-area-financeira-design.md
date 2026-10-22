# Área Financeira — design

## Contexto

Mateus criou um usuário pra quem cuida do financeiro, que só precisa acessar o Relatório de
Despesas (e o Orçamento Previsto) de cada jogo. Hoje essas duas telas moram dentro da própria tela
do jogo (`/jogos/[id]/financeiro` no Profissional, `/base/jogos/[id]/financeiro` na Base), que é
uma aba a mais ao lado de Convocação, Súmula, Programação, Logística, Credenciamento, Checklist,
Vagas de Staff, Recibo de Pagamento e Carga de Ingressos — todas protegidas pelo mesmo módulo
"Jogos". Pra esse usuário enxergar o Financeiro de um jogo, hoje ele precisaria do módulo "Jogos"
inteiro liberado, ganhando de brinde acesso a todas as outras abas, que não são da conta dele.

A primeira ideia (tratar isso como uma permissão nova dentro do módulo "Financeiro" que já existe)
foi descartada: amarraria esse acesso a quem quer que já tenha o módulo "Financeiro" marcado por
outro motivo, sem controle fino de quem especificamente pode ver.

A solução escolhida segue o mesmo padrão já usado pro Treinador (`docs/superpowers/specs/
2026-08-19-parecer-final-treinador-design.md`): um papel (`role`) próprio, com uma área isolada do
resto do sistema — quem tem esse papel não vê menu, módulos nem nenhuma outra tela.

## Escopo

- Um novo papel em `perfis.role`: `'financeiro'`.
- Área própria em `/area-financeira`, fora do AppShell normal (sem sidebar, sem módulos).
- Vê jogos dos dois departamentos (Profissional e Base) — sem distinção/restrição por categoria
  ou departamento nesta primeira versão (mesma decisão inicial do Treinador antes de ganhar
  `categorias_treinador` — se um dia for preciso restringir alguém desse papel a só um
  departamento, adiciona-se uma coluna de escopo depois, do mesmo jeito).
- Só leitura: vê os lançamentos de gasto (previsto/efetuado), gera os PDFs do Orçamento Previsto e
  do Relatório de Despesas. Não lança, não edita, não exclui gasto, não assina nenhum documento
  (hoje esse usuário não é configurado como assinante em `configuracoes_financeiro`/
  `configuracoes_financeiro_base`, e a tela nem mostra ação de assinar pra esse papel).
- Fora de escopo: qualquer outra aba do jogo (Convocação, Súmula, Programação, Logística,
  Credenciamento, Checklist, Vagas, Recibo, Ingressos), despesas avulsas, "Geral" (custo de
  Comissão Técnica/Atletas), configurações de assinatura, documentos pendentes/notificações de
  assinatura.

## Telas

**`/area-financeira`** — lista dos jogos dos dois departamentos (cartão com adversário, competição,
data, categoria quando for Base), ordenada por data. Reaproveita os mesmos cartões de jogo já
usados em outras listagens (`JogoCardBase`/equivalente do Profissional), com um rodapé próprio
("Ver despesas") no lugar das ações que já existem hoje.

**`/area-financeira/jogos/[id]`** (Profissional) e **`/area-financeira/base/jogos/[id]`** (Base) —
versão só-leitura da tela de Financeiro de hoje: mesmas tabelas de gasto (por fase, com subtotal),
mesmo total geral, mesmos botões "Gerar PDF do Orçamento Previsto" e "Gerar PDF do Relatório de
Despesas". Sem "+ Novo gasto", sem "Editar"/"Excluir" em cada lançamento, sem `JogoTabs` (não há
outras abas pra navegar) — só um link "← Voltar" pra `/area-financeira`.

Os dados vêm das mesmas tabelas de sempre (`gastos_jogo`/`gastos_jogo_base`, `jogos`/`jogos_base`,
`categorias_gasto`, `configuracoes_financeiro`/`configuracoes_financeiro_base`) — nada é duplicado
nem recalculado de forma diferente do que a tela de Financeiro de hoje já faz.

## Permissões e segurança

- Middleware: papel `'financeiro'` é tratado como o Treinador é hoje — qualquer rota fora de
  `/area-financeira` (e as exceções já existentes, tipo `/minha-conta`) redireciona pra lá.
- Nenhuma Server Action de gasto (criar/editar/excluir) é exposta nessa área — as páginas de
  `/area-financeira` nem importam essas actions. Mesmo que alguém tentasse acessar direto a URL de
  criar/editar gasto do Profissional/Base, o middleware já bloqueia antes (essas rotas continuam
  dentro do módulo "Jogos", que esse papel nunca tem).

## Migration

Uma migration pequena, no mesmo padrão da 0079 (que liberou o papel "treinador"):

```sql
alter table public.perfis drop constraint perfis_role_check;
alter table public.perfis add constraint perfis_role_check
  check (role in ('master', 'regular', 'treinador', 'financeiro'));
```

## Tela de Usuários (`/usuarios`)

O seletor de papel ganha a opção "Financeiro", ao lado de Master/Regular/Treinador. Quando esse
papel é escolhido, os checkboxes de módulos/departamentos somem do formulário (mesmo comportamento
de hoje quando se escolhe "Treinador").
