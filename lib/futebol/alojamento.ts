/**
 * Regras puras do Alojamento da Base (`/base/alojamento`, ver
 * docs/superpowers/specs/2026-08-19-captacao-base-design.md). Quem está alojado vem direto de
 * `atletas_base.alojado = true` — a única coisa configurável é a capacidade total
 * (`alojamento_base_config`, tabela singleton).
 */

export interface VagasAlojamento {
  capacidadeTotal: number;
  alojados: number;
  disponiveis: number;
  /** Verdadeiro quando alojados > capacidade — acontece se a capacidade for reduzida depois de já
   * ter gente morando lá. A tela mostra um aviso em vez de "-2 vagas". */
  acimaDaCapacidade: boolean;
}

/** Nunca devolve `disponiveis` negativo — reduzir a capacidade abaixo de quem já está alojado é uma
 * decisão que o Mateus pode tomar (ex.: por obra), mas a tela precisa avisar, não mostrar "-3". */
export function calcularVagasAlojamento(capacidadeTotal: number, alojados: number): VagasAlojamento {
  const disponiveis = Math.max(0, capacidadeTotal - alojados);
  return {
    capacidadeTotal,
    alojados,
    disponiveis,
    acimaDaCapacidade: alojados > capacidadeTotal,
  };
}
