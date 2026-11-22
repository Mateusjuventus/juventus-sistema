import { CLUBES } from "./clubes";
import type { ClubeConfig, ClubeId } from "./tipos";

export type { ClubeConfig, ClubeId, ClubeCores } from "./tipos";
export { CLUBES } from "./clubes";

/**
 * Resolve o clube da instância a partir de NEXT_PUBLIC_CLUBE. Sem a variável, o clube é o
 * Juventus — a instância que já existia continua idêntica sem nenhuma configuração nova. Um valor
 * desconhecido derruba o build em vez de subir a instância com a identidade errada.
 */
export function resolverClube(valor: string | undefined): ClubeConfig {
  const id = (valor ?? "").trim().toLowerCase();
  if (!id) return CLUBES.juventus;
  if (id in CLUBES) return CLUBES[id as ClubeId];
  throw new Error(
    `NEXT_PUBLIC_CLUBE="${valor}" não é um clube configurado. Use um destes: ${Object.keys(CLUBES).join(", ")}.`,
  );
}

/** O clube desta instância. */
export const clube: ClubeConfig = resolverClube(process.env.NEXT_PUBLIC_CLUBE);

/** "Juventus x Adversário" quando mandante, "Adversário x Juventus" quando visitante. */
export function nomeConfronto(adversario: string, mandante: boolean): string {
  return mandante ? `${clube.nomeCurto} x ${adversario}` : `${adversario} x ${clube.nomeCurto}`;
}

/** O nome do clube aparece na equipe da súmula? */
export function ehEquipeDoClube(equipe: string): boolean {
  return equipe.toLowerCase().includes(clube.nomeBuscaFederacao);
}
