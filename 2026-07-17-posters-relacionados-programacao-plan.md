# Plano de implementação — Relacionados, Concentração e Dia de Jogo

Referência: `docs/superpowers/specs/2026-07-17-posters-relacionados-programacao-design.md`

## Fase 1 — Banco de dados

- Migration `0028_apelido_atletas_comissao.sql`: `apelido text` (opcional) em `atletas` e
  `comissao_tecnica`.
- Migration `0029_jogo_programacao.sql`: 3 campos novos em `jogos`
  (`concentracao_data date`, `concentracao_regras text` com default das 5 regras do exemplo,
  `dia_jogo_liberacao text`) + tabela nova `jogo_programacao_itens` (ver spec) + policies/grants
  (leitura authenticated, escrita authenticated com módulo Jogos — mesma regra das tabelas
  dependentes de `jogos` já existentes) + `grant ... to service_role` incluso de cara (lição da
  rodada passada — não esperar dar erro em produção pra descobrir que faltou).
- Atualizar `lib/supabase/types.ts` (`AtletaRow`, `ComissaoTecnicaRow`, `JogoRow`, novo
  `JogoProgramacaoItemRow`).

## Fase 2 — Apelido nos cadastros

- `app/atletas/atleta-form.tsx` + `app/atletas/actions.ts`: campo "Apelido" (texto opcional) logo
  abaixo de "Nome completo".
- `app/comissao-tecnica/*` (form + actions) equivalente.
- Sem mudança de UI na listagem dessas telas (apelido não aparece lá, só no cadastro e nos
  pôsteres).

## Fase 3 — Base compartilhada dos pôsteres

- Baixar a fonte **Anton** (Google Fonts, via pacote npm `@fontsource/anton` só pra extrair o
  arquivo `.ttf`) e salvar em `public/fonts/anton.ttf`.
- `lib/posters/estilo.ts`: constantes compartilhadas (cores vinho/dourado já usadas no Presskit,
  medidas do poste A4/retrato, caminho da fonte).
- Adicionar dependência `sharp` ao `package.json` (conversão PNG → JPEG de verdade).
- `lib/posters/relacionados-data.ts`, `concentracao-data.ts`, `dia-jogo-data.ts`: funções que
  buscam e formatam os dados de cada pôster a partir do Supabase (reaproveitadas pelo PDF e pelo
  JPG de cada um).

## Fase 4 — Pôster Relacionados

- `lib/pdf/relacionados-document.tsx` (react-pdf) + `lib/posters/relacionados-imagem.tsx`
  (next/og) — mesmo layout nas duas tecnologias.
- Rotas: `app/jogos/[id]/relacionados/pdf/route.tsx` e
  `app/jogos/[id]/relacionados/jpg/route.tsx`.
- Botões nos "Gerar Relacionados (PDF)" / "(JPG)" na aba Convocação
  (`app/jogos/[id]/convocacao/page.tsx`), ao lado do botão de Presskit já existente, com a mesma
  regra de habilitação (precisa ter convocação salva com ao menos 1 atleta).

## Fase 5 — Aba Programação (schedule editável)

- Nova aba `programacao` em `JogoTabs` (`components/jogo-tabs.tsx`).
- `app/jogos/[id]/programacao/page.tsx` + `actions.ts`: formulário de adicionar linha (horário,
  atividade, local, checkbox "é o confronto" só na seção Dia de Jogo) + lista com botão remover,
  pra cada uma das duas seções (`tipo = 'concentracao'` / `'dia_jogo'`).
- Formulário pequeno pros 3 campos do jogo (`concentracao_data`, `concentracao_regras`,
  `dia_jogo_liberacao`) na mesma página.

## Fase 6 — Pôster Concentração

- `lib/pdf/concentracao-document.tsx` + `lib/posters/concentracao-imagem.tsx`.
- Rotas `app/jogos/[id]/programacao/concentracao/pdf/route.tsx` e `.../jpg/route.tsx`.
- Botões "Gerar Concentração (PDF/JPG)" na aba Programação — desabilitados sem `concentracao_data`
  ou sem nenhuma linha cadastrada.

## Fase 7 — Pôster Dia de Jogo

- `lib/pdf/dia-jogo-document.tsx` + `lib/posters/dia-jogo-imagem.tsx` — linha `eh_confronto` vira
  "JUVENTUS X <ADVERSÁRIO>" (ou o inverso se for fora) automaticamente.
- Rotas `app/jogos/[id]/programacao/dia-jogo/pdf/route.tsx` e `.../jpg/route.tsx`.
- Botões "Gerar Dia de Jogo (PDF/JPG)" na mesma aba.

## Fase 8 — Verificação e entrega

- `npm run typecheck` e `npm run build` limpos.
- Reverter `tsconfig.tsbuildinfo`.
- Empacotar `.zip` com todos os arquivos novos/alterados + as 2 migrations SQL destacadas na
  mensagem de entrega (texto pronto pra colar no SQL Editor do Supabase).
- Explicar pro Mateus, em português simples: o que apareceu de novo (aba Programação, campo
  Apelido, botões de gerar), e que Competições com foto fica pra próxima rodada.

## Ordem de entrega ao Mateus

Dado o tamanho, a entrega será em 2 pacotes (ele já teve retorno positivo pra "tudo junto, em
etapas" — mas como decidiu focar só nos pôsteres por ora, ambos pacotes chegam nesta mesma
conversa, um após o outro, sem esperar aprovação intermediária, já que o desenho todo já foi
aprovado):

1. **Pacote A** (Fases 1–4): apelido + Relacionados funcionando ponta a ponta.
2. **Pacote B** (Fases 5–7): aba Programação + Concentração + Dia de Jogo.

Fase 8 roda ao final de cada pacote (typecheck/build antes de qualquer entrega).
