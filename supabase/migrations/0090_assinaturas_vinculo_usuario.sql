-- Vincula um login (usuario_id) a cada assinante configurado do Financeiro e do Parecer Final de
-- Avaliação (ver docs/superpowers/specs/2026-08-28-assinatura-digital-notificacoes-design.md,
-- Fase 2) — antes esses assinantes eram só nome/cargo digitados, sem nenhuma ligação a um usuário
-- real do sistema, então não dava pra saber quem, logado, poderia clicar em "Assinar" cada papel.
-- Sem usuário vinculado (configuração antiga, ainda não ajustada), qualquer "master" pode assinar
-- aquele papel — fallback que evita travar quem já usava a configuração sem saber desse campo novo.

alter table public.configuracoes_financeiro
  add column if not exists assinatura1_usuario_id uuid references auth.users(id) on delete set null,
  add column if not exists assinatura2_usuario_id uuid references auth.users(id) on delete set null;

alter table public.configuracoes_financeiro_base
  add column if not exists assinatura1_usuario_id uuid references auth.users(id) on delete set null,
  add column if not exists assinatura2_usuario_id uuid references auth.users(id) on delete set null;

-- Cada linha de `assinaturas` (jsonb) do Parecer Final ganha um `id` estável — vira
-- `assinaturas_documento.papel` quando alguém assina, e por isso não pode depender da posição na
-- lista (reordenar ou adicionar uma linha no meio não pode "roubar" a assinatura de outra pessoa).
-- Backfill das linhas já existentes; linhas novas ganham o id na hora de salvar
-- (app/base/captacao/actions.ts).
update public.configuracoes_parecer_captacao_base
set assinaturas = (
  select coalesce(jsonb_agg(elem || jsonb_build_object('id', gen_random_uuid()::text)), '[]'::jsonb)
  from jsonb_array_elements(assinaturas) as elem
)
where assinaturas is not null and jsonb_typeof(assinaturas) = 'array';
