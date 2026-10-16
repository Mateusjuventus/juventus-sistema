# Atleta — Dados Pessoais: e-mails, segundo endereço e contatos de emergência

## Contexto

Depois de um levantamento de campos da "Ficha de Anamnese e Diagnóstico Social" (Categorias de
Base) pedido pelo Mateus, que já confirmou querer acrescentar e-mail do atleta/pai/mãe no cadastro
da Base, ele pediu mais mudanças no cadastro do atleta — desta vez em Profissional **e** Base:

> "CADASTRO DO ATLETA: DADOS PESSOAIS: Email: / Endereço de origem: Logradouro, nº, complemento,
> bairro, cep, cidade. / Em caso de emergência, avisar: Nome: / Parentesco: / Contato:"

Esta spec cobre só a parte de **Dados Pessoais**. As mudanças de Dados Esportivos e o novo
sub-sistema de Dados de Contrato ficam em
`docs/superpowers/specs/2026-10-16-atleta-dados-esportivos-contrato-design.md`, por serem maiores e
dependerem de um desenho próprio.

## Decisões confirmadas com o Mateus

- Escopo: Profissional (`atletas`) **e** Base (`atletas_base`).
- E-mail do atleta: campo novo nas duas tabelas. E-mail do pai/mãe: só em `atletas_base` (não faz
  sentido no Profissional, que são atletas adultos).
- Endereço: **não** renomear o "Endereço atual" existente. Só acrescentar um segundo endereço
  estruturado, "Endereço de origem", com um checkbox "Mesmo endereço de origem" perto do bloco
  "Endereço atual" que copia os valores digitados em Origem pro Endereço atual (autopreenchimento
  único, não fica sincronizado depois — os campos continuam editáveis livremente).
- Contatos de emergência: pode haver mais de um por atleta (lista, com "+ Adicionar contato"), não
  só um.

## Modelo de dados

Migração `0136_atleta_dados_pessoais.sql`:

```sql
-- E-mails
alter table public.atletas add column if not exists email text;

alter table public.atletas_base add column if not exists email text;
alter table public.atletas_base add column if not exists email_pai text;
alter table public.atletas_base add column if not exists email_mae text;

-- Endereço de origem — mesmo formato do endereço estruturado já existente (cep/logradouro/numero/
-- complemento/bairro/cidade/uf), com prefixo "origem_" pra não colidir com as colunas do endereço
-- atual.
alter table public.atletas add column if not exists origem_cep text;
alter table public.atletas add column if not exists origem_logradouro text;
alter table public.atletas add column if not exists origem_numero text;
alter table public.atletas add column if not exists origem_complemento text;
alter table public.atletas add column if not exists origem_bairro text;
alter table public.atletas add column if not exists origem_cidade text;
alter table public.atletas add column if not exists origem_uf text;

alter table public.atletas_base add column if not exists origem_cep text;
alter table public.atletas_base add column if not exists origem_logradouro text;
alter table public.atletas_base add column if not exists origem_numero text;
alter table public.atletas_base add column if not exists origem_complemento text;
alter table public.atletas_base add column if not exists origem_bairro text;
alter table public.atletas_base add column if not exists origem_cidade text;
alter table public.atletas_base add column if not exists origem_uf text;

-- Contatos de emergência — lista (zero ou mais) por atleta, mesmo espírito de `atleta_documentos`
-- (tabela filha simples, sem upload de arquivo aqui).
create table public.atleta_contatos_emergencia (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  nome text not null,
  parentesco text,
  contato text,
  created_at timestamptz not null default now()
);

create index atleta_contatos_emergencia_atleta_id_idx
  on public.atleta_contatos_emergencia (atleta_id);

alter table public.atleta_contatos_emergencia enable row level security;

create policy "authenticated_full_access" on public.atleta_contatos_emergencia
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atleta_contatos_emergencia to authenticated;

create table public.atleta_base_contatos_emergencia (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas_base(id) on delete cascade,
  nome text not null,
  parentesco text,
  contato text,
  created_at timestamptz not null default now()
);

create index atleta_base_contatos_emergencia_atleta_id_idx
  on public.atleta_base_contatos_emergencia (atleta_id);

alter table public.atleta_base_contatos_emergencia enable row level security;

create policy "authenticated_full_access" on public.atleta_base_contatos_emergencia
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select, insert, update, delete on public.atleta_base_contatos_emergencia to authenticated;

notify pgrst, 'reload schema';
```

