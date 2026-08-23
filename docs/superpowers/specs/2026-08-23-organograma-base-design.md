# Organograma do Futebol de Base

Data: 2026-08-23
Status: aprovado

## O pedido

O Mateus mandou uma imagem de referência (organograma feito fora do sistema, estilo/cores/fontes já
próximos da identidade do clube) com a estrutura do Departamento de Futebol de Base — coordenação
geral, coordenadores de área, "heads" por especialidade (Goleiros, Análise, Técnico, Performance,
Psicossocial) com uma linha por categoria dentro de cada um, e um bloco lateral de cargos de
saúde/suporte (Médico, Fisioterapia, Nutrição etc.). Quer isso dentro do sistema, editável, com
Diretor e Presidente entrando acima do Coordenador Geral.

## Decisões (confirmadas com o Mateus)

1. **Só Futebol de Base** — não é um organograma do clube inteiro nem do Profissional.
2. **Estrutura própria e editável**, independente da tabela `comissao_tecnica_base` — aquela tabela é
   organizada por categoria (uma pessoa pode ter várias `categorias`), enquanto o organograma agrupa
   por área ("Head de X"), com vagas em aberto ("???") e cargos (Presidente, Diretor) que não são
   comissão técnica de categoria nenhuma. Forçar o organograma a nascer direto de lá exigiria mudar o
   que aquela tabela representa.
3. **Ligação com a Comissão Técnica é por escolha, não automática por completo** — ao criar/editar uma
   caixa do organograma, dá pra escolher uma pessoa já cadastrada em `comissao_tecnica_base`: nome e
   função vêm de lá e continuam vivos (mudou o cadastro, muda a caixa). Caixas sem pessoa vinculada
   (Presidente, Diretor, "???") usam nome/cargo digitados direto na caixa.
4. **Arrastar para reposicionar** — cada caixa guarda a posição em que foi solta; abre já com um
   layout automático (por hierarquia/grupo) para quem nunca foi arrastada.
5. **Sub-módulo de Comissão Técnica / Diretoria** — não é um módulo novo com permissão própria. Vira
   uma segunda aba dentro de `/base/comissao-tecnica`, ao lado da lista que já existe. Mesma
   permissão (`comissao_tecnica`) libera as duas.
6. **Fora de escopo desta versão**: linhas de conexão que o usuário desenha à mão (as linhas seguem
   sempre "quem reporta pra quem"), zoom/pan de canvas, exportar como imagem/PDF, e qualquer coisa
   pro Profissional.

## Modelo de dados

Tabela nova `organograma_base`, uma linha por caixa:

```sql
create table public.organograma_base (
  id uuid primary key default gen_random_uuid(),
  comissao_tecnica_base_id uuid references public.comissao_tecnica_base(id) on delete set null,
  -- Usados só quando NÃO há pessoa vinculada (Presidente, Diretor, vaga em aberto "???").
  -- Com comissao_tecnica_base_id preenchido, nome/cargo exibidos vêm sempre do cadastro vinculado.
  nome text,
  cargo text,
  grupo text,             -- rótulo do cabeçalho da coluna (ex. "Head de Goleiros"); null = liderança
  reporta_para uuid references public.organograma_base(id) on delete set null,
  ordem integer not null default 0,
  pos_x integer,          -- posição arrastada; null = usa o layout automático
  pos_y integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

RLS/policy/grants no mesmo padrão de `comissao_tecnica_base` (`authenticated_full_access`).

Ao excluir uma caixa que tem outras reportando pra ela, `reporta_para` das filhas vira `null` (não
cascateia) — a tela avisa antes de confirmar, listando quem ficaria "solto".

## Telas

- `/base/comissao-tecnica` e `/base/comissao-tecnica/organograma` ganham uma barra de abas no topo
  ("Lista" / "Organograma"), mesmo padrão do `JogoTabs` já usado nas telas de jogo.
- `/base/comissao-tecnica/organograma`: área de canvas com as caixas (layout automático por
  hierarquia/grupo na primeira vez, depois respeita a posição arrastada de cada uma), linhas
  conectando cada caixa a quem ela reporta. Clicar numa caixa abre o formulário de edição
  (vincular/desvincular pessoa da Comissão Técnica, cargo quando não vinculada, grupo, reporta para,
  excluir). Um botão "+ Nova caixa" adiciona solta, pra em seguida arrastar e configurar.
- Visual: cores/tipografia do sistema (grená pras caixas de liderança, cards claros pro resto),
  inspirado no agrupamento em colunas por "Head" da imagem de referência — não uma cópia
  pixel-a-pixel, já que o número de pessoas por grupo é dinâmico.

## Fora de escopo

- Organograma do Futebol Profissional (mesma ideia, se pedido depois).
- Sincronizar automaticamente a partir da Comissão Técnica sem escolha manual por caixa.
- Editor de conexões livres, zoom/pan, exportação como imagem.
