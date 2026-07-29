-- Numeração sequencial das Solicitações (Nº 001, 002...) — pedido do Mateus pra numerar as que já
-- foram feitas e continuar numerando automaticamente as próximas. Cada departamento tem sua
-- própria sequência (solicitacoes e solicitacoes_base são independentes, como em todo o sistema).
-- Aplicar via SQL editor do painel Supabase.

alter table public.solicitacoes add column if not exists numero integer;
alter table public.solicitacoes_base add column if not exists numero integer;

-- Backfill: numera as solicitações já existentes na ordem em que foram de fato criadas
-- (created_at), começando em 1. Seguro rodar de novo — reatribui os mesmos números.
with numeradas as (
  select id, row_number() over (order by created_at asc) as rn
  from public.solicitacoes
)
update public.solicitacoes s
set numero = numeradas.rn
from numeradas
where s.id = numeradas.id;

with numeradas as (
  select id, row_number() over (order by created_at asc) as rn
  from public.solicitacoes_base
)
update public.solicitacoes_base s
set numero = numeradas.rn
from numeradas
where s.id = numeradas.id;

alter table public.solicitacoes alter column numero set not null;
alter table public.solicitacoes_base alter column numero set not null;

alter table public.solicitacoes drop constraint if exists solicitacoes_numero_key;
alter table public.solicitacoes add constraint solicitacoes_numero_key unique (numero);

alter table public.solicitacoes_base drop constraint if exists solicitacoes_base_numero_key;
alter table public.solicitacoes_base add constraint solicitacoes_base_numero_key unique (numero);
