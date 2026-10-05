# Rebranding: marca de software "Proxis Gestão Esportiva"

## Contexto

O Mateus está transformando o sistema (hoje rodando só os dados do Clube Atlético Juventus) num
produto próprio — "Proxis Gestão Esportiva" — que pode vir a atender outros clubes no futuro.
Pediu pra trocar a identidade visual do **software** (login, link/aba do navegador, sidebar, PDFs)
pela marca da Proxis, mantendo o Juventus como o clube cujos dados reais continuam no sistema.

Confirmado com o Mateus (brainstorming, uma pergunta por vez):

1. Proxis é a marca do software, não um reposicionamento do clube — o Juventus continua existindo
   como clube (nome, escudo, dados) nos lugares que representam o clube de verdade.
2. A paleta de cores do sistema (grena/dourado) **não muda** — é a identidade operacional do
   Juventus, independente de quem assina o software. A Proxis entra como selo/assinatura, não como
   repaginação de cores.
3. No login, o texto fica "Proxis como marca principal, com nota do clube" (não 100% genérico, nem
   mantendo o Juventus como título).
4. Nos PDFs, a marca da Proxis é uma linha discreta de rodapé (não uma marca d'água translúcida
   atravessando o conteúdo).
5. A tela de escolha de departamento (depois do login) recebe o mesmo tratamento do login.

## Escopo

### Chrome do software → vira Proxis

Lugares que identificam o *sistema*, não o clube: login, tela de escolha de departamento, sidebar,
cabeçalho da Área do Treinador, favicon/ícone do app, metadata/título da aba, rodapé dos PDFs.

### Dado real do clube → continua Juventus

Lugares que representam o Juventus de verdade pra quem está de fora ou pra identificar o clube num
documento oficial — não são "chrome do produto", são o próprio Juventus se mostrando:

- Formulários públicos de candidato: `app/cadastro-staff/page.tsx`, `app/cadastro-staff-base/page.tsx`,
  `app/cadastro-comissao-tecnica/page.tsx`, `app/cadastro-comissao-tecnica-base/page.tsx`,
  `app/cadastro-atleta-base/page.tsx`, `app/vagas/[token]/page.tsx`, `app/vagas-base/[token]/page.tsx`,
  `app/inscricao-captacao-base/page.tsx`, `components/public-form-error.tsx`.
- Cards/widgets que mostram o confronto de um jogo (é dado esportivo real, "Juventus x Adversário"):
  `app/jogos/page.tsx`, `components/programacao/game-card.tsx`, `components/jogos/jogo-card-base.tsx`,
  `app/profissional/proximo-jogo-widget.tsx`, `app/profissional/proximos-jogos-widget.tsx`.
- O escudo principal de todo documento PDF oficial (recibo, lista de ônibus, credenciamento,
  presskit etc.) — continua sendo o escudo do Juventus, seguindo a regra de posicionamento já
  existente (mandante primeiro). A Proxis entra só como a linha de rodapé (ver abaixo), nunca
  substituindo o escudo do confronto.
- `docs/superpowers/specs/2026-08-26-campograma-foto-classificacao-design.md`: é documentação, não
  precisa de alteração.

## Fora de escopo

- Repaginar a paleta de cores (grena/dourado continuam).
- Qualquer mudança de dado (nome do clube em `JUVENTUS_RAZAO_SOCIAL`/CNPJ/endereço nos documentos,
  textos "Clube Atlético Juventus" em contratos/recibos) — isso é identidade legal do clube, não do
  software.
- Multi-tenant (suportar mais de um clube ao mesmo tempo no sistema) — fica pra quando/se a Proxis
  realmente passar a atender outro clube; essa spec só troca a camada visual.

## Ativos

O Mateus enviou um PNG só (`Logo Proxis Gestão Esportiva.png`, 2172×724px, fundo transparente):
ícone "PX" (grafite/azul) + wordmark "PROXIS" + "GESTÃO ESPORTIVA" lado a lado.

Segue exatamente o padrão já usado pelo Juventus em `components/juventus-crest.tsx`
(`juventus-escudo.png` = marca completa, `juventus-escudo-mark.png` = só o símbolo, recortado, pra
espaços pequenos):

- `public/brand/proxis-logo.png`: o PNG recebido, sem alteração (marca completa, uso em telas
  grandes — login, tela de departamentos).
- `public/brand/proxis-mark.png`: recorte só do ícone "PX" (região aproximada x:128–732, y:195–555
  do arquivo original — confirmar visualmente no recorte final), uso compacto (sidebar, cabeçalho
  do Treinador, favicon).

Novo componente `components/proxis-brand.tsx`, espelhando `juventus-crest.tsx`:

