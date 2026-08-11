-- Termo de Responsabilidade — Retirada de Materiais (pedido do Mateus em 11/08, ver
-- docs/superpowers/specs/2026-08-11-termos-retirada-design.md).
--
-- Por que NÃO é uma Saída de Estoque nem uma Solicitação:
--  - `estoque_saidas` (0021) já cobre a retirada de item do CATÁLOGO (esportivo/médico), com baixa
--    de quantidade e ficha assinada. Aqui os itens são digitados livremente (equipamento,
--    patrimônio, material que não está cadastrado), então nada é baixado do estoque.
--  - Solicitações é fluxo de pedido/aprovação; este é um documento de responsabilidade assinado no
--    ato da retirada. Cada um no seu lugar, sem duplicar a mesma informação.
--
-- O termo pode ser de EMPRÉSTIMO (o material volta pro clube — tem previsão e registro de
-- devolução) ou de retirada DEFINITIVA (consumo/entrega definitiva). O texto de responsabilidade
-- é gravado junto do termo: o padrão vem do tipo, mas cada termo guarda o texto que foi realmente
-- assinado, pra o PDF de um termo antigo nunca mudar quando o texto padrão for ajustado.

create table public.termos_retirada (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique,
  data date not null default current_date,
  tipo text not null default 'emprestimo' check (tipo in ('emprestimo', 'definitiva')),
  responsavel_nome text not null,
  responsavel_documento text,
  funcao text,
  departamento text,
  finalidade text,
  previsao_devolucao date,
  texto_responsabilidade text not null,
  observacoes text,
  devolvido_em date,
  devolucao_observacoes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger termos_retirada_set_updated_at
before update on public.termos_retirada
for each row execute function set_updated_at();

create index termos_retirada_data_idx on public.termos_retirada (data desc);

create table public.termo_retirada_itens (
  id uuid primary key default gen_random_uuid(),
  termo_id uuid not null references public.termos_retirada(id) on delete cascade,
  descricao text not null,
  quantidade numeric(10, 2) not null default 1 check (quantidade > 0),
  -- "Valor sugerido" de cada item: é o que sustenta o trecho do termo sobre ressarcimento em caso
  -- de não devolução. Opcional — item sem valor entra como null e não soma no total.
  valor_unitario numeric(12, 2) check (valor_unitario is null or valor_unitario >= 0),
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index termo_retirada_itens_termo_idx on public.termo_retirada_itens (termo_id, ordem);

-- RLS + grants (mesmo padrão das demais tabelas do sistema)

alter table public.termos_retirada enable row level security;
alter table public.termo_retirada_itens enable row level security;

create policy "authenticated_full_access" on public.termos_retirada
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_full_access" on public.termo_retirada_itens
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.termos_retirada to authenticated;
grant select, insert, update, delete on public.termo_retirada_itens to authenticated;

-- Módulo novo liberado pra todo mundo que já existe (mesmo espírito de 0024 e 0063).

alter table public.perfis
  alter column modulos_permitidos set default array[
    'atletas',
    'comissao_tecnica',
    'staff_operacional',
    'jogos',
    'competicoes',
    'solicitacoes',
    'estoque',
    'termos_retirada',
    'financeiro'
  ];

update public.perfis
  set modulos_permitidos = array_append(modulos_permitidos, 'termos_retirada')
  where not ('termos_retirada' = any(modulos_permitidos));
