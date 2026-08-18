# Versão mobile — 14/08/2026

O Mateus não conseguia usar o sistema no celular. Não era uma tela específica: eram quatro
problemas de base que afetavam as ~40 telas ao mesmo tempo.

## 1. Faltava a meta viewport (a causa principal)

`app/layout.tsx` não declarava `viewport`. Sem isso, o navegador do celular **renderiza a página
como se a tela tivesse 980px e depois encolhe tudo** — o sistema abria "de longe", com texto
ilegível, e nenhum ajuste de CSS teria efeito enquanto isso não fosse corrigido. É a correção de
uma linha que sozinha muda mais do que todo o resto desta spec.

`maximumScale` fica **deliberadamente sem limite**: travar o zoom é hostil para quem precisa
aproximar para ler.

## 2. A barra lateral virou gaveta

A sidebar tinha 232px fixos e ficava sempre visível. Num telefone de 390px isso é **mais da metade
da largura da tela** ocupada por menu.

Agora, abaixo de `lg`: uma barra fina no topo com o botão de menu, e a sidebar vira gaveta que
desliza da esquerda com fundo escurecido. De `lg` para cima nada muda — é a mesma barra fixa de
antes.

Três detalhes que decidem se isso funciona na prática:

- **A lista de itens é uma só** (`conteudo`), usada pela barra do desktop e pela gaveta. Duplicar
  significaria um módulo novo aparecer só num dos dois.
- **A gaveta fecha sozinha ao trocar de rota** (`useEffect` no `pathname`). Sem isso, tocar num item
  navegava mas deixava a gaveta aberta por cima da tela nova.
- A gaveta fica **sempre montada**, só deslocada para fora da tela quando fechada — abrir é
  imediato, em vez de piscar montando a lista inteira.

## 3. Campos e botões dimensionados para o dedo

`.field-input` passa a ter **16px no celular** (`text-base`, voltando a 14px do `sm` para cima).
Não é escolha estética: abaixo de 16px o Safari do iPhone **dá zoom automático ao focar o campo** e
deixa a página deslocada, com o usuário tendo que pinçar para voltar a cada campo preenchido.

Campos e os três botões (`btn-primary`, `btn-secondary`, `btn-danger`) ganham `py-2.5` no celular
(voltando a `py-2` no desktop), aproximando o alvo de toque dos ~44px recomendados.

## 4. Abas e tabelas

**Abas** (Jogo, Jogo Base, Atleta, Atleta Base, Competição) usavam `flex-wrap`. Com 11 abas num
telefone, isso quebrava em três linhas e empurrava todo o conteúdo para baixo da dobra — abrir a
tela de um jogo mostrava só abas. A classe `.tab-bar` mantém o `flex-wrap` no desktop e no celular
transforma a barra numa faixa que **rola na horizontal**, sangrando até a borda da tela para deixar
claro que há mais aba para o lado. A barra de rolagem é escondida (só o gesto importa).

**Tabelas largas** (elenco, estoque, veículos, financeiro...) continuam rolando na horizontal em vez
de espremer colunas — texto quebrado em três letras por linha é ilegível e some com a leitura de
qualquer jeito. A classe `.tabela-rolavel`, aplicada em 29 lugares, devolve à tabela os 32px de
margem da página (sangra até a borda no celular) e põe uma sombra sutil na direita indicando que
existe mais coluna. No desktop volta ao cartão arredondado de sempre.

## Verificado

Renderizado no Chromium com o perfil de iPhone 13 (390px): a página passa a ocupar exatamente
390px sem rolagem horizontal parasita (`scrollWidth === innerWidth`), o campo de formulário reporta
`font-size: 16px`, a gaveta abre e fecha, e a faixa de abas rola. Conferido também em 1440px para
garantir que o desktop não mudou.

## Fora de escopo por ora

- **Converter as tabelas em cartões no celular.** Rolar para o lado funciona, mas ler uma linha de
  elenco continua pedindo dois gestos. Vale fazer nas listas que o Mateus de fato abre no telefone —
  é trabalho tela a tela, e a escolha de quais colunas viram destaque no cartão depende de como cada
  lista é usada.
- App instalável (PWA com ícone na tela inicial e uso offline).
