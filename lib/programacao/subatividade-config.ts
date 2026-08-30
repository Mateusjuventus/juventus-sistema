/**
 * Campos ricos do formulário de Nova Subatividade que ainda não viraram coluna (ver spec, "Por que
 * config jsonb") — regras, dimensões de campo, blocos/intervalo com min+seg, orientações por
 * posição, sliders de conteúdo e método de treinamento. Mesmas 5 posições e 5 métodos do mockup
 * aprovado (`POSICOES_VALENCIA`/`METODOS_TREINO` em gen3.py).
 */

export const POSICOES_VALENCIA = [
  { key: "goleiro", label: "Goleiro" },
  { key: "zagueiro", label: "Zagueiro" },
  { key: "lateral", label: "Lateral" },
  { key: "meio", label: "Meio Campo" },
  { key: "atacante", label: "Atacante" },
] as const;

export const METODOS_TREINO = [
  { key: "analitico", label: "Analítico" },
  { key: "geral", label: "Geral" },
  { key: "jogosReduzidos", label: "Jogos Reduzidos" },
  { key: "pliometria", label: "Pliometria" },
  { key: "situacional", label: "Situacional" },
] as const;

export interface SubatividadeConfig {
  regras: string;
  larguraCampo: string;
  profundidadeCampo: string;
  atletasPorCampo: string;
  duracaoBlocoMin: string;
  duracaoBlocoSeg: string;
  intervaloSeg: string;
  orientacoes: string;
  posicoes: Record<string, boolean>;
  fisico: number;
  tatico: number;
  tecnico: number;
  comportamental: number;
  metodos: Record<string, boolean>;
}

export function configVazio(): SubatividadeConfig {
  const posicoes: Record<string, boolean> = {};
  POSICOES_VALENCIA.forEach((p) => {
    posicoes[p.key] = true;
  });
  const metodos: Record<string, boolean> = {};
  METODOS_TREINO.forEach((m) => {
    metodos[m.key] = false;
  });
  return {
    regras: "",
    larguraCampo: "",
    profundidadeCampo: "",
    atletasPorCampo: "",
    duracaoBlocoMin: "",
    duracaoBlocoSeg: "",
    intervaloSeg: "",
    orientacoes: "",
    posicoes,
    fisico: 50,
    tatico: 50,
    tecnico: 50,
    comportamental: 50,
    metodos,
  };
}
