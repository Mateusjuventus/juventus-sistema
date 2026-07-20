/**
 * Catálogo dos módulos do Futebol de Base — mesmo papel de `lib/auth/modulos.ts`, mas para o
 * segundo departamento (ver docs/superpowers/specs/2026-07-20-futebol-de-base-design.md). Não
 * reaproveita `ModuloChave`/`MODULOS` porque os `prefixo` são diferentes (`/base/atletas`,
 * `/base/jogos` etc.) — mesmo conjunto de 7 chaves, tipo próprio.
 *
 * Usado em três lugares, espelhando o Profissional:
 *  - `app/usuarios/` — segunda seção de checkboxes ("Módulos do Futebol de Base").
 *  - `lib/supabase/middleware.ts` — bloqueia quem tentar acessar a URL de um módulo de Base que
 *    não tem liberado.
 *  - `app/base/page.tsx` — esconde o cartão do módulo que o usuário não tem liberado.
 */
export type ModuloBaseChave =
  | "atletas"
  | "comissao_tecnica"
  | "staff_operacional"
  | "jogos"
  | "solicitacoes"
  | "estoque"
  | "financeiro";

export interface ModuloBaseInfo {
  chave: ModuloBaseChave;
  label: string;
  prefixo: string;
}

export const MODULOS_BASE: ModuloBaseInfo[] = [
  { chave: "atletas", label: "Atletas", prefixo: "/base/atletas" },
  { chave: "comissao_tecnica", label: "Comissão Técnica / Diretoria", prefixo: "/base/comissao-tecnica" },
  { chave: "staff_operacional", label: "Staff Operacional", prefixo: "/base/staff-operacional" },
  { chave: "jogos", label: "Jogos / Competições", prefixo: "/base/jogos" },
  { chave: "solicitacoes", label: "Solicitações", prefixo: "/base/solicitacoes" },
  { chave: "estoque", label: "Estoque", prefixo: "/base/estoque" },
  { chave: "financeiro", label: "Prestação de Contas", prefixo: "/base/financeiro" },
];

/** Todas as chaves de módulo de Base — usado como padrão de quem ainda não tem
 * `modulos_base_permitidos` definido, e pra validar o que vem do formulário. */
export const TODOS_MODULOS_BASE: ModuloBaseChave[] = MODULOS_BASE.map((m) => m.chave);

export function ehModuloBaseValido(valor: string): valor is ModuloBaseChave {
  return (TODOS_MODULOS_BASE as string[]).includes(valor);
}

/** Acha o módulo de Base dono de uma rota, se houver — usado pelo middleware. */
export function moduloBaseDaRota(pathname: string): ModuloBaseInfo | undefined {
  return MODULOS_BASE.find((m) => pathname === m.prefixo || pathname.startsWith(`${m.prefixo}/`));
}
