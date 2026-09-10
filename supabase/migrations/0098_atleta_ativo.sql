-- Atletas (Profissional e Base): status ativo/inativo, independente do status esportivo
-- (Liberado/Suspenso/Depto. Médico/Dispensado). Mesmo padrão já usado em Staff Operacional,
-- Veículos e Hotéis (ver 0013_staff_ativo.sql) — em vez de excluir o cadastro quando o atleta
-- não faz mais parte do clube (por outro motivo que não seja a Dispensa formal da Base), o
-- cadastro fica marcado como inativo: histórico, documentos e vínculos anteriores continuam
-- intactos, e o cadastro some das listas/exportações por padrão (mas continua acessível
-- marcando "Mostrar inativos").
-- Aplicar via SQL editor do painel Supabase, depois de 0001 a 0097.

alter table public.atletas add column ativo boolean not null default true;
create index atletas_ativo_idx on public.atletas (ativo);

alter table public.atletas_base add column ativo boolean not null default true;
create index atletas_base_ativo_idx on public.atletas_base (ativo);
