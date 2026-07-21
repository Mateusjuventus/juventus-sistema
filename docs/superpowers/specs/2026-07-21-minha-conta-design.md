# Minha Conta

Status: Aprovado

## Objetivo

Dar ao usuário logado (master ou regular) uma página de autoatendimento — "Minha Conta" — onde ele
vê o próprio e-mail, papel e permissões, e consegue trocar a própria senha sem depender de outra
pessoa. Diferente da tela `/usuarios` (só master, administra OUTROS usuários), esta tela é sobre a
própria conta de quem está logado, disponível pra qualquer papel.

## Navegação

Um ícone de pessoa aparece ao lado do brasão + "Juventus - SAF" no canto esquerdo do cabeçalho
(`components/app-shell.tsx`), em toda página do sistema (Profissional, Base, ou fora de
departamento). Clicar nele abre um menu suspenso pequeno com duas opções: "Minha Conta" (link) e
"Sair" (mesma ação de logout já existente em `app/actions.ts`). O botão "Sair" que hoje fica
sozinho à direita do cabeçalho é removido dali — passa a existir só dentro deste menu, evitando
duplicidade.

O menu é um Client Component novo (precisa de estado aberto/fechado e fechar ao clicar fora),
recebendo o e-mail já resolvido no server component pai (`AppShell`).

## Página `/minha-conta`

Acessível a qualquer usuário logado, sem checagem de módulo/departamento (é sobre a própria conta,
não um módulo de negócio). Mostra, só leitura:

- E-mail da conta.
- Papel: "Master" ou "Regular" (rótulo amigável, não o valor cru do banco).
- Departamentos liberados (Futebol Profissional / Futebol de Base) — usa
  `getDepartamentosPermitidos()`.
- Módulos liberados dentro de cada departamento liberado — usa `getModulosPermitidos()` /
  `getModulosBasePermitidos()`. Se a pessoa é master, mostra "Todos" em vez de listar (já que master
  sempre tem tudo, independente do que está salvo).

Abaixo, um formulário "Trocar senha": dois campos (nova senha, confirmar nova senha), mínimo 6
caracteres (mesma regra usada em `/usuarios`), com erro se não bater. Sucesso mostra uma mensagem
inline (mesmo padrão `useFormState` já usado no restante do sistema) — não desloga nem redireciona.

## Trocar a própria senha (server action)

Nova action `trocarMinhaSenha` em `app/minha-conta/actions.ts`. Diferente de `redefinirSenha` (em
`app/usuarios/actions.ts`, que usa o cliente admin pra mexer em QUALQUER usuário), aqui é a própria
pessoa mexendo na própria conta — usa o `createClient()` de sessão comum
(`lib/supabase/server.ts`) e chama `supabase.auth.updateUser({ password })`, sem precisar do
cliente admin. Validação: mínimo 6 caracteres, e as duas senhas digitadas precisam ser iguais.

## Fora de escopo

- Trocar o próprio e-mail (não pedido).
- Foto de perfil.
- Qualquer edição de permissões pela própria pessoa (isso continua exclusivo de `/usuarios`, só
  master, só pra outros usuários).
