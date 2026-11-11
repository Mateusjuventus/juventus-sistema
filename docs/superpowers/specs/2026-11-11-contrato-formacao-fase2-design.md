# Contrato de Formação — Fase 2: tela própria, contrato de maior de idade e Vigência do BID

Data: 2026-11-11
Status: aprovado, pendente de implementação

## Contexto

A Fase 1 (ver `docs/superpowers/specs/2026-11-09-contrato-formacao-design.md`) implementou o Contrato de
Formação como mais um "Tipo de contrato" dentro do formulário genérico de Novo contrato/Aditivo, com um
botão "Baixar Contrato de Formação" dentro do card "Contrato" da tela Ver atleta, gerando o PDF do
contrato de atleta menor de idade.

Depois de ver a Fase 1 em produção, o Mateus pediu uma revisão: a Formação precisa de uma tela própria
(porque envolve preencher dados dos pais e corrigir valores sem gerar Aditivo/histórico), precisa
funcionar também para atletas já maiores de idade (contrato totalmente diferente, sem assinatura dos
pais), e surgiu a necessidade de guardar a vigência do registro na CBF/FPF (BID) separada da vigência do
próprio Contrato de Formação.

## Decisões confirmadas com o Mateus

1. A Formação continua sendo o mesmo registro de hoje (`atleta_contratos`, `tipo_contrato = 'formacao'`,
   um vigente por atleta) — não há modelagem nova paralela.
2. "Formação" continua disponível no dropdown "Tipo de contrato" do formulário genérico de Novo
   contrato/Aditivo — a tela nova é um caminho adicional, não uma substituição.
3. A tela nova de Contrato de Formação aparece **sempre** na tela Ver atleta, pra qualquer atleta,
   independente do tipo de contrato vigente atual (Amador, Definitivo, Empréstimo, ou nenhum).
4. Ao **criar** o Contrato de Formação pela tela nova: grava os dados preenchidos e encerra o contrato
   vigente atual (seja ele qual for — mesmo mecanismo de hoje do Aditivo: `vigente=false`,
   `encerrado_em` = agora, preservando a vigência própria que esse contrato tinha), e sobe o novo
   registro como vigente, com `tipo_contrato = 'formacao'`.
5. Ao **editar** um Contrato de Formação que já é o vigente: atualiza o **mesmo registro**, sem encerrar
   e sem criar histórico novo (sem Aditivo).
6. Os campos de Responsáveis (mãe/pai: nome, telefone, e-mail, CPF) ficam disponíveis pra edição direto
   nessa tela nova, sempre visíveis (mesmo pra atleta já maior de idade), gravando nas mesmas colunas de
   `atletas` usadas pelo cadastro — não existe cópia separada.
7. Qual modelo de PDF usar (menor/maior de idade) é decidido **na hora de gerar o PDF**, pela idade atual
   do atleta (data de nascimento vs. data de hoje), não por um campo fixado na criação do contrato. Se o
   atleta completar 18 anos durante a vigência do mesmo Contrato de Formação, o PDF passa a saber
   automaticamente no modelo de maior.
8. A "Vigência do BID" (período de registro do atleta na CBF/FPF) é um dado do **atleta**, independente
   de qual contrato está vigente ou arquivado — precisa continuar editável mesmo depois do contrato
   anterior (ex: Amador) ser encerrado, porque pode divergir da vigência do Contrato de Formação. Fica
   editável dentro da seção "Contrato" da tela nova, junto da vigência do próprio Contrato de Formação,
   mas armazenada em `atletas` (não em `atleta_contratos`) — o mesmo princípio já usado pra
   `valor_ajuda_custo`. Esse campo não aparece no texto do PDF gerado (é só controle interno do clube).

## Contrato de maior de idade — achados e correções no texto

O Mateus anexou o modelo `Contrato de Formação — Maior.docx`, que é um contrato **diferente** do de
menor (não é uma variante condicional do mesmo texto):

- Preâmbulo qualifica só o ATLETA (sem "assistido ou representado por sua mãe/pai").
- Bloco de assinatura final é só "ATLETA" — sem "PAI DO ATLETA"/"MÃE DO ATLETA".
- Qualificação do atleta inclui e-mail dele (campo novo pro merge, já existe em `atletas.email` — sem
  necessidade de migração) e não inclui naturalidade.
- Cláusulas 3.1 (obrigações do Clube, a–j) e 3.2 (obrigações do Atleta, a–w) perderam a numeração de
  lista no Word, igual já havia acontecido no contrato de menor — recuperada pelas autorreferências do
  próprio texto ("letra n", "alínea d").
- Cabeçalho/rodapé usam imagens próprias deste arquivo (dimensões diferentes das do contrato de menor) —
  extraídas do docx e usadas como ativos novos.

Três correções confirmadas pelo Mateus (ajustes de formatação/numeração e correção de valor — não
mudança de cláusula):

1. Cláusula 15 (Condições negociais do futuro Contrato Especial de Trabalho Desportivo): a lista tinha
   a), b), c), e) — pulando "d)". Corrigir pra sequência sem buraco (reletrando e/f/g para d/e/f, e os
   subitens g.1/g.2 para e.1/e.2).
