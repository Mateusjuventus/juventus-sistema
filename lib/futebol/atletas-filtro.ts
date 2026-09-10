/**
 * Filtragem combinada de `AtletasResumoFiltros` (ver docs/superpowers/specs/
 * 2026-09-09-atletas-resumo-filtros-design.md, item 5): E lógico entre Status/Posição/Contrato, OU
 * dentro de cada bloco, mais busca por nome — extraída num módulo próprio, puro, pra poder testar
 * sem montar o componente (o componente em si só chama `atletaPassaFiltro` dentro do `useMemo`).
 */
export interface AtletaFiltravel {
  status: string;
  posicao: string;
  tipoContrato: string | null;
  nome: string;
}

export interface FiltrosAtletas {
  status: Set<string>;
  /** Valor cru de `AtletaPosicao` (ex.: "Volante", "Ponta Direita") — desde 2026-09-10 o filtro
   * mostra as 9 posições reais em vez dos 5 grupos (GOL/ZAG/LAT/MEI/ATA), que continuam existindo
   * só como tag colorida dentro de cada chip (ver `categoriaDaPosicao`). */
  posicoes: Set<string>;
  contratos: Set<string>;
  /** Já em minúsculas/trim — quem chama normaliza uma vez só, não a cada atleta. */
  buscaNormalizada: string;
}

export function nenhumFiltroAtivo(filtros: FiltrosAtletas): boolean {
  return (
    filtros.status.size === 0 &&
    filtros.posicoes.size === 0 &&
    filtros.contratos.size === 0 &&
    filtros.buscaNormalizada.length === 0
  );
}

/**
 * `statusOcultoPorPadrao` preserva a regra de "Dispensado some da listagem por padrão" (ver
 * docs/superpowers/specs/2026-08-25-classificacao-dispensa-atleta-base-design.md, seção 4) mesmo
 * com o filtro de Status agora sendo um conjunto de chips que a pessoa liga/desliga: com NENHUM
 * status marcado (== "mostrar tudo"), esse valor ainda fica de fora — só aparece quando a pessoa
 * marca o chip dele explicitamente. Só a Base usa isso ("dispensado"); o Profissional não passa
 * nada, porque esse status nem existe lá. Quem chama também pode passar `undefined` aqui de
 * propósito (em vez do valor de sempre) pra representar "Mostrar inativos" ligado — ver
 * `AtletasResumoFiltros`.
 */
export function atletaPassaFiltro(
  atleta: AtletaFiltravel,
  filtros: FiltrosAtletas,
  statusOcultoPorPadrao?: string,
): boolean {
  if (filtros.status.size > 0) {
    if (!filtros.status.has(atleta.status)) return false;
  } else if (statusOcultoPorPadrao && atleta.status === statusOcultoPorPadrao) {
    return false;
  }

  if (filtros.posicoes.size > 0) {
    if (!filtros.posicoes.has(atleta.posicao)) return false;
  }

  if (filtros.contratos.size > 0) {
    if (!atleta.tipoContrato || !filtros.contratos.has(atleta.tipoContrato)) return false;
  }

  if (filtros.buscaNormalizada && !atleta.nome.toLowerCase().includes(filtros.buscaNormalizada)) {
    return false;
  }

  return true;
}

/**
 * Serializa os filtros ativos numa query string (`status=a,b&posicao=c&contrato=d&q=busca`) — usada
 * pra levar o filtro/busca atual da tela pro link de "Exportar para Excel", que virou puramente
 * client-side com o resumo/filtros (ver docs/superpowers/specs/2026-09-09-atletas-resumo-filtros-
 * design.md). As rotas de export (`app/atletas/export/route.ts` e `app/base/atletas/[categoria]/
 * export/route.ts`) fazem o caminho inverso: leem esses mesmos parâmetros e chamam `atletaPassaFiltro`
 * de novo no server, pra exportar exatamente o que está na tela. Filtros vazios viram string vazia
 * (sem "?" nenhum a mais no link).
 *
 * `mostrarInativos` vira `inativos=1` na query — só faz sentido na Base (ver checkbox "Mostrar
 * inativos" em `AtletasResumoFiltros`); a rota de export da Base lê esse parâmetro pra decidir se
 * passa `statusOcultoPorPadrao` ou não, mantendo a exportação igual ao que está na tela.
 */
export function filtrosParaQueryString(filtros: FiltrosAtletas, opts?: { mostrarInativos?: boolean }): string {
  const params = new URLSearchParams();
  if (filtros.status.size > 0) params.set("status", [...filtros.status].join(","));
  if (filtros.posicoes.size > 0) params.set("posicao", [...filtros.posicoes].join(","));
  if (filtros.contratos.size > 0) params.set("contrato", [...filtros.contratos].join(","));
  if (filtros.buscaNormalizada) params.set("q", filtros.buscaNormalizada);
  if (opts?.mostrarInativos) params.set("inativos", "1");
  return params.toString();
}

/** Caminho inverso de `filtrosParaQueryString` — usado pelas rotas de export pra reconstruir os
 * mesmos filtros a partir da query string recebida. Valores ausentes viram conjuntos vazios (=
 * "nenhum filtro daquele bloco"), igual ao estado inicial do componente na tela. */
export function filtrosDaQueryString(searchParams: URLSearchParams): FiltrosAtletas {
  function paraConjunto(nome: string): Set<string> {
    const valor = searchParams.get(nome);
    return valor ? new Set(valor.split(",").filter(Boolean)) : new Set();
  }
  return {
    status: paraConjunto("status"),
    posicoes: paraConjunto("posicao"),
    contratos: paraConjunto("contrato"),
    buscaNormalizada: (searchParams.get("q") ?? "").trim().toLowerCase(),
  };
}

/** Lê o `inativos=1` da query string (ver `filtrosParaQueryString`) — `true` significa "não esconder
 * o status default (dispensado)", igual ao checkbox "Mostrar inativos" marcado na tela. */
export function mostrarInativosDaQueryString(searchParams: URLSearchParams): boolean {
  return searchParams.get("inativos") === "1";
}
