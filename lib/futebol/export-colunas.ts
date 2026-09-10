/**
 * Escolha de quais dados saem na planilha de "Exportar para Excel" (ver docs/superpowers/specs/
 * 2026-09-09-atletas-resumo-filtros-design.md, item 6 do ajuste de 2026-09-10) — antes a exportação
 * sempre saía com todas as colunas; agora a pessoa escolhe quais blocos de dados entram num modal
 * antes de baixar. Nome completo, CPF e Status sempre saem (são o mínimo pra identificar o atleta na
 * planilha) — só os outros campos são opcionais, agrupados em 4 blocos.
 *
 * Módulo puro (sem depender de React nem do Supabase) pra poder testar a lógica de filtro de colunas
 * sem montar rota nem componente — as rotas de export (`app/atletas/export/route.ts` e
 * `app/base/atletas/[categoria]/export/route.ts`) e o modal (`components/atletas/
 * export-colunas-modal.tsx`) só chamam essas funções.
 */

export interface GrupoCampoExport {
  chave: string;
  label: string;
}

export const GRUPOS_CAMPO_EXPORT_ATLETA: GrupoCampoExport[] = [
  { chave: "contato", label: "Dados de contato" },
  { chave: "contrato", label: "Dados de contrato" },
  { chave: "esportivos", label: "Dados esportivos" },
  { chave: "documentos", label: "Documentos/RG" },
];

/** Estado inicial do modal — todos os blocos marcados, pra quem só clica "Exportar" direto continuar
 * recebendo a planilha completa de sempre. */
export function todosGruposCampoExport(): Set<string> {
  return new Set(GRUPOS_CAMPO_EXPORT_ATLETA.map((g) => g.chave));
}

/** Serializa a seleção de blocos na query string do link de export (`campos=contato,esportivos`).
 * Com todos os 4 blocos marcados (== exportação completa, comportamento de sempre) omite o
 * parâmetro inteiro, pra não mudar o link de quem nunca abriu o modal ou não desmarcou nada. */
export function gruposCampoExportParaQueryString(selecionados: Set<string>): string {
  if (selecionados.size >= GRUPOS_CAMPO_EXPORT_ATLETA.length) return "";
  return `campos=${[...selecionados].join(",")}`;
}

/** Caminho inverso — usado pelas rotas de export. Sem o parâmetro `campos` (link antigo, ou
 * exportação sem passar pelo modal), assume todos os blocos marcados (exportação completa). */
export function gruposCampoExportDaQueryString(searchParams: URLSearchParams): Set<string> {
  const valor = searchParams.get("campos");
  if (valor === null) return todosGruposCampoExport();
  return new Set(valor.split(",").filter(Boolean));
}

/**
 * Filtra as colunas de uma linha da planilha pelos blocos marcados — `camposSempre` sempre fica
 * (Nome completo/CPF/Status), o resto só entra se o bloco dele (`campoParaGrupo`) estiver em
 * `gruposSelecionados`. Uma coluna que não está mapeada em `campoParaGrupo` também sempre entra
 * (evita apagar coluna nova por engano se alguém esquecer de mapear).
 */
export function filtrarLinhaPorGrupos<T extends Record<string, unknown>>(
  linha: T,
  camposSempre: readonly string[],
  campoParaGrupo: Record<string, string>,
  gruposSelecionados: Set<string>,
): Partial<T> {
  const resultado: Partial<T> = {};
  for (const chave of Object.keys(linha) as (keyof T & string)[]) {
    if (camposSempre.includes(chave)) {
      resultado[chave] = linha[chave];
      continue;
    }
    const grupo = campoParaGrupo[chave];
    if (!grupo || gruposSelecionados.has(grupo)) {
      resultado[chave] = linha[chave];
    }
  }
  return resultado;
}
