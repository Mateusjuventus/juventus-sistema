-- Organograma da Base: qual comissão/departamento (`linha`) reporta pra qual caixa de liderança
-- (supervisor) — ver docs/superpowers/specs/2026-09-15-organograma-cartoes-por-comissao-design.md.
-- Nula até alguém escolher pela tela; uma `linha` sem isso continua aparecendo, só cai num grupo
-- "sem supervisor definido" em vez de travar o desenho.
create table if not exists public.organograma_base_linha (
  linha text primary key,
  reporta_para uuid references public.organograma_base(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.organograma_base_linha enable row level security;

create policy authenticated_full_access on public.organograma_base_linha
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.organograma_base_linha to authenticated;

-- Renomeia os rótulos de função já cadastrados pra bater com a lista de ordem fixa da spec (o
-- cartão de comissão passa a listar as funções numa ordem fixa por nome de cargo, não mais pela
-- ordem em que cada coluna apareceu pela primeira vez).
update public.organograma_base set grupo = 'Fisiologista' where grupo = 'Fisiologia';
update public.organograma_base set grupo = 'Fisioterapeuta' where grupo = 'Fisioterapia';
update public.organograma_base set grupo = 'Psicólogo' where grupo = 'Psicologia';

notify pgrst, 'reload schema';
