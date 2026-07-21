-- Corrige "permission denied for table ingressos_cargas" ao tentar salvar uma Carga de Ingressos.
-- A tabela já existe (criada pela migração 0030), mas os grants/política de RLS do final daquele
-- script não chegaram a ser aplicados na sua execução original — provavelmente algo no meio do
-- script interrompeu o restante. Este script só reaplica o que faltou; é seguro rodar mesmo que
-- alguma parte já esteja em vigor (nada aqui apaga ou recria dados).

grant select, insert, update, delete on public.ingressos_cargas to authenticated;
grant select, insert, update, delete on public.ingressos_solicitacoes to authenticated;

alter table public.ingressos_cargas enable row level security;
alter table public.ingressos_solicitacoes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ingressos_cargas' and policyname = 'authenticated_full_access'
  ) then
    create policy "authenticated_full_access" on public.ingressos_cargas for all
      using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ingressos_solicitacoes' and policyname = 'authenticated_full_access'
  ) then
    create policy "authenticated_full_access" on public.ingressos_solicitacoes for all
      using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
end $$;
