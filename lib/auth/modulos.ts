/**
 * Catálogo dos módulos que podem ser liberados/bloqueados por usuário "regular" (quem é "master"
 * sempre tem acesso a tudo, independente disso — ver `lib/auth/role.ts` e
 * `lib/supabase/middleware.ts`). Usado em três lugares:
 *  - `app/usuarios/` — checkboxes de "Módulos liberados" ao cadastrar/editar um usuário.
 *  - `lib/supabase/middleware.ts` — bloqueia (redireciona pra `/profissional`) quem tentar acessar
 *    a URL de um módulo que não tem liberado.
 *  - `app/profissional/page.tsx` — esconde o cartão do módulo que o usuário não tem liberado.
 *
 * `prefixo` é comparado com `pathname` (rota exata ou começando com `${prefixo}/`) — cobre tanto a
 * tela de listagem quanto qualquer rota aninhada do módulo (novo, editar, exportar, PDFs etc.).
 */
export type ModuloChave =
  | "atletas"
  | "comissao_tecnica"
  | "staff_operacional"
  | "jogos"
  | "solicitacoes"
  | "estoque"
  | "financeiro";

export interface ModuloInfo {
  chave: ModuloChave;
  label: string;
  prefixo: string;
}

export const MODULOS: ModuloInfo[] = [
  { chave: "atletas", label: "Atletas", prefixo: "/atletas" },
  { chave: "comissao_tecnica", label: "Comissão Técnica / Diretoria", prefixo: "/comissao-tecnica" },
  { chave: "staff_operacional", label: "Staff Operacional", prefixo: "/staff-operacional" },
  { chave: "jogos", label: "Jogos / Competições", prefixo: "/jogos" },
  { chave: "solicitacoes", label: "Solicitações", prefixo: "/solicitacoes" },
  { chave: "estoque", label: "Estoque", prefixo: "/estoque" },
  { chave: "financeiro", label: "Prestação de Contas", prefixo: "/financeiro" },
];

/** Todas as chaves de módulo — usado como padrão de quem ainda não tem `modulos_permitidos`
 * definido (nunca deve tirar acesso de ninguém sem querer) e pra validar o que vem do formulário. */
export const TODOS_MODULOS: ModuloChave[] = MODULOS.map((m) => m.chave);

export function ehModuloValido(valor: string): valor is ModuloChave {
  return (TODOS_MODULOS as string[]).includes(valor);
}

/** Acha o módulo dono de uma rota, se houver — usado pelo middleware pra saber o que checar. */
export function moduloDaRota(pathname: string): ModuloInfo | undefined {
  return MODULOS.find((m) => pathname === m.prefixo || pathname.startsWith(`${m.prefixo}/`));
}
