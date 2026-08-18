/**
 * Regras puras das Vagas de Staff por jogo (ver supabase/migrations/0073_vagas_staff_jogo.sql).
 * Sem Supabase e sem React — o que decide se alguém pega vaga de verdade vive no banco, numa função
 * que trava a linha da função antes de contar (é a única forma de não estourar o limite quando o
 * grupo todo responde ao mesmo tempo). Aqui ficam só as contas de exibição.
 */

export interface VagaFuncaoResumo {
  vagaFuncaoId: string;
  funcaoId: string;
  funcaoNome: string;
  quantidade: number;
  /** Quantas já foram preenchidas (só `confirmado`; quem está na espera não ocupa vaga). */
  ocupadas: number;
  horarioApresentacao: string | null;
}

export interface InscricaoParaResumo {
  vaga_funcao_id: string;
  situacao: "confirmado" | "espera";
}

export interface FuncaoParaResumo {
  id: string;
  funcao_id: string;
  quantidade: number;
  horario_apresentacao: string | null;
}

/** Cruza as funções abertas com quem já entrou, na ordem em que foram cadastradas. */
export function montarResumo(
  funcoes: FuncaoParaResumo[],
  inscricoes: InscricaoParaResumo[],
  nomePorFuncaoId: Map<string, string>,
): VagaFuncaoResumo[] {
  return funcoes.map((f) => ({
    vagaFuncaoId: f.id,
    funcaoId: f.funcao_id,
    funcaoNome: nomePorFuncaoId.get(f.funcao_id) ?? "Função removida",
    quantidade: f.quantidade,
    ocupadas: inscricoes.filter((i) => i.vaga_funcao_id === f.id && i.situacao === "confirmado").length,
    horarioApresentacao: f.horario_apresentacao,
  }));
}

export function vagasRestantes(resumo: VagaFuncaoResumo): number {
  return Math.max(0, resumo.quantidade - resumo.ocupadas);
}

export function totalVagas(resumos: VagaFuncaoResumo[]): number {
  return resumos.reduce((soma, r) => soma + r.quantidade, 0);
}

export function totalOcupadas(resumos: VagaFuncaoResumo[]): number {
  // `Math.min` protege o número exibido de uma remoção de vaga feita depois de alguém já ter
  // entrado (baixar de 4 para 2 com 3 confirmados não deve mostrar "3 de 2").
  return resumos.reduce((soma, r) => soma + Math.min(r.ocupadas, r.quantidade), 0);
}

export function todasPreenchidas(resumos: VagaFuncaoResumo[]): boolean {
  return resumos.length > 0 && resumos.every((r) => vagasRestantes(r) === 0);
}

/** Texto do selo de cada função na tela pública. "Última!" existe porque é o que faz a pessoa
 * responder agora em vez de deixar pra depois. */
export function rotuloVaga(resumo: VagaFuncaoResumo): string {
  const restantes = vagasRestantes(resumo);
  if (restantes === 0) return "esgotado";
  if (restantes === 1) return "última!";
  return `${restantes} vagas`;
}

/** Resposta da função `pegar_vaga_staff` do banco, traduzida para o que a pessoa lê na tela. */
export type ResultadoPegarVaga =
  | "confirmado"
  | "espera"
  | "ja_inscrito"
  | "fechado"
  | "sem_funcao"
  | "sem_vaga_para_funcao"
  | "token_invalido";

export const MENSAGEM_RESULTADO: Record<Exclude<ResultadoPegarVaga, "confirmado" | "espera">, string> = {
  ja_inscrito: "Você já está nesta lista. Abra o link de novo para ver a sua vaga.",
  fechado: "As vagas deste jogo foram encerradas.",
  sem_funcao: "Seu cadastro está sem função definida. Fale com o Departamento de Futebol.",
  sem_vaga_para_funcao: "Não há vaga aberta para a sua função neste jogo.",
  token_invalido: "Este link não é válido. Peça o link atualizado ao Departamento de Futebol.",
};

/** Confere os 4 últimos dígitos do CPF, que é como a pessoa prova que é ela mesma sem precisar de
 * senha. Compara só dígitos, então funciona com o CPF salvo com ou sem máscara. */
export function confereFinalCpf(cpfCadastrado: string | null | undefined, digitados: string): boolean {
  const cpf = (cpfCadastrado ?? "").replace(/\D/g, "");
  const alvo = digitados.replace(/\D/g, "");
  if (cpf.length < 4 || alvo.length !== 4) return false;
  return cpf.slice(-4) === alvo;
}
