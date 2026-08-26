# Completar cadastro público da Comissão Técnica/Diretoria (Profissional e Base)

Status: rascunho — aguardando revisão do Mateus

## Contexto

O link público de autocadastro da Comissão Técnica/Diretoria (`/cadastro-comissao-tecnica` pro
Profissional, `/cadastro-comissao-tecnica-base` pra Base — ver
`docs/superpowers/specs/2026-08-25-comissao-tecnica-cadastro-publico-design.md`) sempre **cria** um
cadastro novo, nunca atualiza um existente (comentário explícito nas duas actions:
`cadastrarComissaoTecnicaPublico` e `cadastrarComissaoTecnicaBasePublico`).

A migration `0084_comissao_tecnica_contrato.sql` adicionou os campos `tipo_contrato`, `data_inicio`
e (só no Profissional; a Base já tinha desde `0080_financeiro_base.sql`) `valor_salario` — mas só
passou a valer para cadastro feito a partir dali. Quem preencheu o formulário público **antes**
dessa migration ficou com esses campos vazios no banco, e hoje não tem como completar essa
informação sozinho: o link público só sabe criar, e a tela de admin (onde os campos já são editáveis
normalmente) exige login, que essas pessoas não têm.

Pedido do Mateus, verbatim: *"preciso por uma opção para completar o cadastro, tem uns que já
estavam cadastrados. como fazemos ?"*

## Objetivo

Permitir que a própria pessoa, sem login, complete os campos de contrato que ficaram faltando no
cadastro dela — reaproveitando o mesmo link público que já existe, sem criar um segundo link pra
divulgar.

## Fora de escopo

- Limite de tentativas / bloqueio por CPF ou data de nascimento errados repetidamente. O cadastro
  novo público de hoje também não tem nenhuma proteção desse tipo — essa funcionalidade mantém o
  mesmo nível de exposição que já existe, não abre uma superfície nova de risco.
- Qualquer outro campo além de tipo de contrato / data de início / salário. Se no futuro surgir outro
  campo que precise ser "completado" em massa, é uma extensão do mesmo mecanismo, não algo a
  desenhar agora.
- Notificar o Mateus quando alguém completa o cadastro. Ele já revisa as pessoas cadastradas pela
  tela de admin quando precisar; não há pedido de notificação ativa.

## Fluxo

Vale igual para os dois links (Profissional olha `comissao_tecnica` +
`configuracoes_cadastro_comissao_tecnica`; Base olha `comissao_tecnica_base` +
`configuracoes_cadastro_comissao_tecnica_base` — cada um só enxerga a própria tabela).

0. **Toggle desligado**: se `cadastro_publico_ativo` estiver `false`, a página mostra a mesma
   mensagem de "Cadastro temporariamente fechado" de hoje, e nem chega a mostrar o passo 1. O mesmo
   toggle controla cadastro novo e completar cadastro — não existe um toggle separado para isso.

1. **Passo 1 — CPF**: a página abre pedindo só o CPF, com um botão "Continuar" (substitui o
   formulário completo que aparece de cara hoje).

2. O sistema confere se esse CPF já existe na tabela da área:
   - **Não encontrado** → mostra o formulário completo de sempre (`ComissaoPublicoForm` /
     `ComissaoPublicoBaseForm`, sem nenhuma mudança nos campos), com o CPF já preenchido. Ao
     enviar, cria um cadastro novo — comportamento idêntico ao que existe hoje.
   - **Encontrado** → passo 2.

