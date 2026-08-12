# Rooming List (nome completo), cadastro de Hotéis e cadastro de Veículos/Placas (12/08/2026)

Três pedidos do Mateus na mesma leva: um ajuste no PDF da rooming list e dois módulos novos.

## 1. Rooming List — PDF de uso interno com nome completo

O sistema gera dois PDFs de rooming list:

- **PDF completo (uso interno)** — leva apartamento, nome, nascimento, CPF e RG. É o que vai junto
  com o hotel e serve de base pro check-in.
- **PDF para atletas/comissão** — só apartamento e nome, é o que circula com o grupo.

O primeiro estava imprimindo **apelido** no lugar do nome do atleta, ao lado do CPF e do RG — o que
não fecha com documento nenhum na recepção do hotel. Corrigido em
`app/jogos/[id]/rooming-list/pdf/route.tsx`: agora atleta, comissão e staff saem todos por
`nome_completo`.

O apelido continua onde faz sentido: no **PDF para atletas/comissão** (é como o grupo se chama) e
nas telas de seleção do módulo. Nada mudou nesses dois lugares.

## 2. Módulo Hotéis (`/hoteis`, migração 0070)

Banco de dados dos hotéis com que o clube trabalha, pra não redigitar nome/endereço/contato a cada
viagem. Além do que foi pedido (nome, endereço, cidade, telefone, e-mail, observações), o cadastro
guarda o que se costuma perder entre uma viagem e outra:

- **Contato nominal no hotel** (nome, função, telefone, e-mail) — hotel grande sempre tem um
  comercial/eventos que já conhece o clube, e é com essa pessoa que a reserva é fechada. Perder esse
  nome é perder metade do valor do cadastro.
- **Diária de referência** e **horário padrão de check-in/check-out**.
- **Estrutura**: café da manhã incluso, estacionamento para ônibus, sala para refeição/preleção do
  grupo. Não é frescura — sem estacionamento de ônibus ou sala pro grupo comer junto, o hotel não
  serve pra delegação de futebol.
- CNPJ e site, que aparecem sempre que a hospedagem passa pelo financeiro.

Hotel que o clube parou de usar pode ser **desativado** em vez de apagado (o histórico de contato e
diária ainda serve de consulta).

### Relação com a Rooming List

`rooming_list.hotel_nome`/`hotel_endereco` **continuam sendo texto livre e não mudaram**. O cadastro
entra na tela de Rooming List só como atalho: escolher um hotel na lista preenche os dois campos,
que seguem editáveis. De propósito **não** virou chave estrangeira — a rooming list de um jogo antigo
tem que continuar imprimindo o hotel que foi usado na época, mesmo que o cadastro seja editado ou
apagado depois. É a mesma decisão do texto gravado no Termo de Retirada.

## 3. Módulo Veículos / Placas (`/veiculos`, migração 0071)

Cadastro de quem vai de carro próprio: nome do condutor, placa, cor, modelo (mais marca, ano,
RG/CPF e telefone), com **vínculo opcional a uma pessoa já cadastrada** (atleta, comissão técnica ou
staff). Escolher a pessoa preenche nome, documento e telefone — que seguem editáveis — e guarda a
ligação.

O vínculo é opcional porque nem todo condutor está no elenco: motorista terceirizado, familiar,
dirigente convidado. `pessoa_id` também não é chave estrangeira (aponta pra três tabelas conforme
`pessoa_tipo`, mesmo padrão de `rooming_list_ocupantes`), e o nome fica gravado no próprio veículo —
é ele que sai no documento.

A placa é gravada **normalizada** (só letras e números, maiúsculas) pra "abc-1234" e "ABC1234" não
virarem dois cadastros do mesmo carro; a formatação com hífen é decidida na exibição. Placa fora dos
padrões brasileiros (antigo `ABC-1234` e Mercosul `ABC1D23`) **não bloqueia o salvamento** — só
mostra um aviso, porque existe carro estrangeiro e veículo especial.

### O documento (`/veiculos/documento`)

É o que o pedido pedia de fato: "às vezes temos jogos fora e eu preciso enviar as placas das pessoas
para liberação". A tela marca os veículos que vão no ofício, escolhe destinatário, evento, data,
horário, local e quem assina — e **preencher a partir de um jogo** já cadastrado preenche evento,
data, horário e local de uma vez (campos seguem editáveis, porque quem recebe o ofício às vezes é o
CT do adversário, e não o estádio).

O PDF (`lib/pdf/veiculos-liberacao-document.tsx`) sai no mesmo desenho dos outros documentos
oficiais: escudo, faixa de título, destinatário, corpo do ofício, tabela (condutor, RG/CPF, placa,
veículo), observações e assinatura. A frase do ofício é montada só com o que foi preenchido — campo
em branco simplesmente não entra, pra nunca sair um "no dia __" pela metade. A tabela sai em ordem
alfabética do condutor, que é como a portaria confere a lista.

O documento **não é gravado**: é gerado sob demanda a partir do cadastro. Guardar cada emissão
viraria um histórico que ninguém pediu e que envelheceria mal (o veículo muda de dono, e o ofício
antigo não deveria mudar junto).

## Testado

`lib/futebol/hotel.ts` e `lib/futebol/veiculo.ts` são puros e testados (21 testes novos): montagem de
endereço sem vírgula solta quando falta parte, cidade/UF, normalização e formatação de placa nos dois
padrões, descrição do veículo com campo faltando, e ordenação por condutor respeitando acento.

## Fora de escopo por ora

- Ligar a rooming list ao `hotel_id` pra montar histórico de "onde já ficamos" — hoje o vínculo é só
  o atalho de preenchimento; dá pra evoluir depois se o Mateus quiser esse relatório.
- Guardar histórico de ofícios de liberação emitidos.
- Exportação para Excel dos dois cadastros novos (os módulos antigos têm; estes ainda não).
