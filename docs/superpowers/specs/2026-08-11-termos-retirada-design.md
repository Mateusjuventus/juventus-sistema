# Termo de Responsabilidade — Retirada de Materiais (11/08/2026)

## O pedido

O Mateus quis "um documento de retirada de materiais, um termo de responsabilidade" com o que está
saindo, descrição, valor sugerido e um texto de responsabilidade — e perguntou se caberia no
módulo de Solicitações.

## Por que NÃO em Solicitações, e por que não é a Saída do Estoque

- **Solicitações** é fluxo de pedido e aprovação (alguém pede, outro autoriza). O termo é um
  documento assinado no ato da entrega, com responsabilidade de quem recebe — outra natureza.
- **Estoque → Saída** (`estoque_saidas`, migração 0021) já faz exatamente isso PARA O CATÁLOGO:
  registra a retirada por um colaborador e gera a ficha em PDF com declaração e três assinaturas,
  com texto diferente para Esportivo e Médico. Continua sendo o caminho certo para uniforme e
  medicamento.
- O caso do Mateus é outro: itens **digitados livremente** (equipamento, patrimônio, material que
  não está cadastrado), sem baixa de estoque. Por isso virou módulo próprio, e não um campo a mais
  na Saída — que teria que passar a aceitar item fora do catálogo e confundiria as duas coisas.

Decisões respondidas por ele: itens digitados livremente; valor **unitário e total**; e o termo
pode ser de **empréstimo** (com devolução) ou de **retirada definitiva**, escolhido no documento.

## Estrutura

- `termos_retirada`: numeração sequencial única (a de Estoque é por categoria), data, tipo,
  dados de quem retira (nome, RG/CPF, função, departamento), finalidade, previsão de devolução
  (só empréstimo), texto de responsabilidade, observações, e o registro da devolução
  (`devolvido_em`, `devolucao_observacoes`).
- `termo_retirada_itens`: descrição livre, quantidade, `valor_unitario` **opcional** — item sem
  valor não soma no total, porque nem todo material tem valor de referência à mão.
- O **texto de responsabilidade é gravado no termo**. O padrão vem do tipo escolhido
  (`TEXTO_PADRAO` em `lib/futebol/termo-retirada.ts`, na mesma linha da ficha do Estoque, que é o
  formulário impresso já em uso), mas fica editável — e um termo antigo nunca muda de redação
  quando o padrão for ajustado.

## Telas

- `/termos` — lista com abas Em aberto (padrão), Devolvidos, Definitivas, Todos. O valor do módulo
  está em saber o que ainda está fora do clube: empréstimo cuja previsão passou aparece como
  **Devolução atrasada**, e a contagem sobe no cabeçalho da página.
- `/termos/novo` e `/termos/[id]/editar` — formulário com itens dinâmicos e total calculado na
  hora (é o número que o texto de ressarcimento usa).
- `/termos/[id]` — o termo, com registro de devolução em um clique (e desfazer, se registrar
  errado).
- `/termos/[id]/pdf` — o documento para imprimir e assinar: escudo, dados de quem retira, tabela
  com valor unitário e total (com o total por extenso, reaproveitando `lib/pdf/valor-extenso.ts`),
  declaração, três assinaturas e, no empréstimo, um bloco de recebimento da devolução.

`lib/futebol/termo-retirada.ts` é puro e testado (total com item sem valor, situação
atrasado/em aberto/devolvido, numeração).

Migração: 0068_termos_retirada.sql — cria as tabelas e libera o módulo novo `termos_retirada` para
todos os usuários existentes (mesmo espírito de 0024 e 0063).

## Atualização (11/08): prazo do empréstimo e anexo do termo assinado

O Mateus perguntou como fica o prazo quando quem retira é funcionário e usa o material no
trabalho — devolveria só ao mudar de função ou sair do clube. A resposta é que a previsão de
devolução **é opcional**: em branco, o termo fica "Em aberto" por tempo indeterminado e nunca vira
"atrasado" (o alerta só existe quando há data). A data serve pro empréstimo pontual, com prazo
certo. O texto padrão já cobria isso ("no prazo previsto neste termo, no ato da rescisão do meu
contrato ou sempre que solicitado pelo Clube").

Dois ajustes que saíram daí:

- Sem data, a tela e o PDF deixaram de mostrar um traço vazio e passam a imprimir "Ao término do
  vínculo/função ou quando solicitado pelo Clube" — que é o que de fato vale. O texto de ajuda do
  formulário explica o que significa deixar em branco.
- **Anexo do termo assinado** (`termo_retirada_anexos`, migração 0069): o sistema NÃO faz
  assinatura digital, então o fluxo é gerar o PDF, imprimir, colher as assinaturas e subir o
  digitalizado de volta no termo — é o anexo que dá valor de comprovante ao registro. É tabela (e
  não uma coluna) porque o termo costuma acumular mais de um arquivo: o termo assinado, o
  comprovante da devolução assinado depois, foto do material. Bucket privado próprio
  `termo-documentos`, mesmo padrão de 0054/0063.

Assinatura eletrônica de verdade (Clicksign, D4Sign, ZapSign e afins) ficaria como integração
externa paga, com fluxo de envio/assinatura/callback — não está no escopo e nunca foi prometida
aqui.

## Fora de escopo por ora

- Vincular o termo a um atleta/colaborador já cadastrado (hoje o nome é digitado) — dá para fazer
  depois se o Mateus quiser cruzar com o histórico da pessoa.
- Alerta de devolução atrasada no Mural da Home: a lista já sinaliza; se virar necessidade, entra
  no mesmo formato dos avisos de competição.
