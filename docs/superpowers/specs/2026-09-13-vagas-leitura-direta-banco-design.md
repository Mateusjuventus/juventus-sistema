# Leitura direta no banco pra lista de nomes das Vagas de Staff

Data: 13/09/2026

## Problema

No link público de Vagas de Staff (`/vagas/[token]` e `/vagas-base/[token]`), o "selecione seu
nome" às vezes não mostrava gente recém-cadastrada (ou recém-removida de uma vaga) por um tempo —
de minutos a horas — mesmo com o cadastro certinho e ativo no banco. Uma investigação longa (ver o
histórico da conversa de 12–13/09/2026) descartou, um por um: link errado, cache do navegador, PWA
em modo standalone, cache de CDN/Vercel (confirmado via `Cache-Control: no-store` e `Age: 0` numa
carga comprovadamente fresca), filtro escondido no código (não existe — tanto a consulta quanto o
`<select>` incluem todo `ativo = true` sem exceção) e limite de linhas (só 68 pessoas ativas no
total).

O único ponto que NUNCA mostrou esse atraso, em nenhum teste, foi o SQL Editor do próprio Supabase
— que conecta direto no Postgres, sem passar pela API (PostgREST/`service_role`) que o sistema usa
normalmente. Isso aponta pra um atraso específico da camada de API do Supabase entre gravar e
conseguir ler de volta, não do código do sistema nem do banco em si.

## Decisão

Pra essa ÚNICA consulta (a lista de nomes ativos do Staff Operacional nas duas telas públicas de
Vagas), trocar a leitura via API por uma conexão direta com o Postgres — do mesmo jeito que o SQL
Editor faz. Se a conexão direta não estiver disponível (variável de ambiente ainda não configurada,
ou falha de conexão), a página cai de volta pra consulta via API exatamente como era antes — sem
risco de regressão.

Escopo deliberadamente restrito a essa consulta: o resto do sistema (todas as outras telas,
inclusive o resto das próprias telas de Vagas — abrir/fechar, pegar vaga, remover, recibo
automático) continua usando a API do Supabase normalmente. Não há indício de que o mesmo atraso
afete outras partes do sistema, e trocar tudo pra conexão direta traria complexidade e risco
desnecessários.

## Implementação

- `lib/supabase/direct-db.ts`: `queryDireto()`, um pool de conexão (`pg`, `max: 2`) usando a
  variável de ambiente `SUPABASE_DIRECT_DB_URL`.
- `lib/futebol/staff-vagas-lista.ts`: `listarStaffAtivoParaVagas()` — tenta `queryDireto`, cai pra
  API (`admin.from(...)`) em caso de erro.
- `app/vagas/[token]/page.tsx` e `app/vagas-base/[token]/page.tsx`: chamam
  `listarStaffAtivoParaVagas` no lugar da consulta direta via `admin`.

## Pendência de configuração

Falta o Mateus adicionar a variável de ambiente `SUPABASE_DIRECT_DB_URL` na Vercel (Project
Settings → Environment Variables), com o valor da "Direct connection" do painel do Supabase
(Project Settings → Database → Connection string → aba "Direct connection", substituindo
`[YOUR-PASSWORD]` pela senha do banco). Sem essa variável, o comportamento fica exatamente igual ao
de antes desta mudança (cai pra API sempre).

## Risco conhecido

Uma conexão direta (fora do pooler do Supabase) consome uma conexão do limite baixo do plano
gratuito. O pool está limitado a 2 conexões e é reaproveitado entre chamadas na mesma instância de
função serverless "quente" — suficiente pra esse volume de acesso (link de baixo tráfego), mas vale
monitorar se o número de acessos simultâneos crescer muito.
