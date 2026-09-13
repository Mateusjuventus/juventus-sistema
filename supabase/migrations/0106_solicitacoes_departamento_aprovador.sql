-- Traz de volta os 2 assinantes que o PDF antigo de Solicitação tinha antes da assinatura digital
-- (ver docs/superpowers/specs/2026-08-28-assinatura-digital-notificacoes-design.md, "Atualização
-- (28/08) — Fase 2, parte 2") e que foram cortados na época a pedido do Mateus — agora que existe
-- assinatura desenhada de verdade, ele quer os 4 assinantes originais de novo: Solicitante,
-- Encarregado do Departamento (já existem), Departamento (Compras ou Financeiro, conforme o tipo da
-- solicitação) e Aprovador.
--
-- Compra/Transporte/Passagem Aérea/Exame Médico/Hospedagem → Departamento de Compras.
-- Pagamento/Reembolso → Departamento Financeiro.
-- (nunca os dois na mesma solicitação — o tipo decide qual aparece, ver
-- `papelDepartamentoSolicitacao` em lib/assinaturas/config.ts.)
--
-- O Aprovador é a MESMA pessoa configurada nas duas situações — só o rótulo do Departamento ao
-- lado muda. Mesmo formato de sempre (cargo configurável + usuário vinculado opcional, igual ao
-- Encarregado): sem vincular ninguém, qualquer master pode assinar (podeAssinarPapel).
--
-- Sem GRANT extra necessário aqui: ao contrário de `perfis` (que tem grant coluna por coluna, ver
-- 0092/0105), a migration 0091 já concedeu select/insert/update/delete na tabela INTEIRA pra
-- "authenticated" — colunas novas ficam liberadas automaticamente.
alter table public.configuracoes_solicitacoes
  add column if not exists compras_cargo text not null default '',
  add column if not exists compras_usuario_id uuid references auth.users(id) on delete set null,
  add column if not exists financeiro_cargo text not null default '',
  add column if not exists financeiro_usuario_id uuid references auth.users(id) on delete set null,
  add column if not exists aprovador_cargo text not null default '',
  add column if not exists aprovador_usuario_id uuid references auth.users(id) on delete set null;

alter table public.configuracoes_solicitacoes_base
  add column if not exists compras_cargo text not null default '',
  add column if not exists compras_usuario_id uuid references auth.users(id) on delete set null,
  add column if not exists financeiro_cargo text not null default '',
  add column if not exists financeiro_usuario_id uuid references auth.users(id) on delete set null,
  add column if not exists aprovador_cargo text not null default '',
  add column if not exists aprovador_usuario_id uuid references auth.users(id) on delete set null;
