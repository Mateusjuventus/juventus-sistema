-- Remove o que sobrou da tentativa de integração com a API não-oficial da FPF
-- (futebolpaulista.com.br/Handlers/*, ver docs/superpowers/specs/2026-08-04-integracao-fpf-design.md)
-- que passou a ser bloqueada por IP em produção (HTTP 403, bloqueio de WAF contra IPs de
-- datacenter) e cuja UI/sincronização nunca chegou a ficar em uso — pedido explícito do Mateus pra
-- limpar esse espaço. NÃO afeta a importação de súmula em PDF (domínio `conteudo.fpf.org.br`, ver
-- lib/fpf/sumula-pdf.ts), que continua funcionando normalmente — por isso `jogos.fpf_link_sumula`
-- é preservada de propósito (ainda é gravada por app/jogos/[id]/sumula/importar-actions.ts e lida
-- por app/competicoes/[id]/resultados/page.tsx).
drop table if exists public.fpf_jogos_ignorados;
drop table if exists public.fpf_sync_log;
drop table if exists public.fpf_config;
drop table if exists public.fpf_atletas_ignorados;

alter table public.atletas
  drop column if exists fpf_id_atleta;

alter table public.jogos
  drop column if exists fpf_id_jogo,
  drop column if exists fpf_sincronizado_em;

notify pgrst, 'reload schema';
