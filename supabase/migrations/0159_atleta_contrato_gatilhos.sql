-- Gatilhos (bônus por meta de desempenho) do Contrato do Atleta (ver docs/superpowers/specs/
-- 2026-11-04-contrato-atleta-gatilhos-design.md). Preso ao contrato (cascade), mesmo espírito de
-- atleta_contrato_evolucao_salarial (0158): só edita enquanto o contrato é o vigente.
create table public.atleta_contrato_gatilhos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.atleta_contratos(id) on delete cascade,
  metrica text not null check (
    metrica in (
      'pct_convocado', 'pct_titular', 'pct_mais_um_tempo', 'pct_jogo_completo',
      'total_gols', 'total_assistencias'
    )
  ),
  -- Percentual (0-100) pras métricas pct_*, contagem absoluta (ex: 10 gols) pras total_*.
  limiar numeric(10, 2) not null check (limiar >= 0),
  valor_bonus numeric(12, 2) not null check (valor_bonus >= 0),
  incluir_sem_competicao boolean not null default false,
  -- NULL = ainda não confirmado (o progresso é sempre calculado ao vivo, nunca lido daqui). Setado
  -- uma única vez, pelo botão "Confirmar bônus" — nunca recalculado/desfeito automaticamente.
  cumprida_em date,
  confirmada_por_perfil_id uuid references public.perfis(id) on delete set null,
  confirmada_por_nome text,
  criado_por_perfil_id uuid references public.perfis(id) on delete set null,
  criado_por_nome text,
  created_at timestamptz not null default now()
);

create index atleta_contrato_gatilhos_contrato_id_idx
  on public.atleta_contrato_gatilhos (contrato_id);

alter table public.atleta_contrato_gatilhos enable row level security;

create policy "authenticated_full_access" on public.atleta_contrato_gatilhos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atleta_contrato_gatilhos to authenticated;

-- Quais Competições entram no universo de jogos deste gatilho (checklist multi-seleção, mesmo
-- filtro já usado em "Dados de Jogo"/Ficha — ver `FiltroEstatisticasAtleta.competicaoIds`). Sem FK
-- pra `competicoes`/`competicoes_base`: Contrato já é unificado (Profissional + Base), mas
-- Competições ainda não — um gatilho de atleta da Base referencia `competicoes_base.id`, um do
-- Profissional referencia `competicoes.id`. Mesma ambiguidade que `TabelasEstatisticasAtleta` já
-- resolve na camada de consulta (recebe o nome da tabela certa como parâmetro); aqui só guardamos
-- o id solto, sem checar contra uma tabela específica.
create table public.atleta_contrato_gatilho_competicoes (
  gatilho_id uuid not null references public.atleta_contrato_gatilhos(id) on delete cascade,
  competicao_id uuid not null,
  primary key (gatilho_id, competicao_id)
);

alter table public.atleta_contrato_gatilho_competicoes enable row level security;

create policy "authenticated_full_access" on public.atleta_contrato_gatilho_competicoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atleta_contrato_gatilho_competicoes to authenticated;

-- "Adicionar gatilho" grava a linha principal + as Competições marcadas numa operação atômica só
-- (mesmo motivo de `criar_contrato_atleta`: evita a janela entre duas chamadas separadas do
-- supabase-js deixar um gatilho sem nenhuma Competição vinculada se a segunda falhar).
create function public.criar_gatilho_contrato(
  p_contrato_id uuid,
  p_metrica text,
  p_limiar numeric,
  p_valor_bonus numeric,
  p_competicao_ids uuid[],
  p_incluir_sem_competicao boolean,
  p_criado_por_perfil_id uuid,
  p_criado_por_nome text
) returns public.atleta_contrato_gatilhos
language plpgsql
as $$
declare
  novo public.atleta_contrato_gatilhos;
  competicao_id uuid;
begin
  insert into public.atleta_contrato_gatilhos (
    contrato_id, metrica, limiar, valor_bonus, incluir_sem_competicao,
    criado_por_perfil_id, criado_por_nome
  ) values (
    p_contrato_id, p_metrica, p_limiar, p_valor_bonus, p_incluir_sem_competicao,
    p_criado_por_perfil_id, p_criado_por_nome
  ) returning * into novo;

  foreach competicao_id in array p_competicao_ids loop
    insert into public.atleta_contrato_gatilho_competicoes (gatilho_id, competicao_id)
    values (novo.id, competicao_id);
  end loop;

  return novo;
end;
$$;

grant execute on function public.criar_gatilho_contrato to authenticated;

notify pgrst, 'reload schema';
