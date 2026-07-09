# Sistema Juventus

Central de cadastros e operação do futebol profissional do Juventus. Módulo atual: **Fundação
de Cadastros + Controle de Elenco** (ver `docs/superpowers/specs/2026-07-08-fundacao-cadastros-elenco-design.md`).

Stack: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase (Postgres, Auth, Storage),
hospedado na Vercel.

## Estrutura

```
app/                     rotas (App Router) — login, home e os 4 cadastros
  atletas/
  comissao-tecnica/
  staff-operacional/
  jogos/
components/               componentes de UI compartilhados (formulário, tabela, botões)
lib/
  supabase/                clientes Supabase (browser, server, middleware) e tipos das tabelas
  validation/               validação de CPF e schemas Zod dos 4 cadastros
supabase/migrations/      SQL das tabelas, RLS e bucket de storage
docs/superpowers/specs/   specs de design de cada módulo
```

## Configuração local

1. **Instalar dependências** (precisa de acesso à internet — não disponível no sandbox onde este
   projeto foi montado, então rode isto na sua máquina):
   ```bash
   npm install
   ```

2. **Criar o projeto no Supabase** (supabase.com, plano gratuito) e aplicar a migration:
   - Painel do Supabase → SQL Editor → New query → cole o conteúdo de
     `supabase/migrations/0001_init.sql` → Run.
   - Isso cria as 4 tabelas, RLS (só usuário autenticado acessa) e o bucket privado
     `entity-photos` para fotos/logos.

3. **Criar o primeiro usuário** (login único do Mateus por enquanto):
   - Painel do Supabase → Authentication → Users → Add user → e-mail + senha.

4. **Configurar variáveis de ambiente**:
   ```bash
   cp .env.example .env.local
   ```
   Preencha com Project Settings → API do painel do Supabase:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a **anon/public key**, não a service_role)

5. **Rodar em desenvolvimento**:
   ```bash
   npm run dev
   ```
   Acesse http://localhost:3000 — vai redirecionar para `/login`.

6. **Rodar os testes** (validação de CPF):
   ```bash
   npm test
   ```

## Deploy (Vercel, plano gratuito)

1. Suba este repositório para o GitHub.
2. Na Vercel: New Project → importe o repositório.
3. Em Environment Variables, adicione as mesmas duas variáveis do `.env.local`.
4. Deploy. A cada push no branch principal, a Vercel gera um novo deploy automaticamente.

## O que já está implementado

- Login por e-mail/senha (Supabase Auth), com todas as rotas protegidas via `middleware.ts`.
- Home com atalhos para os 4 cadastros e placeholders "em breve" para os módulos futuros.
- CRUD completo (listar com busca/filtro, criar, editar, excluir com confirmação) de:
  - **Atletas** — com upload de foto.
  - **Comissão Técnica/Diretoria** — com upload de foto (opcional) e sugestões de função.
  - **Staff Operacional** — com sugestões de função/setor, chave PIX e valor padrão de pagamento.
  - **Jogos/Competições** — com upload de logo do adversário e filtro mandante/visitante.
- Validação de CPF (dígito verificador) e de campos obrigatórios via Zod, tanto no client quanto
  no server (Server Actions nunca confiam só na validação do formulário).
- Mensagens amigáveis para CPF/RG duplicado (violação das constraints `unique` do banco).
- Fotos e logos guardados em bucket privado do Supabase Storage, exibidos via signed URL
  (nunca URL pública).

## Nota sobre este ambiente de desenvolvimento

Este projeto foi montado num ambiente sem acesso à internet para registries de pacote (npm), então
**não foi possível rodar `npm install`, `npm run build` ou os testes aqui**. O código foi escrito
seguindo cuidadosamente os padrões do Next.js 14 App Router e Server Actions, mas o primeiro passo
ao abrir isso na sua máquina deve ser `npm install` seguido de `npm run typecheck` e `npm run build`
para pegar qualquer detalhe de digitação antes do deploy.

## Testes / verificação (conforme a spec)

- [ ] Criar, editar e excluir um registro de cada entidade, validando que os dados persistem.
- [ ] Testar upload e exibição de foto em Atletas, Comissão Técnica e Jogos (logo).
- [ ] Testar CPF inválido e CPF duplicado (deve bloquear o salvamento com mensagem clara).
- [ ] Testar login com credenciais corretas e incorretas.
- [ ] Verificar responsividade das telas de listagem e formulário no celular.

## Próximos módulos (ordem sugerida na spec)

1. Fundação de Cadastros + Controle de Elenco — **este módulo**.
2. Convocação + Presskit.
3. Logística de jogo.
4. Operação de Jogo.
5. Prestação de Contas + Dashboard.
