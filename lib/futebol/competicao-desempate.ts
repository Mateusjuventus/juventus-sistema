import type { LinhaClassificacao, ResultadoSimples } from "@/lib/futebol/competicao-classificacao";

/**
 * Critérios de desempate CONFIGURÁVEIS por competição (e, opcionalmente, por fase) — o Art. 17 do
 * Regulamento Específico da Copa Paulista é só o padrão; cada campeonato tem os seus, então a
 * ordem vem do banco (`competicoes.criterios_desempate`, `competicao_fases.criterios_desempate`)
 * e é aplicada sucessivamente enquanto houver empate.
 *
 * Módulo puro (sem Supabase) pra dar pra testar.
 */

export type CriterioDesempate =
  | "vitorias"
  | "saldo"
  | "gols_pro"
  | "gols_contra"
  | "confronto_direto"
  | "menos_vermelhos"
  | "menos_amarelos"
  | "sorteio";

export const CRITERIOS_DESEMPATE: { value: CriterioDesempate; label: string }[] = [
  { value: "vitorias", label: "Maior número de vitórias" },
  { value: "saldo", label: "Maior saldo de gols" },
  { value: "gols_pro", label: "Maior número de gols marcados" },
  { value: "gols_contra", label: "Menor número de gols sofridos" },
  { value: "confronto_direto", label: "Confronto direto" },
  { value: "menos_vermelhos", label: "Menor número de cartões vermelhos" },
  { value: "menos_amarelos", label: "Menor número de cartões amarelos" },
  { value: "sorteio", label: "Sorteio (decidido fora do sistema)" },
];

export const CRITERIO_LABEL: Record<CriterioDesempate, string> = CRITERIOS_DESEMPATE.reduce(
  (acc, c) => ({ ...acc, [c.value]: c.label }),
  {} as Record<CriterioDesempate, string>,
);

/** Art. 17 da Copa Paulista — padrão de quem não configurar nada. */
export const CRITERIOS_PADRAO: CriterioDesempate[] = [
  "vitorias",
  "saldo",
  "gols_pro",
  "menos_vermelhos",
  "menos_amarelos",
  "sorteio",
];

export function ehCriterioValido(valor: string): valor is CriterioDesempate {
  return CRITERIOS_DESEMPATE.some((c) => c.value === valor);
}

/** Limpa o que veio do banco/formulário: só chaves conhecidas, sem repetir, com fallback pro
 * padrão quando a lista fica vazia. */
export function normalizarCriterios(valores: string[] | null | undefined): CriterioDesempate[] {
  const limpos = (valores ?? []).filter(ehCriterioValido);
  const semRepetir = Array.from(new Set(limpos));
  return semRepetir.length > 0 ? semRepetir : CRITERIOS_PADRAO;
}

/** Pontos que uma equipe fez SÓ nos jogos contra as outras equipes empatadas (confronto direto). */
function pontosNoConfrontoDireto(equipe: string, empatadas: Set<string>, resultados: ResultadoSimples[]): number {
  const chave = (n: string) => n.trim().toLocaleLowerCase("pt-BR");
  const alvo = chave(equipe);
  let pontos = 0;
  for (const r of resultados) {
    const casa = chave(r.casa);
    const fora = chave(r.fora);
    if (!empatadas.has(casa) || !empatadas.has(fora)) continue;
    if (casa === alvo) pontos += r.golsCasa > r.golsFora ? 3 : r.golsCasa === r.golsFora ? 1 : 0;
    else if (fora === alvo) pontos += r.golsFora > r.golsCasa ? 3 : r.golsCasa === r.golsFora ? 1 : 0;
  }
  return pontos;
}

/**
 * Ordena a tabela: pontos primeiro (sempre), depois os critérios configurados, na ordem, enquanto
 * o empate persistir. "sorteio" não é decidível pelo sistema — as equipes que chegam nele ficam
 * lado a lado em ordem alfabética (a tela marca essas posições como "definir por sorteio").
 *
 * `resultados` só é necessário quando "confronto_direto" está na lista.
 */
