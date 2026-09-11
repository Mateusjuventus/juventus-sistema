-- Campos que faltavam na inscrição de Captação comparado à "Ficha de Avaliação" física (ver spec
-- docs/superpowers/specs/2026-09-11-captacao-documentos-termo-auto-cadastro-design.md, seção 1) —
-- RG/CPF do candidato, 2ª posição, pé dominante, altura/peso, e-mail, plano de saúde, escolaridade/
-- período e federação, mais o bloco do Termo de Responsabilidade (consentimento digital, seção 3).
-- Aplicar via SQL editor do painel Supabase, depois de 0001 a 0101.

alter table public.captacao_base add column rg text;
alter table public.captacao_base add column cpf text;
alter table public.captacao_base add column segunda_posicao text;
alter table public.captacao_base add column pe_dominante text;
alter table public.captacao_base add column altura numeric(3, 2);
alter table public.captacao_base add column peso numeric(5, 2);
alter table public.captacao_base add column email text;
alter table public.captacao_base add column possui_plano_saude boolean;
alter table public.captacao_base add column plano_saude_qual text;
alter table public.captacao_base add column escolaridade text;
alter table public.captacao_base add column periodo_escolar text;
alter table public.captacao_base add column federado boolean;
alter table public.captacao_base add column federado_clube text;

-- Termo de Responsabilidade — consentimento digital (ver seção 3 do spec: não é assinatura
-- desenhada nem o mecanismo de `assinaturas_documento`, que exige login). Nome/CPF do responsável
-- legal, mais um "Li e concordo" separado do Atleta e do Responsável, com data/hora do aceite.
alter table public.captacao_base add column responsavel_legal_nome text;
alter table public.captacao_base add column responsavel_legal_cpf text;
alter table public.captacao_base add column termo_aceite_atleta boolean not null default false;
alter table public.captacao_base add column termo_aceite_responsavel boolean not null default false;
alter table public.captacao_base add column termo_aceito_em timestamptz;
