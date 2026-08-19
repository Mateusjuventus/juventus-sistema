-- Parecer Final de Avaliação + acesso do Treinador (ver docs/superpowers/specs/
-- 2026-08-19-parecer-final-treinador-design.md).

-- `captacao_base` ganha os campos do Parecer Final: foto (mesmo padrão de atletas_base.foto_path),
-- clube anterior, as 4 notas (preenchidas pelo Treinador, sempre entre 3 e 9 — mesma escala da
-- legenda do documento) e o controle de quem/quando preencheu.
alter table public.captacao_base add column if not exists foto_path text;
alter table public.captacao_base add column if not exists clube_anterior text;
alter table public.captacao_base add column if not exists nota_tecnica smallint;
alter table public.captacao_base add column if not exists nota_fisica smallint;
alter table public.captacao_base add column if not exists nota_tatica smallint;
alter table public.captacao_base add column if not exists nota_comportamental smallint;
alter table public.captacao_base add column if not exists parecer_comentarios text;
alter table public.captacao_base add column if not exists parecer_preenchido_em timestamptz;
alter table public.captacao_base add column if not exists parecer_preenchido_por uuid references public.perfis(id);

alter table public.captacao_base add constraint captacao_base_nota_tecnica_check
  check (nota_tecnica is null or nota_tecnica between 3 and 9);
alter table public.captacao_base add constraint captacao_base_nota_fisica_check
  check (nota_fisica is null or nota_fisica between 3 and 9);
alter table public.captacao_base add constraint captacao_base_nota_tatica_check
  check (nota_tatica is null or nota_tatica between 3 and 9);
alter table public.captacao_base add constraint captacao_base_nota_comportamental_check
  check (nota_comportamental is null or nota_comportamental between 3 and 9);

-- `perfis` ganha o papel "treinador" e a lista de categorias que ele enxerga (pode ser mais de
-- uma — ex.: um treinador que cobre Sub-11 e Sub-12 ao mesmo tempo).
alter table public.perfis drop constraint perfis_role_check;
alter table public.perfis add constraint perfis_role_check
  check (role in ('master', 'regular', 'treinador'));
alter table public.perfis add column if not exists categorias_treinador text[] not null default '{}';

-- Configuração das assinaturas do Parecer Final — lista que cresce (o Mateus pediu "3 e se
-- precisar adiciono mais"), por isso um array em vez de colunas fixas tipo assinatura1/assinatura2
-- (padrão usado hoje em configuracoes_financeiro).
create table public.configuracoes_parecer_captacao_base (
  id uuid primary key default gen_random_uuid(),
  assinaturas jsonb not null default '[
    {"nome": "", "cargo": ""},
    {"nome": "", "cargo": ""},
    {"nome": "", "cargo": ""}
  ]'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger configuracoes_parecer_captacao_base_set_updated_at
  before update on public.configuracoes_parecer_captacao_base
  for each row execute function set_updated_at();

insert into public.configuracoes_parecer_captacao_base (id) values (gen_random_uuid());

alter table public.configuracoes_parecer_captacao_base enable row level security;
create policy "authenticated_full_access" on public.configuracoes_parecer_captacao_base
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, update on public.configuracoes_parecer_captacao_base to authenticated;

notify pgrst, 'reload schema';
