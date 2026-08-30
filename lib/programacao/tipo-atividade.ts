import type { ProgramacaoAtividadeTipo, ProgramacaoTurno } from "@/lib/supabase/types";

/** Mesma ordem/rótulo usados em `PROGRAMACAO_ATIVIDADE_TIPO_OPTIONS` (lib/validation/schemas.ts),
 * mas cobrindo também 'jogo_oficial'/'jogo_treino' (que não aparecem no <select> de Nova Atividade,
 * já que esses dois usam o seletor de jogo em vez do formulário genérico) — usado pra legenda e
 * pra colorir os cartões da grade. */
export const PROGRAMACAO_ATIVIDADE_TIPOS_ORDEM: ProgramacaoAtividadeTipo[] = [
  "programacao",
  "refeicao",
  "academia",
  "treinamento",
  "transporte",
  "jogo_oficial",
  "jogo_treino",
  "imprensa",
  "regenerativo",
];

const TIPO_LABEL: Record<ProgramacaoAtividadeTipo, string> = {
  programacao: "Programação",
  refeicao: "Refeição",
  academia: "Academia",
  treinamento: "Treinamento",
  transporte: "Transporte",
  jogo_oficial: "Jogo Oficial",
  jogo_treino: "Jogo Treino",
  imprensa: "Imprensa",
  regenerativo: "Regenerativo",
};

/** Cor de cada tipo — cartão (fundo claro + texto escuro, mesmo padrão de `corCaptacaoStatus`) e o
 * ponto da legenda. 'jogo_oficial'/'jogo_treino' não pintam nenhum cartão de verdade (esses tipos
 * renderizam o cartão de jogo, com escudos/horário/local/competição, não um bloco colorido genérico)
 * — as cores aqui servem só pro ponto da legenda. `jogo_oficial` usa `grena`, a mesma cor que
 * `lib/theme.ts` já reserva pra "marca de categoria jogo". */
const TIPO_COR: Record<ProgramacaoAtividadeTipo, { cartao: string; ponto: string }> = {
  programacao: { cartao: "bg-neutral-200 text-neutral-700", ponto: "bg-neutral-400" },
  refeicao: { cartao: "bg-amber-100 text-amber-800", ponto: "bg-amber-400" },
  academia: { cartao: "bg-violet-100 text-violet-800", ponto: "bg-violet-400" },
  treinamento: { cartao: "bg-orange-100 text-orange-800", ponto: "bg-orange-400" },
  transporte: { cartao: "bg-blue-100 text-blue-800", ponto: "bg-blue-400" },
  jogo_oficial: { cartao: "bg-grena text-white", ponto: "bg-grena" },
  jogo_treino: { cartao: "bg-neutral-300 text-neutral-800", ponto: "bg-neutral-400" },
  imprensa: { cartao: "bg-pink-100 text-pink-800", ponto: "bg-pink-400" },
  regenerativo: { cartao: "bg-yellow-100 text-yellow-800", ponto: "bg-yellow-400" },
};

/** Mesmas cores de `TIPO_COR` acima, só que em hex — `corCartaoAtividade`/`corPontoAtividade`
 * devolvem classes Tailwind, que não existem fora do HTML (react-pdf e o next/og usam objetos de
 * estilo/hex puro). Usado só pela exportação do microciclo (`lib/pdf/microciclo-document.tsx` e
 * `lib/posters/microciclo-imagem.tsx`) — valores tirados direto da paleta do Tailwind pra ficar
 * visualmente idêntico ao que já aparece na grade em tela. */
const TIPO_COR_HEX: Record<ProgramacaoAtividadeTipo, { bg: string; text: string }> = {
  programacao: { bg: "#E5E5E5", text: "#404040" },
  refeicao: { bg: "#FEF3C7", text: "#92400E" },
  academia: { bg: "#EDE9FE", text: "#5B21B6" },
  treinamento: { bg: "#FFEDD5", text: "#9A3412" },
  transporte: { bg: "#DBEAFE", text: "#1E40AF" },
  jogo_oficial: { bg: "#5C0A35", text: "#FFFFFF" },
  jogo_treino: { bg: "#D4D4D4", text: "#262626" },
  imprensa: { bg: "#FCE7F3", text: "#9D174D" },
  regenerativo: { bg: "#FEF9C3", text: "#854D0E" },
};

export function corHexAtividade(tipo: ProgramacaoAtividadeTipo): { bg: string; text: string } {
  return TIPO_COR_HEX[tipo];
}

export function labelTipoAtividade(tipo: ProgramacaoAtividadeTipo): string {
  return TIPO_LABEL[tipo];
}

export function corCartaoAtividade(tipo: ProgramacaoAtividadeTipo): string {
  return TIPO_COR[tipo].cartao;
}

export function corPontoAtividade(tipo: ProgramacaoAtividadeTipo): string {
  return TIPO_COR[tipo].ponto;
}

export function turnoLabel(turno: ProgramacaoTurno): string {
  return turno === "manha" ? "Manhã" : turno === "tarde" ? "Tarde" : "Noite";
}

/** Turno derivado da hora de início — guardado explícito em `programacao_atividades.turno` ao
 * salvar (ver `lib/programacao/actions.ts`) pra não recalcular toda hora ao montar a grade.
 * Manhã: antes de 12h. Tarde: 12h-17h59. Noite: 18h em diante. */
export function turnoDoHorarioInicio(horarioInicio: string): ProgramacaoTurno {
  const hora = Number(horarioInicio.split(":")[0]);
  if (hora < 12) return "manha";
  if (hora < 18) return "tarde";
  return "noite";
}

/** "HH:MM" -> "HH:MM" já normalizado pra exibição (o Postgres `time` às vezes chega como
 * "HH:MM:SS"). */
export function formatHorarioCurto(horario: string | null): string {
  return horario ? horario.slice(0, 5) : "";
}
