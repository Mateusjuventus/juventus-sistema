# Configuração por clube (Proxis multi-instância) — etapa 1

Data: 22/11/2026 · Pedido: Mateus · Status: aprovado em conversa (opção "um código, um link e um banco por clube")

## Objetivo

A Proxis passa a atender mais de um clube a partir do **mesmo código**. Cada clube roda numa
instância própria: um projeto na Vercel e um projeto no Supabase. Endereço, login e dados são
separados. Quem é o clube vem de uma variável de ambiente lida no build:

```
NEXT_PUBLIC_CLUBE=juventus   # padrão quando ausente: o Juventus continua exatamente igual
NEXT_PUBLIC_CLUBE=maringa
```

O link único (vários clubes no mesmo banco) fica para uma etapa futura. Esta etapa é pré-requisito
dela e nada aqui precisa ser desfeito depois.

## O que vira configuração (`lib/clube/`)

`ClubeConfig` guarda tudo o que hoje está fixo como "Juventus":

- **Nomes**: `nomeCurto` (telas, "Juventus x Adversário", nome de arquivo), `nomeCompleto`
  (cabeçalho de PDF, login), `razaoSocial` (documentos formais, recibos).
- **Escudo**: `escudo.completo` e `escudo.mark`, caminhos em `public/` (os mesmos arquivos servem para
  a tela e para os PDFs).
- **Cores**: o tema mantém **os mesmos nomes de token** (`grena`, `grenaEscuro`, `dourado`, `pagina`,
  `linha`, `contexto`, `prata`). Assim as ~900 classes Tailwind (`bg-grena`, `text-grena`…) e os PDFs
  não mudam. No Maringá, `grena` é o verde-profundo e `dourado` é o verde do escudo. Os nomes
  ficam como legado e a troca para nomes neutros (`primaria`, `acento`) fica numa limpeza futura.
- **Fontes**: `fonte.texto` e `fonte.display`. Juventus: Inter nas duas. Maringá: Montserrat no texto
  e Saira Condensed nos títulos (`font-display`). Todas self-hosted via @fontsource, sem depender da
  rede no build.
- **Módulos**: liga e desliga o que é específico de um clube:
  - `profissional`: Futebol Profissional (o Maringá começa só com a base).
  - `fpf`: súmula e integração com a Federação Paulista (só o Juventus).
  - `contratoFormacao`: modelos de contrato com texto jurídico e signatários do Juventus (só o
    Juventus, até o Maringá enviar os modelos dele).
- **Federação**: `nomeBuscaFederacao`, o trecho do nome usado para achar o clube na súmula.

## Fonte da verdade das cores do Maringá

O design system "Maringá FC" (artifact) e a skill `documento-maringa-fc` definem:

| Token do sistema | Maringá | Por quê |
|---|---|---|
| `grena` | #12514A verde-profundo | áreas grandes (sidebar) e texto de destaque (contraste 9:1 no branco) |
| `grenaEscuro` | #0D3F39 | hover/texto pequeno, um passo mais escuro que o verde-profundo |
| `dourado` | #00A75D verde do escudo | acento: item ativo, foco, botões de destaque (mesmo contraste do dourado atual) |
| `pagina` | #F2F4F1 | fundo de página neutro com um toque verde, sem bege |
| `linha` | #E0E0E0 névoa | |
| `contexto` | #C0C8B0 areia | |
| `prata` | #7C837F cinza-pedra | |

## Fora do escopo desta etapa

- Textos jurídicos dos contratos do Maringá (dependem dos modelos do clube).
- Renomear identificadores internos (`ehLadoJuventus`, `juventusTheme`…). Eles continuam funcionando
  e passam a ler a configuração.
- Banco multi-clube e link único (etapas 2 a 5).

## Como colocar o Maringá no ar (depois do merge)

1. Supabase: criar um projeto novo e rodar as migrations de `supabase/migrations/` em ordem.
2. Vercel: criar um projeto novo apontando para o mesmo repositório, com `NEXT_PUBLIC_CLUBE=maringa` e
   as chaves do Supabase do Maringá.
3. No projeto do Juventus, nada muda (a variável ausente equivale a `juventus`).