```tsx
export function ProxisLogo({ className }: { className?: string }) {
  return <img src="/brand/proxis-logo.png" alt="Proxis Gestão Esportiva" className={className} style={{ objectFit: "contain" }} />;
}

export function ProxisMark({ className }: { className?: string }) {
  return <img src="/brand/proxis-mark.png" alt="Proxis" className={className} style={{ objectFit: "contain" }} />;
}
```

## Mudanças por arquivo

### `app/login/page.tsx`

- `JuventusCrest` → `ProxisLogo`.
- Título: `Juventus - SAF` → `Proxis — Gestão Esportiva`.
- Subtítulo: `Central de cadastros e operação do futebol profissional` → `Operando para Clube
  Atlético Juventus`.

### `app/page.tsx` (tela de escolha de departamento)

- As duas texturas de fundo (`JuventusCrest` gigante rotacionado) e o badge circular pequeno →
  `ProxisMark`/`ProxisLogo` conforme o tamanho.
- Título `Juventus - SAF` → `Proxis — Gestão Esportiva`.
- Rodapé `© {ano} Clube Atlético Juventus SAF` → `Operando para Clube Atlético Juventus · ©
  {ano} Proxis Gestão Esportiva`.
- O resto da tela (cards "Futebol Profissional"/"Futebol de Base", cores, estrutura) não muda.

### `components/app-sidebar.tsx`

- Linha ~287: `JuventusCrestMark` → `ProxisMark`.
- `title={compacto ? "Juventus - SAF" : undefined}` → `"Proxis — Gestão Esportiva"`.
- Label visível (modo não-compacto): `Juventus - SAF` → `Proxis`.

### `components/treinador/treinador-header.tsx`

- `JuventusCrestMark` → `ProxisMark`.
- Texto `Juventus SAF · Futebol de Base` → `Proxis · Futebol de Base` (mantém o indicador de
  departamento, só troca o nome do software).

### Favicon / PWA / metadata

- `app/icon.png`, `public/icon-192.png`, `public/icon-512.png`: regenerar a partir do
  `proxis-mark.png`, nos mesmos tamanhos/formatos dos arquivos atuais.
- `public/manifest.json`: `name`/`short_name`/`description` passam a mencionar Proxis
  (`"name": "Proxis Gestão Esportiva"`, `"short_name": "Proxis"`, `"description": "Central de
  cadastros e operação esportiva — Proxis, operando para o Clube Atlético Juventus"`).
  `background_color`/`theme_color` não mudam (continuam as cores reais da UI, não são "marca").
- `app/layout.tsx`: `metadata.title` → `"Proxis — Gestão Esportiva"`, `metadata.description` →
  `"Central de cadastros e operação esportiva — Proxis, operando para o Clube Atlético Juventus"`.

### PDFs

`lib/pdf/logistica-shared.tsx` já tem um `footer` compartilhado (posição absoluta, borda superior,
`footerTexto`) usado por 38 dos 42 geradores de PDF do sistema. Acrescentar, abaixo do texto atual
de rodapé (endereço/CNPJ do Juventus), uma linha nova:

```
[ProxisMark em miniatura, ~10px]  Gerado via Proxis Gestão Esportiva
```

Estilo: mesmo tom discreto do `footerTexto` existente (cinza claro, fonte pequena) — não compete
com o conteúdo do documento nem com a identidade do Juventus, que continua sendo a principal (nome,
CNPJ, escudo do confronto).

Os 3 arquivos que não importam `logistica-shared` (`lib/pdf/concentracao-document.tsx`,
`lib/pdf/dia-jogo-document.tsx`, `lib/pdf/relacionados-document.tsx` — geram as versões em imagem
pra compartilhar no WhatsApp) recebem a mesma linha, adaptada ao layout próprio de cada um (serão
inspecionados individualmente na implementação, já que não seguem o `sharedStyles`).

## Verificação

- `npx tsc --noEmit`, `npx eslint` nos arquivos alterados, `npx vitest run`, `npx next build` —
  igual à prática já estabelecida no projeto.
- Checagem visual: abrir login, tela de departamentos, sidebar (modo normal e recolhido), cabeçalho
  do Treinador, e gerar pelo menos um PDF de cada "família" (um que usa `logistica-shared` e os 3
  que não usam) pra conferir o recorte do `proxis-mark.png` e a legibilidade da linha de rodapé.
- Conferir que nenhuma tela do "grupo Juventus" (formulários públicos, cards de jogo, escudo
  principal dos PDFs) foi tocada por engano.
- Sincronizar os arquivos alterados + os 2 PNGs novos (`public/brand/proxis-logo.png`,
  `public/brand/proxis-mark.png`) pra pasta local do Mateus via device bridge, commit local, e
  passar o comando de `git push` pra ele rodar do lado dele (mesmo fluxo já em uso nesta sessão).
