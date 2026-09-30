-- Datas de Lesões/Queixas/Atendimentos passam a aceitar ficar em branco, só pra dar lugar aos
-- registros vindos do histórico importado do relatório em papel (Copa Paulista 2026), que não tem
-- data exata de cada lesão/queixa/atendimento — só totais e listas em texto. Lançamentos feitos
-- pela tela continuam exigindo data (o formulário não muda, isso só afeta o banco).
alter table public.fisioterapia_lesoes alter column data_inicio drop not null;
alter table public.fisioterapia_queixas alter column data drop not null;
alter table public.fisioterapia_atendimentos alter column data drop not null;

-- Quantidade agregada num único registro de atendimento — só usada nos registros importados do
-- histórico (ex.: "57 atendimentos" do relatório em papel, sem data de cada um, então vira 1
-- registro só em vez de inventar 57 datas). Nulo = 1 atendimento normal, o caso de sempre (um
-- registro por visita, lançado pela tela).
alter table public.fisioterapia_atendimentos add column if not exists quantidade integer;

notify pgrst, 'reload schema';
