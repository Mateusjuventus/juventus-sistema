# Módulo Tarefas

## Objetivo

Lista pessoal de atribuições do usuário (Mateus), separada dos módulos de cadastro. Não é um
cadastro de "entidades" do futebol (atleta, jogo, etc.) — é uma lista de afazeres de trabalho,
organizada por área e por status de andamento.

## Acesso

Botão "Tarefas" fixo no cabeçalho (`components/app-shell.tsx`), ao lado do botão "Sair",
visível em qualquer tela do sistema (Home, Base, Profissional, e dentro de qualquer módulo).
Fica visualmente separado dos links de módulo (Atletas/Comissão/Staff/Jogos) — não é um card de
departamento nem entra na lista de módulos do Futebol Profissional.

## Organização: categoria × status

Cada tarefa tem duas dimensões independentes:

- **Categoria** (fixa, 5 opções): Logística, Registro, Financeiro, Solicitações, Gerais. Vira as
  5 abas principais da tela `/tarefas` (`?categoria=`).
- **Status** (etiqueta): Pendente, Em andamento, Solicitado, Concluído.

Dentro de cada aba de categoria, as tarefas em aberto (pendente/andamento/solicitado) aparecem
em destaque; as concluídas ficam numa seção recolhida ("Concluídas (N)"), no mesmo padrão
`<details>`/`<summary>` já usado no cadastro de Staff Operacional para a função "mostrar mais".
Não é uma tela separada — é a mesma aba, só com as concluídas escondidas por padrão.

## Campos da tarefa

- Título (obrigatório)
- Descrição (opcional)
- Categoria (obrigatório, uma das 5 fixas)
- Status (obrigatório, default "pendente")
- Prazo (data, opcional) — se vencido e a tarefa não estiver concluída, aparece destacado em
  vermelho como "Atrasada" na listagem.

## Interações

- "+ Nova tarefa" leva para `/tarefas/novo`, com a categoria pré-selecionada pela aba atual.
- Troca de status é feita direto na listagem, por um seletor embutido na etiqueta (sem precisar
  abrir a tarefa para editar) — ação de servidor dedicada (`updateTarefaStatus`), separada do
  formulário completo de edição.
- Editar/Excluir seguem o mesmo padrão dos outros módulos (tela de edição completa +
  confirmação em duas etapas para excluir).

## Modelo de dados

Tabela `tarefas` (ver `supabase/migrations/0005_tarefas.sql`): `id`, `titulo`, `descricao`,
`categoria` (check constraint com as 5 categorias), `status` (check constraint com os 4 status,
default `pendente`), `prazo` (date, nullable), `created_by`, `created_at`, `updated_at`. RLS +
GRANT para `authenticated`, seguindo o padrão de todas as outras tabelas do projeto.

## Fora de escopo (por enquanto)

- Múltiplos usuários/atribuição de tarefa para outra pessoa — hoje é uma lista pessoal de quem
  está logado.
- Vincular tarefa a um jogo específico — cogitado, mas não pedido; pode entrar depois se fizer
  falta.
- Notificações/lembretes de prazo — só o destaque visual "Atrasada" por enquanto.
