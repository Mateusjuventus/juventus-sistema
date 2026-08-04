-- Integração com a FPF (item 4 da sequência combinada, ver spec
-- docs/superpowers/specs/2026-08-04-integracao-fpf-design.md). Só Futebol Profissional por
-- enquanto — sem tabela nova espelhando dados da FPF, só estende `jogos` e `atletas` com as
-- referências mínimas de vínculo, já que o dado "oficial" continua sendo o nosso próprio registro.

-- Jogos: referência ao jogo da FPF (IdJogo), link do PDF da súmula oficial, e quando foi a última
-- sincronização bem-sucedida daquele jogo específico.
alter table public.jogos add column fpf_id_jogo integer unique;
alter table public.jogos add column fpf_link_sumula text;
alter table public.jogos add column fpf_sincronizado_em timestamptz;

-- Atletas: referência ao IdAtleta interno da FPF (diferente do `numero_fpf` já existente, que é o
-- número de registro/contrato do atleta — usado como sinal de vínculo automático de alta
-- confiança, mas não é o mesmo identificador que a API da FPF usa internamente).
alter table public.atletas add column fpf_id_atleta integer unique;

-- Atletas da FPF explicitamente marcados como "não corresponde a ninguém daqui" na tela de
-- vínculo de elenco, pra não ficar sugerindo a mesma pessoa de novo a cada sincronização.
create table public.fpf_atletas_ignorados (
  fpf_id_atleta integer primary key,
  nome text not null,
  ignorado_por uuid references auth.users(id),
  ignorado_em timestamptz not null default now()
);

-- Configuração da integração (campeonato/categoria/ano/clube), editável pela própria aplicação —
-- linha única, sem tabela de histórico.
create table public.fpf_config (
  id boolean primary key default true,
  id_campeonato integer not null,
  id_categoria integer not null,
  id_clube integer not null,
  nome_exibicao text not null,
  ano integer not null,
  updated_at timestamptz not null default now(),
  constraint fpf_config_singleton check (id)
);

-- Histórico de execuções da sincronização (manual ou automática via /api/fpf/sincronizar).
create table public.fpf_sync_log (
  id uuid primary key default gen_random_uuid(),
  executado_em timestamptz not null default now(),
  origem text not null check (origem in ('manual', 'automatica')),
  sucesso boolean not null,
  jogos_novos integer not null default 0,
  jogos_atualizados integer not null default 0,
  mensagem_erro text
);

-- RLS

alter table public.fpf_atletas_ignorados enable row level security;
alter table public.fpf_config enable row level security;
alter table public.fpf_sync_log enable row level security;

create policy "authenticated_full_access" on public.fpf_atletas_ignorados
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_full_access" on public.fpf_config
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_full_access" on public.fpf_sync_log
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Grants

grant select, insert, update, delete on public.fpf_atletas_ignorados to authenticated;
grant select, insert, update, delete on public.fpf_config to authenticated;
grant select, insert, update, delete on public.fpf_sync_log to authenticated;