export function ordenarClassificacao(
  linhas: LinhaClassificacao[],
  criterios: CriterioDesempate[],
  resultados: ResultadoSimples[] = [],
): LinhaClassificacao[] {
  // Grupos de empate em pontos — o confronto direto só faz sentido dentro de um desses grupos.
  const empatadasPorPontos = new Map<number, Set<string>>();
  for (const l of linhas) {
    const set = empatadasPorPontos.get(l.pontos) ?? new Set<string>();
    set.add(l.equipe.trim().toLocaleLowerCase("pt-BR"));
    empatadasPorPontos.set(l.pontos, set);
  }

  const comparar = (a: LinhaClassificacao, b: LinhaClassificacao): number => {
    if (a.pontos !== b.pontos) return b.pontos - a.pontos;

    for (const criterio of criterios) {
      switch (criterio) {
        case "vitorias":
          if (a.vitorias !== b.vitorias) return b.vitorias - a.vitorias;
          break;
        case "saldo":
          if (a.saldo !== b.saldo) return b.saldo - a.saldo;
          break;
        case "gols_pro":
          if (a.golsPro !== b.golsPro) return b.golsPro - a.golsPro;
          break;
        case "gols_contra":
          if (a.golsContra !== b.golsContra) return a.golsContra - b.golsContra;
          break;
        case "confronto_direto": {
          const empatadas = empatadasPorPontos.get(a.pontos) ?? new Set<string>();
          if (empatadas.size < 2) break;
          const pa = pontosNoConfrontoDireto(a.equipe, empatadas, resultados);
          const pb = pontosNoConfrontoDireto(b.equipe, empatadas, resultados);
          if (pa !== pb) return pb - pa;
          break;
        }
        case "menos_vermelhos":
          if (a.cartoesVermelhos !== b.cartoesVermelhos) return a.cartoesVermelhos - b.cartoesVermelhos;
          break;
        case "menos_amarelos":
          if (a.cartoesAmarelos !== b.cartoesAmarelos) return a.cartoesAmarelos - b.cartoesAmarelos;
          break;
        case "sorteio":
          // Não decidível pelo sistema — cai no critério estável (nome) e a tela sinaliza.
          break;
      }
    }

    return a.equipe.localeCompare(b.equipe, "pt-BR");
  };

  return [...linhas].sort(comparar);
}

/**
 * Equipes que empataram em TUDO o que os critérios configurados conseguem decidir — ou seja, cuja
 * posição depende de sorteio (ou de outro critério fora do sistema). A tela marca essas linhas.
 */
export function equipesIndefinidas(
  linhas: LinhaClassificacao[],
  criterios: CriterioDesempate[],
  resultados: ResultadoSimples[] = [],
): Set<string> {
  const ordenadas = ordenarClassificacao(linhas, criterios, resultados);
  const semSorteio = criterios.filter((c) => c !== "sorteio");
  const indefinidas = new Set<string>();

  for (let i = 0; i < ordenadas.length - 1; i++) {
    const a = ordenadas[i];
    const b = ordenadas[i + 1];
    if (a.pontos !== b.pontos) continue;
    // Empatou em pontos: algum critério (fora sorteio) separa os dois?
    const separados = semSorteio.some((criterio) => {
        switch (criterio) {
          case "vitorias":
            return a.vitorias !== b.vitorias;
          case "saldo":
            return a.saldo !== b.saldo;
          case "gols_pro":
            return a.golsPro !== b.golsPro;
          case "gols_contra":
            return a.golsContra !== b.golsContra;
          case "menos_vermelhos":
            return a.cartoesVermelhos !== b.cartoesVermelhos;
          case "menos_amarelos":
            return a.cartoesAmarelos !== b.cartoesAmarelos;
          case "confronto_direto": {
            const empatadas = new Set([
              a.equipe.trim().toLocaleLowerCase("pt-BR"),
              b.equipe.trim().toLocaleLowerCase("pt-BR"),
            ]);
            return (
              pontosNoConfrontoDireto(a.equipe, empatadas, resultados) !==
              pontosNoConfrontoDireto(b.equipe, empatadas, resultados)
            );
          }
          default:
            return false;
        }
      });
    if (!separados) {
      indefinidas.add(a.equipe);
      indefinidas.add(b.equipe);
    }
  }

  return indefinidas;
}