3. **Passo 2 — confirmar identidade**: pede a **data de nascimento**.
   - Não bate com o CPF encontrado → mensagem de erro genérica ("CPF ou data de nascimento não
     conferem."), sem dizer qual dos dois está errado, e deixa tentar de novo.
   - Bate → passo 3.

4. **Passo 3 — completar ou concluir**: com identidade confirmada, o sistema olha quais dos três
   campos de contrato (`tipo_contrato`, `data_inicio`, `valor_salario`) estão `null` nesse registro
   específico:
   - **Algum campo vazio** → mostra só os campos vazios (pode ser 1, 2 ou os 3), reaproveitando os
     mesmos componentes de campo já usados no formulário completo (`SelectField` com
     `COMISSAO_TECNICA_TIPO_CONTRATO_OPTIONS`, `TextField type="date"`, `CurrencyField`), com botão
     "Salvar". Ao enviar, atualiza (`update`) o registro existente — não cria um novo.
   - **Nenhum campo vazio** (a pessoa já está com o cadastro completo) → mostra a mensagem "Seu
     cadastro já está completo. Não há nenhuma informação pendente." e não mostra formulário
     nenhum.
   - Depois de salvar com sucesso → mensagem "Cadastro atualizado com sucesso!".

## Verificação de identidade e segurança

O CPF sozinho não é suficiente pra liberar a edição (é uma informação fácil de adivinhar/vazada) —
por isso o par CPF + data de nascimento, decidido com o Mateus.

Ponto importante: como é um link público sem sessão, o servidor **não pode confiar em nenhum dado
vindo do navegador que não seja reconferido**. Em especial, o passo 3 (salvar) não deve receber (ou
não deve confiar em) um "id do cadastro" solto vindo do formulário — alguém poderia adulterar esse
campo escondido e editar o cadastro de outra pessoa. Em vez disso, a action que salva os campos
faltantes **recebe de novo o CPF e a data de nascimento** (carregados como campos ocultos desde o
passo 2) e busca o registro correspondente no banco a cada chamada, igual ao passo 2 — só então
aplica o `update` nesse registro. Ou seja, a identidade é sempre resolvida pelo servidor a partir de
CPF + data de nascimento, nunca por um id que o cliente afirma ser o seu.

Isso espelha o padrão que a action pública já usa hoje pra reconferir se o cadastro está aberto
(`configData.cadastro_publico_ativo`) mesmo que a página já tenha checado antes — a mesma lógica de
"nunca confiar só no que a página já mostrou, reconferir no servidor a cada ação".

## Sem migration nova

Os campos (`tipo_contrato`, `data_inicio`, `valor_salario`) e as permissões de `update` pro
`service_role` nas tabelas `comissao_tecnica` e `comissao_tecnica_base` já existem desde a
`0084_comissao_tecnica_contrato.sql`. Essa funcionalidade não precisa de nenhum SQL novo pro Mateus
rodar no Supabase — só reaproveita o que já está lá, inclusive o toggle de "cadastro público ativo"
existente.

## Implementação técnica (visão geral)

Estrutura pensada pra cada área (Profissional e Base, espelhando uma a outra):

- **Novo componente cliente** que controla os passos (CPF → formulário completo **ou**
  confirmar identidade → completar/concluído), substituindo o uso direto de
  `ComissaoPublicoForm`/`ComissaoPublicoBaseForm` na página — esses dois formulários continuam
  existindo do jeito que são hoje, só passam a ser renderizados como uma das etapas possíveis, não
  a única.
- **Novas server actions** (arquivo `actions.ts` de cada área):
  - Uma para checar se o CPF existe (retorna só um booleano — não vaza mais nada sobre o cadastro
    encontrado).
  - Uma para confirmar CPF + data de nascimento e retornar quais campos estão faltando (ou erro de
    "não confere").
  - Uma para salvar os campos faltantes, que reconfere CPF + data de nascimento (ver seção de
    segurança acima) antes de fazer o `update`.
  - A action de criar cadastro novo (`cadastrarComissaoTecnicaPublico` /
    `cadastrarComissaoTecnicaBasePublico`) não muda — continua exatamente como está.
- **Validação**: schemas novos e pequenos em `lib/validation/schemas.ts` (CPF sozinho; CPF + data de
  nascimento; e os três campos de contrato, todos opcionais no schema já que cada pessoa só envia os
  que realmente estavam faltando).

## Testes

- Cenário "CPF não encontrado" → segue pro cadastro novo, comportamento inalterado.
- Cenário "CPF encontrado, data de nascimento errada" → erro, sem revelar qual dado está errado.
- Cenário "CPF e data de nascimento corretos, com campos faltando" → mostra só os campos vazios,
  salva corretamente, e não sobrescreve campos que já estavam preenchidos.
- Cenário "CPF e data de nascimento corretos, sem nada faltando" → mensagem de "já está completo",
  sem formulário.
- Cenário "toggle desligado" → mostra a mensagem de cadastro fechado antes de qualquer passo,
  inclusive pra quem já está cadastrado.
- Cenário de segurança: tentar completar o cadastro de uma pessoa sem ter passado pela confirmação
  de CPF + data de nascimento daquela mesma pessoa não deve ser possível (a action de salvar sempre
  reconfere os dois no servidor).