2. Parágrafo final da Cláusula Décima Segunda (Práticas Anticorrupção) estava numerado "13.4" e citava
   "esta Cláusula 13" — corrigir para "12.4" e "Cláusula 12".
3. Cláusula 8.2 tinha "multa no valor de R$ 500.00,00 (quinhentos mil reais)" — corrigir o valor
   numérico para R$ 500.000,00 (compatível com o valor escrito por extenso).

A nota deixada no item g.2 ("-verificar se esses termos se aplicam ao atleta, se há alguma alteração.")
foi confirmada como texto a manter — **não remover**.

## Modelo de dados

Nova migration (`0162_atleta_contrato_formacao_tela_propria.sql`):

- `atletas.vigencia_bid_inicio date`, `atletas.vigencia_bid_fim date` (nullable) — vigência do registro
  do atleta na CBF/FPF (BID), independente do contrato vigente.
- Nova função `atualizar_contrato_formacao_vigente(p_atleta_id uuid, p_vigencia_inicio date,
  p_vigencia_fim date, p_bolsa_aprendizagem numeric)`, `security definer`: atualiza, em UPDATE (não
  INSERT), o registro em `atleta_contratos` onde `atleta_id = p_atleta_id and vigente = true and
  tipo_contrato = 'formacao'`; lança erro se não existir tal registro. Usada pelo modo "editar" da tela
  nova — o modo "criar" continua usando a `criar_contrato_atleta` já existente, sem mudança de
  assinatura.

Sem mudanças em `lib/supabase/types.ts` (adicionar os dois campos novos de `atletas`) e
`lib/validation/schemas.ts` (schema próprio do formulário novo) fora do já esperado.

## Tela "Ver atleta" — novo card

Novo componente `components/contrato-formacao-secao.tsx`, renderizado sempre (Profissional e Base),
posicionado logo depois do card "Contrato" existente:

- **Sem Formação vigente**: "Nenhum contrato de Formação vigente." + botão "Criar contrato de
  Formação" → `/atletas/[id]/contrato/formacao`.
- **Com Formação vigente**: resumo (vigência do Contrato de Formação, Vigência do BID, bolsa de
  aprendizagem, responsáveis) + botão "Baixar Contrato de Formação" (PDF) + botão "Editar" →
  `/atletas/[id]/contrato/formacao`.

O botão "Baixar Contrato de Formação" que hoje mora dentro de `components/contrato-secao.tsx` (Fase 1)
é removido de lá — passa a existir só dentro deste card novo, pra não duplicar a mesma ação em dois
lugares.

## Tela nova de formulário

Página `app/atletas/[id]/contrato/formacao/page.tsx`, um formulário só, que serve tanto "criar" quanto
"editar" (detecta pela existência de um vigente com `tipo_contrato = 'formacao'`, mesmo padrão já usado
em `contrato/novo?modo=aditivo`). Três seções:

1. **Responsáveis** — nome, telefone, e-mail e CPF da mãe; nome, telefone, e-mail e CPF do pai.
   Pré-preenchido com os dados atuais de `atletas`, sempre editável (mesmo se o atleta já for maior de
   idade hoje).
2. **Contrato** — Vigência do Contrato de Formação (início/fim, com término sugerido por
   `dataFimFormacao`, igual à Fase 1) e Vigência do BID (início/fim, sem sugestão automática).
3. **Remuneração** — Bolsa de aprendizagem.

Duas novas server actions em `app/atletas/[id]/contrato/formacao/actions.ts`:

- `criarContratoFormacao`: valida o formulário, grava os campos de Responsáveis e Vigência do BID em
  `atletas`, e chama `criar_contrato_atleta` com `tipo_contrato = 'formacao'` e os valores de vigência/
  bolsa do Contrato de Formação (encerra o vigente atual, sobe este como novo vigente).
- `atualizarContratoFormacao`: mesma gravação em `atletas`, mas chama
  `atualizar_contrato_formacao_vigente` (atualização em vigência/bolsa) no registro vigente existente —
  sem Aditivo, sem histórico novo.

## Geração do PDF

`app/atletas/[id]/contrato/formacao/pdf/route.tsx` passa a calcular a idade atual do atleta (data de
nascimento vs. data de hoje) e escolher entre dois componentes de documento:

- `lib/pdf/contrato-formacao-document.tsx` (já existe, Fase 1) — atleta menor de 18 anos.
- `lib/pdf/contrato-formacao-maior-document.tsx` (novo) — atleta com 18 anos ou mais, com o texto do
  modelo "Maior" (seção anterior), campos `nomeCompleto, dataNascimento, rg, cpf, email, endereco,
  vigenciaInicio, vigenciaFim, bolsaValor, dataAssinaturaExtenso` (sem naturalidade, sem dados dos
  pais), cabeçalho/rodapé próprios deste modelo.

A Vigência do BID não entra no texto do PDF — é só controle interno.

## Fora de escopo

- Qualquer mudança no fluxo do Futebol de Base que não seja o mesmo card/tela compartilhados (a tela
  "Ver atleta" da Base já redireciona pro fluxo unificado — sem rota própria nova).
- Qualquer alerta/notificação automática sobre a Vigência do BID estar vencendo ou vencida — é só um
  campo de registro, sem regra de negócio associada por enquanto.
