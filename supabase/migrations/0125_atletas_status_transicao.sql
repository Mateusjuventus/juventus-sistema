-- Reestruturação do status do atleta do Profissional — ver docs/superpowers/specs/
-- 2026-10-01-departamento-medico-historico-status-design.md. `atletas.status` passa de
-- liberado/suspenso/departamento_medico pra liberado/departamento_medico/transicao ("Suspenso" sai
-- do vocabulário; "Transição" é novo). Importante: isso NÃO mexe em `atletas_base` (Futebol de
-- Base) nem na constraint dela (`atletas_base_status_check`) — confirmado com o Mateus, fora de
-- escopo desta rodada.

-- 1) Converte quem está "suspenso" hoje pra "liberado" ANTES de trocar a constraint (senão a
-- constraint nova rejeitaria essas linhas na hora de validar).
update public.atletas set status = 'liberado' where status = 'suspenso';

-- 2) Troca a constraint pros 3 valores novos.
alter table public.atletas drop constraint atletas_status_check;
alter table public.atletas add constraint atletas_status_check
  check (status in ('liberado', 'departamento_medico', 'transicao'));

-- 3) Linha do tempo de status — alimentada automaticamente (abrir/fechar lesão na Fisioterapia,
-- ver `sincronizarStatusAtleta`) e manualmente (tela "Histórico de Status"). `atletas.status`
-- continua sendo o campo lido pelo resto do sistema (convocação, cards, relatórios); esta tabela é
-- o registro/auditoria por trás dele.
create table public.atletas_status_historico (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  status text not null check (status in ('liberado', 'departamento_medico', 'transicao')),
  data date not null,
  -- Retrato de quem lançou (mesmo princípio de `assinaturas_documento`: não muda se a pessoa
  -- editar o nome dela depois) — sempre resolvido a partir de quem está logado, nunca um campo
  -- escolhido num <select>.
  criado_por_perfil_id uuid references public.perfis(id) on delete set null,
  criado_por_nome text,
  created_at timestamptz not null default now()
);

create index atletas_status_historico_atleta_id_idx on public.atletas_status_historico (atleta_id);

alter table public.atletas_status_historico enable row level security;

create policy "authenticated_full_access" on public.atletas_status_historico
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atletas_status_historico to authenticated;

-- 4) Backfill: uma linha inicial por atleta do Profissional, com o status atual dele (já
-- convertido pelo passo 1) e data de hoje — não dá pra saber quando cada atleta entrou no status
-- atual sem inventar uma data, então o histórico começa "do zero" a partir de hoje.
insert into public.atletas_status_historico (atleta_id, status, data, criado_por_nome)
select id, status, current_date, 'Migração do sistema'
from public.atletas;

notify pgrst, 'reload schema';