Novas interfaces em `lib/supabase/types.ts`: campos `email`/`origem_*` em `AtletaRow` e
`AtletaBaseRow`; `email_pai`/`email_mae` só em `AtletaBaseRow`; `AtletaContatoEmergenciaRow` e
`AtletaBaseContatoEmergenciaRow` (id, atleta_id, nome, parentesco, contato, created_at).

## Formulário

**E-mail**: `TextField` (`type="email"`) logo abaixo de Telefone, em `atleta-form.tsx` e
`atleta-base-form.tsx`. `email_pai`/`email_mae` só aparecem no formulário da Base, perto de
`maeNome`/`paiNome`.

**Endereço de origem**: novo bloco "Endereço de origem (com busca por CEP)", reaproveitando
`EnderecoFields` — que ganha um prop novo opcional `namePrefix` (prefixa `name`/`id` de cada campo
interno, ex.: `origem_cep`; vazio por padrão, então todo uso existente continua sem mudança).

**Checkbox "Mesmo endereço de origem"**: fica junto do bloco "Endereço atual" existente. O bloco de
Endereço de origem ganha um `onChange` (novo prop em `EnderecoFields`, chamado a cada campo editado
com o objeto completo) que o formulário usa pra guardar os valores digitados em estado local. Ao
marcar o checkbox, o formulário copia esse estado pros valores padrão do bloco "Endereço atual" e
força esse bloco a remontar (mudando sua `key`, mesmo princípio já usado em `DocumentoForm` pra
limpar campos de arquivo) — é um autopreenchimento único no momento do clique, os campos continuam
editáveis livremente depois (inclusive se a pessoa editar a Origem de novo, não refaz a cópia
sozinho).

**Contatos de emergência**: bloco de lista dentro de "Dados pessoais", mesmo padrão da aba
"Documentação" (lista + mini-formulário "+ Adicionar contato" com Nome/Parentesco/Contato, e um
botão remover por linha usando o `DeleteButton` compartilhado) — mas sem upload de arquivo, então
pode ficar embutido na mesma página de editar o atleta em vez de precisar de uma aba própria (não
há motivo pra sair da tela principal só pra isso). Ações novas em `app/atletas/[id]/actions.ts` (e
Base): `adicionarContatoEmergencia`/`removerContatoEmergencia`, no mesmo molde de
`adicionarDocumento`/`removerDocumento`.

## Arquivos afetados

- `supabase/migrations/0136_atleta_dados_pessoais.sql` (novo)
- `lib/supabase/types.ts` — `AtletaRow`, `AtletaBaseRow`, `AtletaContatoEmergenciaRow`,
  `AtletaBaseContatoEmergenciaRow`
- `lib/validation/schemas.ts` — `email`/`origemCep` etc. em `atletaCamposBase`; `emailPai`/
  `emailMae` em `atletaBaseSchema`
- `components/endereco-fields.tsx` — props `namePrefix` e `onChange`
- `app/atletas/atleta-form.tsx`, `app/base/atletas/atleta-base-form.tsx`
- `app/atletas/actions.ts`, `app/base/atletas/actions.ts` — parseForm + novas actions de contato de
  emergência
- `app/atletas/[id]/page.tsx`, `app/base/atletas/[categoria]/[id]/page.tsx` — carregar e passar os
  contatos de emergência existentes pro formulário
- `app/atletas/[id]/ver/page.tsx`, `.../ver/page.tsx` (Base) — exibir os novos campos na visão
  somente leitura

## Verificação

Checagem de sintaxe por esbuild em cada arquivo tocado; sem alteração em PDFs, então sem harness de
render necessário aqui. Recomendo rodar `npm run typecheck`/`next build` no projeto real antes do
deploy, como de costume.
