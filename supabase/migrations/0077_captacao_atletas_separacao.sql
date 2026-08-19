-- Ajuste pedido em 19/08: a Captação/Avaliação e o cadastro dos Atletas que já são do clube são
-- coisas TOTALMENTE separadas — a Captação não gera mais cadastro de Atleta nenhum. Dois ajustes:
--
-- 1) Captação ganha uma etapa de fila antes de "Em avaliação": quem se inscreve pelo link público
--    de inscrição (`/inscricao-captacao-base`) cai na aba "Aprovações" com status "inscricao"; só
--    quando o Mateus aprova dali (e informa a Data de Início) é que o candidato passa a "Em
--    avaliação" de verdade. Dali em diante seguem os mesmos status de sempre (Aprovado/Dispensado/
--    Não compareceu) — só que agora "Aprovado" é só um status administrativo da Captação, não cria
--    mais nada em `atletas_base`. `atleta_gerado_id` fica só como registro histórico de quando isso
--    ainda acontecia (fluxo antigo, ver 0076) — nenhuma tela lê ou grava mais essa coluna.
--
-- 2) O link público de Atletas (`/cadastro-atleta-base`, chamado de "Ficha de Cadastro" na tela)
--    passa a gravar DIRETO em `atletas_base`, com o cliente admin (service_role) — antes gravava em
--    `captacao_base`, o que misturava as duas coisas. Reaproveita o mesmo toggle
--    `configuracoes_cadastro_atleta_base` que já existia. Precisa de GRANT pro service_role em
--    `atletas_base` (não tinha, porque antes só Captação usava o cliente admin) — grant já nasce
--    aqui, não como correção depois (mesma lição de sempre: service_role ignora RLS mas NÃO ignora
--    GRANT).

alter table public.captacao_base drop constraint captacao_base_status_check;
alter table public.captacao_base add constraint captacao_base_status_check
  check (status in ('inscricao', 'avaliacao', 'aprovado', 'dispensado', 'nao_compareceu'));

-- Fica sem data até o Mateus aprovar a inscrição e informar quando a avaliação começa de verdade
-- (ver `aprovarInscricaoCaptacao`, app/base/captacao/actions.ts).
alter table public.captacao_base alter column data_inicio drop not null;
alter table public.captacao_base alter column data_inicio drop default;

-- Toggle do NOVO link público de inscrição da Captação (`/inscricao-captacao-base`) — mesmo formato
-- de `configuracoes_cadastro_atleta_base`/`configuracoes_cadastro_staff_base`, tabela singleton
-- própria (independente do toggle de Atletas, que agora é uma coisa totalmente separada).
create table public.configuracoes_inscricao_captacao_base (
  id uuid primary key default gen_random_uuid(),
  cadastro_publico_ativo boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger configuracoes_inscricao_captacao_base_set_updated_at
  before update on public.configuracoes_inscricao_captacao_base
  for each row execute function set_updated_at();

insert into public.configuracoes_inscricao_captacao_base (cadastro_publico_ativo) values (true);

alter table public.configuracoes_inscricao_captacao_base enable row level security;
create policy "authenticated_full_access" on public.configuracoes_inscricao_captacao_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, update on public.configuracoes_inscricao_captacao_base to authenticated;
grant select on public.configuracoes_inscricao_captacao_base to service_role;

-- A "Ficha de Cadastro" pública (`/cadastro-atleta-base`) agora grava direto em `atletas_base` via
-- service_role — grant que faltava (antes só `captacao_base` precisava).
grant select, insert on public.atletas_base to service_role;

notify pgrst, 'reload schema';
