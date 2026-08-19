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
  | "competicoes"
  | "solicitacoes"
  | "estoque"
  | "termos_retirada"
  | "hoteis"
  | "veiculos"
  | "financeiro"
  | "relatorios_avulso";

export interface ModuloInfo {
  chave: ModuloChave;
  label: string;
  prefixo: string;
  /** Grupo recolhível da sidebar. Módulo sem `grupo` fica solto na lista principal (é o caso do
   * que se usa toda semana); com `grupo`, ele desce pro bloco de mesmo nome, que abre e fecha
   * numa setinha — ver `components/app-sidebar.tsx`. A ordem dentro do bloco é a ordem daqui. */
  grupo?: string;
}

/** Único grupo por ora: o que se abre de vez em quando (documento de retirada, cadastro de hotel,
 * placa de carro, relatório solto). Deixar esses quatro soltos empurrava Atletas e Jogos pro meio
 * de uma lista de 13 itens. */
export const GRUPO_ADMINISTRATIVO = "Administrativo";

export const MODULOS: ModuloInfo[] = [
  { chave: "atletas", label: "Atletas", prefixo: "/atletas" },
  { chave: "comissao_tecnica", label: "Comissão Técnica / Diretoria", prefixo: "/comissao-tecnica" },
  { chave: "staff_operacional", label: "Staff Operacional", prefixo: "/staff-operacional" },
  { chave: "jogos", label: "Jogos", prefixo: "/jogos" },
  { chave: "competicoes", label: "Competições", prefixo: "/competicoes" },
  { chave: "solicitacoes", label: "Solicitações", prefixo: "/solicitacoes" },
  { chave: "estoque", label: "Estoque", prefixo: "/estoque" },
  { chave: "financeiro", label: "Financeiro", prefixo: "/financeiro" },
  { chave: "termos_retirada", label: "Termos de Retirada", prefixo: "/termos", grupo: GRUPO_ADMINISTRATIVO },
  { chave: "hoteis", label: "Hotéis", prefixo: "/hoteis", grupo: GRUPO_ADMINISTRATIVO },
  { chave: "veiculos", label: "Veículos / Placas", prefixo: "/veiculos", grupo: GRUPO_ADMINISTRATIVO },
  {
    chave: "relatorios_avulso",
    label: "Relatório Avulso",
    prefixo: "/relatorios/avulso",
    grupo: GRUPO_ADMINISTRATIVO,
  },
];

/**
 * Ordem de preferência da barra inferior do celular, que só tem espaço para 3 módulos além de
 * Início e Menu. Não dá pra usar a ordem de `MODULOS` (que é a da sidebar, começando por Atletas,
 * Comissão e Staff): no telefone o que se abre é o jogo do fim de semana, não o cadastro de quem
 * já está contratado. A lista é filtrada pela permissão do usuário, então quem não tem Jogos
 * liberado simplesmente recebe o próximo da fila.
 */
export const PRIORIDADE_MOBILE: ModuloChave[] = [
  "jogos",
  "competicoes",
  "atletas",
  "estoque",
  "solicitacoes",
  "financeiro",
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
