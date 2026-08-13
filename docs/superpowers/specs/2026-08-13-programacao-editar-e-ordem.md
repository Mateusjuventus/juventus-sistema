# Programação: editar linha e ordenar por horário — 13/08/2026

Dois ajustes na Programação (Concentração e Dia de Jogo), valendo para **Futebol Profissional e
Futebol de Base**.

## 1. Editar uma linha já cadastrada

Antes só existia adicionar e apagar: corrigir um horário custava apagar a linha e digitar tudo de
novo. Agora cada linha tem **Editar**, que troca a linha por um formulário com os mesmos campos do
cadastro (horário, atividade, local e, no Dia de Jogo, a marcação "esta linha é o confronto"), com
Salvar e Cancelar.

A edição acontece no próprio card, e não em outra tela, porque a programação é lida como um bloco —
quem ajusta um horário quase sempre está conferindo a sequência inteira, e sair da página perderia
esse contexto.

O componente (`components/programacao-linha.tsx`) é compartilhado pelos dois departamentos; cada
página passa a sua Server Action já com o id da linha embutido (`.bind`). Erro na gravação mantém o
formulário aberto com o texto digitado e a mensagem à vista, em vez de fechar e perder o que foi
escrito — mesmo cuidado que já existia no formulário de adicionar.

`ordem` não é alterada na edição: ela deixou de definir a exibição (ver abaixo) e agora só serve de
desempate, então mexer nela embaralharia a lista sem motivo.

## 2. Sempre do menor horário para o maior

A lista saía na ordem em que as linhas foram cadastradas (`ordem`), o que só funcionava se o
cronograma fosse digitado em sequência perfeita — e uma linha lembrada depois ("passar no posto
antes do embarque") ia parar no fim do pôster.

A ordenação **não pode ser feita no banco**: `horario` é texto livre de propósito (0029), porque a
programação real tem linha de intervalo ("7:00 às 7:45") e formatos que cada um digita de um jeito
("12:00", "12h", "12h30"). Num `order by` de texto, "9:00" viria depois de "12:00".

`lib/futebol/programacao-horario.ts` resolve extraindo o **primeiro** horário do texto e comparando
em minutos. Detalhes que importam:

- Intervalo ordena pelo início: "7:00 às 7:45" vale 7:00. A regex casa da esquerda para a direita,
  então não há risco de pegar o 7:45.
- Linha sem horário interpretável ("A definir", "Após o jogo") vai para o **fim**, preservando entre
  elas a ordem de cadastro — some da frente sem sumir da lista.
- Empate no mesmo horário desempata por `ordem`, e não aleatoriamente: sem isso a lista poderia
  "dançar" entre carregamentos da página.

Aplicado nos dois lugares que leem essas linhas: a tela de Programação e os pôsteres/PDF de
Concentração e Dia de Jogo (`lib/posters/concentracao-data.ts` e `dia-jogo-data.ts`) — não adiantaria
a tela estar em ordem e o documento impresso não.

## Testado

7 testes novos em `programacao-horario.test.ts`: formatos aceitos, intervalo, hora inválida
("99:00"), linha não interpretável indo para o fim, desempate por `ordem` e não mutação do array.
Total do projeto: 216.

## Fora de escopo

- Reordenar manualmente (arrastar): com a ordenação por horário automática, o caso de uso que
  sobrava para isso praticamente desapareceu.
