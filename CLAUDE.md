# Instruções de projeto — juventus-sistema

Sistema de gestão do Clube Atlético Juventus SAF (Futebol Profissional + Futebol de Base). Next.js
14 (App Router) + Supabase (Postgres/RLS/Storage) + Tailwind. Português, cliente real (Mateus,
Supervisor de Futebol Profissional).

## Identidade visual — já definida, não reinventar

O sistema passou por um redesign visual completo e aprovado em 07/08/2026 (ver
`docs/superpowers/specs/2026-08-07-redesign-visual-painel-financeiro-design.md`). Isso significa
que, ao contrário de um projeto novo sem direção visual, **este projeto já tem uma identidade
própria e validada pelo cliente** — a tarefa ao construir uma tela nova não é inventar uma paleta/
tipografia do zero, é aplicar a que já existe com cuidado.

- **Cores**: `lib/theme.ts` é a fonte da verdade (`grena` #5C0A35 pra áreas grandes, `grenaEscuro`
  #3F0724 só pra texto/acentos pequenos — nunca preenchimento grande, `dourado` #B98F1E como acento
  pontual, `cinzaPagina` #EEF0F2 de fundo, sem bege). Espelhado em `tailwind.config.ts`.
- **Tipografia**: Inter via `next/font/google`, pesos 400–800.
- **Componentes compartilhados**: `.card`, `.btn-primary`, `.btn-secondary`, `.field-input` etc.
  (`app/globals.css` + `components/fields.tsx`, `components/submit-button.tsx`,
  `components/page-header.tsx`) — toda tela nova deve reaproveitar esses componentes em vez de
  estilizar do zero. Mudança de token se propaga sozinha; estilo solto numa tela não.
- **Estrutura**: `AppShell` (sidebar fixa à esquerda, 232px, fundo `grena`, item ativo com destaque
  dourado) é o chrome de toda tela autenticada. Telas fora desse padrão (ex.: `/treinador`, links
  públicos de inscrição/cadastro) são exceções deliberadas — ver a spec de cada uma.

## Ao construir UI nova

Mesmo dentro de um sistema com identidade fixa, cada tela nova ainda merece pensamento de design
deliberado, não só "encaixar campos num formulário genérico". Ao adicionar uma tela, documento ou
componente novo:

- Pergunte qual é o trabalho real daquela tela antes de desenhar — não copie a estrutura de outra
  tela só porque é a mais parecida disponível.
- Estruturas como numeração, rótulos, divisores só entram quando codificam algo verdadeiro sobre o
  conteúdo (uma sequência real), não como decoração padrão.
- Evite os defaults genéricos de UI gerada por IA (gradientes gratuitos, cards com ícone colorido
  sem função, badges numerados sem sequência real) — o padrão aprovado deste sistema já é mais
  sóbrio que isso.
- Documentos PDF (`lib/pdf/*.tsx`) seguem o mesmo raciocínio dentro do próprio sistema de
  `lib/pdf/logistica-shared.tsx` (cores, cabeçalho, rodapé, blocos de assinatura) — não recriam
  estilo do zero a cada documento novo.
- Texto de interface (rótulos, mensagens de erro, estados vazios) fala a língua de quem usa o
  sistema: nomeia as coisas pelo que a pessoa reconhece, não por como o banco/código chama o campo;
  erros dizem o que aconteceu e como resolver, sem se desculpar; um botão "Salvar parecer" gera uma
  mensagem "Parecer salvo", não um genérico "Sucesso".

## Fluxo de trabalho já em uso nesta sessão

- Specs de features vão em `docs/superpowers/specs/YYYY-MM-DD-<tema>-design.md` antes de
  implementar (skill de brainstorming).
- Migrations em `supabase/migrations/`, sequenciais — sempre colar o SQL completo no chat pra
  Mateus rodar no SQL Editor do Supabase (o sandbox não tem push direto pro banco dele).
- O git deste sandbox não consegue dar `git push` pro GitHub (proxy bloqueia, 403) — commits ficam
  locais aqui; a entrega de verdade é sincronizar os arquivos alterados na pasta local do usuário
  (`C:\Users\mateu\Documents\Projeto Juventus - Profissional\repo-atual`, via device bridge) e
  fornecer o comando de `git push` pra ele rodar do lado dele.
- Rodar `npx tsc --noEmit`, `npx vitest run` e `npx next build` antes de considerar uma
  implementação pronta pra entrega.
