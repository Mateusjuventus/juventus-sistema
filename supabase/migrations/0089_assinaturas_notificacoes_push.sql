-- Assinatura digital interna + notificações (sino + push) — ver docs/superpowers/specs/
-- 2026-08-28-assinatura-digital-notificacoes-design.md. Pedido do Mateus: assinar documentos (a
-- começar pelo Relatório de Dispensa: ele + o treinador) sem depender de serviço externo tipo
-- Clicksign/DocuSign, e ser avisado (dentro do sistema + push no celular) quando tiver algo
-- esperando a assinatura dele.

-- `perfis` ainda não tinha nome/cargo (só e-mail) — precisa pra saber o que escrever no lugar da
-- linha em branco de assinatura ("Assinado digitalmente por [nome], [cargo], em [data]"). Fica
-- nulo até a pessoa assinar pela primeira vez: a tela de assinar pede pra preencher só nessa hora
-- (uma vez só) e guarda aqui pras próximas assinaturas já virem prontas.
alter table public.perfis add column if not exists nome text;
alter table public.perfis add column if not exists cargo text;

-- Uma assinatura por (documento, papel) — "papel" é o rótulo do assinante dentro daquele tipo de
-- documento (ex.: 'treinador', 'departamento', 'solicitante', 'encarregado'), não uma pessoa fixa:
-- quem PODE assinar cada papel é resolvido em código (lib/assinaturas/config.ts), não aqui.
-- `nome_no_momento`/`cargo_no_momento` são um retrato de quem assinou — não mudam se o cadastro da
-- pessoa mudar depois, pra a assinatura continuar dizendo exatamente quem assinou naquele momento.
create table if not exists public.assinaturas_documento (
  id uuid primary key default gen_random_uuid(),
  tipo_documento text not null,
  documento_id uuid not null,
  papel text not null,
  usuario_id uuid not null references auth.users(id),
  nome_no_momento text not null,
  cargo_no_momento text,
  assinado_em timestamptz not null default now(),
  unique (tipo_documento, documento_id, papel)
);

alter table public.assinaturas_documento enable row level security;

create policy "authenticated_full_access" on public.assinaturas_documento
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.assinaturas_documento to authenticated;

create index if not exists assinaturas_documento_documento_idx
  on public.assinaturas_documento (tipo_documento, documento_id);

-- Sino de notificações dentro do sistema. Quem cria (ex.: o servidor, ao gerar um documento que
-- precisa da assinatura de alguém) sempre grava `usuario_id` = quem deve VER aquela notificação —
-- a própria pessoa marca como lida depois (`lida`), nunca outra.
create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id),
  tipo text not null,
  mensagem text not null,
  link text,
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);

alter table public.notificacoes enable row level security;

create policy "authenticated_full_access" on public.notificacoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.notificacoes to authenticated;

create index if not exists notificacoes_usuario_lida_idx on public.notificacoes (usuario_id, lida);

-- Inscrições de push do navegador (Web Push nativo, sem SaaS terceiro) — uma por combinação de
-- usuário + aparelho/navegador (a mesma pessoa pode ter mais de uma, ex. celular e computador).
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id),
  endpoint text not null unique,
  chave_p256dh text not null,
  chave_auth text not null,
  criado_em timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "authenticated_full_access" on public.push_subscriptions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.push_subscriptions to authenticated;

create index if not exists push_subscriptions_usuario_idx on public.push_subscriptions (usuario_id);
