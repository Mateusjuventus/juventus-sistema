-- Adiciona o tipo de contrato do atleta (Definitivo/Empréstimo/Amador/Iniciação, conforme o
-- departamento) e uma flag de "possui contrato de formação" (só faz sentido quando o tipo de
-- contrato é Amador, mas fica salva independente pra simplificar a consulta).
--
-- Futebol Profissional (`atletas.tipo_contrato`): definitivo, emprestimo, amador.
-- Futebol de Base (`atletas_base.tipo_contrato`): definitivo, emprestimo, amador, iniciacao.

alter table public.atletas
  add column if not exists tipo_contrato text,
  add column if not exists possui_contrato_formacao boolean not null default false;

alter table public.atletas
  drop constraint if exists atletas_tipo_contrato_check;

alter table public.atletas
  add constraint atletas_tipo_contrato_check
  check (tipo_contrato is null or tipo_contrato in ('definitivo', 'emprestimo', 'amador'));

alter table public.atletas_base
  add column if not exists tipo_contrato text,
  add column if not exists possui_contrato_formacao boolean not null default false;

alter table public.atletas_base
  drop constraint if exists atletas_base_tipo_contrato_check;

alter table public.atletas_base
  add constraint atletas_base_tipo_contrato_check
  check (tipo_contrato is null or tipo_contrato in ('definitivo', 'emprestimo', 'amador', 'iniciacao'));
