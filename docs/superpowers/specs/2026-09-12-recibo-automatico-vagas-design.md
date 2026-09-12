# Recibo automático a partir das Vagas de Staff

Data: 12/09/2026

## Problema

O Recibo de Pagamento de um jogo (`recibos_jogo` / `recibos_jogo_base`) só marcava "Incluir" pra
quem tinha vaga confirmada na **primeira vez** que a tela era aberta, antes de qualquer "Salvar".
Depois do primeiro salvamento, cada vaga nova pega, perdida ou promovida da espera exigia que o
Mateus abrisse a tela de Recibo e marcasse/desmarcasse na mão — o que ele relatou como o
comportamento incômodo: "quando eu removo a pessoa da vaga no meu sistema, aparece pra ela ainda
que está com a vaga e só contabiliza quando ela desiste da vaga", e casos de gente entrando na fila
de espera com vaga disponível (essa segunda parte tinha outra causa, investigada à parte na mesma
conversa: contagem inflada por gente que já devia ter saído do "confirmado" e não saiu).

## Decisão

A linha do recibo passa a acompanhar automaticamente quem está de fato confirmado numa vaga,
para os dois departamentos (Profissional e Base):

- **Confirma vaga** (pega direto pelo link público, é chamado da lista de espera, ou é adicionado
  manualmente pelo Mateus na tela de administração) → cria a linha do recibo automaticamente, com
  valor padrão, chave PIX e função vindos do cadastro do Staff Operacional — os mesmos valores que
  a tela de Recibo já sugeria manualmente.
- **Perde a vaga** (desiste pelo link, ou é removido pela tela de administração) → apaga a linha do
  recibo automaticamente, **mesmo que já estivesse marcada como paga** (decisão explícita do
  Mateus: se a vaga não vale mais, o recibo automático também não).
- Quem cai na **lista de espera** não entra no recibo — só quando efetivamente confirmado.
- O campo `pago` nunca é sobrescrito por esta sincronização: se por algum motivo já existir uma
  linha de recibo pra aquela pessoa quando ela confirma vaga de novo, o valor de `pago` não é
  tocado.

## Limite conhecido

A tela de Recibo salva tudo de uma vez (o botão "Salvar recibos" apaga e recria a lista inteira com
o que está marcado na tela naquele momento). Se uma vaga for confirmada ou perdida bem no instante
em que o Mateus está com a aba de Recibo aberta sem ter salvado ainda, o próximo "Salvar" dele pode
sobrescrever essa mudança automática. Aceito como um caso raro (as duas ações normalmente não
acontecem ao mesmo tempo).

## Implementação

Lógica compartilhada em `lib/futebol/recibo-auto-sync.ts` (`marcarReciboAutomatico` /
`desmarcarReciboAutomatico`), parametrizada pelos nomes de tabela de cada departamento — chamada a
partir de:

- `app/vagas/[token]/actions.ts` e `app/vagas-base/[token]/actions.ts` — `pegarVaga(Base)` (só
  quando o resultado é "confirmado") e `desistirVaga(Base)`.
- `app/jogos/[id]/vagas/actions.ts` e `app/base/jogos/[id]/vagas/actions.ts` —
  `removerInscricao(Base)`, `chamarDaEspera(Base)`, e `adicionarStaffManual` (só existe no
  Profissional).

Escopo deliberadamente fora desta mudança: `trocarFuncaoInscricao(Base)` (trocar a função de quem
já está confirmado) não atualiza `funcao_jogo` no recibo automaticamente — não foi pedido, e o
campo continua editável à mão na tela de Recibo.
