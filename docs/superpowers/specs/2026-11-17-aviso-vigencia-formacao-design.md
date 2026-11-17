# Aviso de Término além do limite de 20 anos (Contrato de Formação)

Data: 17/11/2026
Status: Design aprovado pelo Mateus — pronto para implementar

## Contexto

Levantamento feito em 16/11/2026 (SELECT comparando `vigencia_fim` salvo com a
regra `nascimento + 20 anos − 1 dia`) encontrou 18 atletas com Término do
Contrato de Formação além do permitido pelas regras do atleta de formação (não
pode ultrapassar a data em que o atleta completa 20 anos). A causa não era um
bug de cálculo — era entrada manual incorreta antes de existir qualquer
sugestão automática no formulário (adicionada em 11/11/2026). Os dados já
existentes foram corrigidos diretamente no banco pelo Mateus via SQL.

Esta spec cobre como evitar que o erro se repita.

## Requisito (confirmado com o Mateus)

- O limite é só um **teto**: Término não pode passar de
  nascimento + 20 anos − 1 dia. Contratos mais curtos (ex: 3 anos) continuam
  normais e não devem gerar aviso.
- Quando o Término digitado ultrapassar esse teto, mostrar um **aviso visível**
  perto do campo — não bloquear o salvamento, não precisa de nenhuma caixinha
  de exceção na tela. Um caso raro que realmente precise fugir da regra
  continua salvável, só aparece o aviso.
- Vale pros dois fluxos (criar e editar o contrato), já que usam o mesmo
  formulário.

## Design

Em `components/contrato-formacao-form.tsx`:

- Já existe `vigenciaFimSugerida = dataFimFormacao(dataNascimentoAtleta)`,
  hoje usada só como `defaultValue` do campo Término. Essa mesma data passa a
  ser reaproveitada como o teto de comparação — nenhuma lógica de cálculo
  nova.
- O campo Término ganha um `onChange` que compara o valor digitado com
  `vigenciaFimSugerida` (comparação de string "YYYY-MM-DD" funciona
  diretamente, já que o formato é sempre zero-padded) e guarda o resultado num
  `useState` (`terminoAlemDoLimite: boolean`).
- Esse estado também é calculado uma vez na montagem do componente (a partir
  do valor inicial do campo — `values.vigenciaFim ?? vigenciaFimSugerida`),
  pra já aparecer o aviso em modo de edição quando o contrato salvo já estiver
  com a data além do limite.
- Quando `terminoAlemDoLimite` for `true`, mostrar uma mensagem abaixo do
  campo Término, por exemplo: "Essa data passa de {vigenciaFimSugerida
  formatada}, quando o atleta completa 20 anos — confira antes de salvar."
  (estilo visual de aviso, não de erro bloqueante — sem impedir o submit do
  formulário).

## Fora de escopo

- Nenhuma validação no servidor (`actions.ts`) nem no banco — é só um aviso
  de interface, o salvamento nunca é bloqueado.
- Nenhuma opção de "contrato antigo / só pra registro" — decidido que não é
  necessária.
